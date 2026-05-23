/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'events';
import pc from 'picocolors';
import nconf from '../config.js';
import { Request, Response, Event, commands } from '../lib/node-ld/index.js';
import { Database } from '../db/database.js';
import { hexToRgb } from '../helpers/color.js';

// Lazy-load the native 'usb' module so that mock mode can run seamlessly
// without requiring native USB drivers to be active/loaded.
let usbModule: any = null;
try {
  usbModule = await import('usb');
} catch {
  // Native USB module could not be loaded (e.g. missing libusb in some environments).
  // We will log this and allow running in mock mode.
}

export interface NfcScanEvent {
  cardId: string;
  readerId: string;
  scannedAt: Date;
  rawData?: string; // Hex representation of the raw USB buffer
}

export class NfcReaderService extends EventEmitter {
  private static instance: NfcReaderService;
  private mode: 'usb' | 'mock' = 'mock';
  private vendorId: number = 0xffff; // Default custom VID
  private productId: number = 0x0001; // Default custom PID
  private device: any = null;
  private activeInterface: any = null;
  private inEndpoint: any = null;
  private outEndpoint: any = null;
  private isConnected: boolean = false;
  private reconnectInterval: NodeJS.Timeout | null = null;

  // Mapping registry to maintain full backward-compatibility with arbitrary test strings
  private mockUids = new Map<string, { rawCardId: string; rawReaderId: string }>();

  private constructor() {
    super();
    this.configure();
  }

  public static getInstance(): NfcReaderService {
    if (!NfcReaderService.instance) {
      NfcReaderService.instance = new NfcReaderService();
    }
    return NfcReaderService.instance;
  }

  /**
   * Configure the service based on hierarchical nconf settings
   */
  private configure() {
    const modeSetting = nconf.get('nfc:mode');
    this.mode = modeSetting === 'usb' ? 'usb' : 'mock';

    const vid = nconf.get('nfc:vid');
    const pid = nconf.get('nfc:pid');

    if (vid !== undefined && vid !== null) {
      this.vendorId = typeof vid === 'string' ? parseInt(vid, 16) : Number(vid);
    }
    if (pid !== undefined && pid !== null) {
      this.productId = typeof pid === 'string' ? parseInt(pid, 16) : Number(pid);
    }
  }

  /**
   * Start the NFC Reader service
   */
  public async start(): Promise<void> {
    if (this.mode === 'mock') {
      console.log(pc.yellow(`[NFC Reader] Initializing in MOCK mode.`));
      console.log(pc.gray(`[NFC Reader] Trigger mock scans via POST /api/nfc/mock`));
      this.isConnected = true;
      this.emit('connect', { mode: 'mock' });
      return;
    }

    if (!usbModule) {
      console.error(pc.red(`[NFC Reader] Failed to load native 'usb' module. Falling back to MOCK mode.`));
      this.mode = 'mock';
      this.isConnected = true;
      this.emit('connect', { mode: 'mock', fallback: true });
      return;
    }

    console.log(pc.cyan(`[NFC Reader] Initializing in PHYSICAL USB mode.`));
    console.log(
      pc.cyan(
        `[NFC Reader] Target Hardware -> VID: 0x${this.vendorId.toString(16).padStart(4, '0')}, PID: 0x${this.productId.toString(16).padStart(4, '0')}`,
      ),
    );

    await this.connectUsb();

    // Start a polling reconnect loop if device is not initially found
    if (!this.isConnected) {
      console.log(pc.yellow(`[NFC Reader] Device not found. Starting reconnect listener...`));
      this.startReconnectLoop();
    }
  }

  /**
   * Connect to the physical USB device
   */
  private async connectUsb(): Promise<boolean> {
    try {
      const device = usbModule.findByIds(this.vendorId, this.productId);

      if (!device) {
        return false;
      }

      console.log(pc.green(`[NFC Reader] Found physical USB device. Opening connection...`));
      this.device = device;
      this.device.open();

      // Get first interface
      const iface = this.device.interfaces[0];
      if (!iface) {
        throw new Error('No interface found on the USB device');
      }

      this.activeInterface = iface;

      // Under Linux/WSL, detach kernel driver if it's active
      if (process.platform !== 'win32') {
        try {
          if (iface.isKernelDriverActive()) {
            console.log(pc.gray(`[NFC Reader] Detaching active kernel driver...`));
            iface.detachKernelDriver();
          }
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          console.warn(pc.yellow(`[NFC Reader] Non-fatal: Failed to check/detach kernel driver: ${errMsg}`));
        }
      }

      // Claim the interface
      iface.claim();
      console.log(pc.green(`[NFC Reader] Claimed interface 0 successfully.`));

      // Find the InEndpoint (receives data from the reader)
      const inEp = iface.endpoints.find((ep: any) => ep.direction === 'in');
      if (!inEp) {
        throw new Error('No IN endpoint found on claimed USB interface');
      }

      this.inEndpoint = inEp;
      console.log(
        pc.green(
          `[NFC Reader] Found IN endpoint (Address: 0x${inEp.address.toString(16)}). Starting data polling...`,
        ),
      );

      // Find the OutEndpoint (sends commands to the reader)
      const outEp = iface.endpoints.find((ep: any) => ep.direction === 'out');
      if (outEp) {
        this.outEndpoint = outEp;
        console.log(
          pc.green(
            `[NFC Reader] Found OUT endpoint (Address: 0x${outEp.address.toString(16)}).`,
          ),
        );
      } else {
        console.warn(
          pc.yellow(
            `[NFC Reader] Warning: No OUT endpoint found on claimed USB interface. Sending commands will be unavailable.`,
          ),
        );
      }

      // Listen for data from the custom NFC reader
      this.inEndpoint.startPoll();
      this.inEndpoint.on('data', (buffer: Buffer) => {
        this.handleUsbData(buffer);
      });

      this.inEndpoint.on('error', (err: Error) => {
        console.error(pc.red(`[NFC Reader] Endpoint polling error: ${err.message}`));
        this.emit('error', err);
        this.handleDisconnect();
      });

      this.isConnected = true;
      this.emit('connect', {
        mode: 'usb',
        vid: this.vendorId,
        pid: this.productId,
      });

      // Stop reconnect loop if active
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }

      // Wake up the physical hardware (only if OUT endpoint is claimed)
      if (this.outEndpoint) {
        await this.wakeDevice();
      }

      // Listen for system disconnect
      usbModule.usb.on('detach', (detachedDevice: any) => {
        if (
          detachedDevice.deviceDescriptor.idVendor === this.vendorId &&
          detachedDevice.deviceDescriptor.idProduct === this.productId
        ) {
          console.log(pc.red(`[NFC Reader] Physical device unplugged.`));
          this.handleDisconnect();
        }
      });

      return true;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`[NFC Reader] Failed to establish USB connection: ${errMsg}`));
      this.emit('error', err instanceof Error ? err : new Error(errMsg));
      this.handleDisconnect();
      return false;
    }
  }

  /**
   * Send a command request to the physical USB device
   */
  public async writeRequest(cmd: number, payload: Buffer): Promise<void> {
    if (this.mode !== 'usb' || !this.outEndpoint) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const req = new Request();
        req.cmd = cmd;
        req.cid = Math.floor(Math.random() * 256);
        req.payload = payload;
        const buffer = req.build();

        this.outEndpoint.transfer(buffer, (err: Error) => {
          if (err) {
            console.error(pc.red(`[NFC Reader] Failed to write command 0x${cmd.toString(16)}: ${err.message}`));
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Set a specific pad's color (1 = Center, 2 = Left, 3 = Right)
   */
  public async setPadColor(pad: number, r: number, g: number, b: number): Promise<void> {
    if (this.mode !== 'usb' || !this.outEndpoint) {
      return;
    }
    try {
      const payload = Buffer.from([pad, r, g, b]);
      await this.writeRequest(commands.CMD_COL, payload);
    } catch (err: any) {
      console.warn(pc.yellow(`[NFC Reader] Failed to set pad ${pad} color: ${err.message}`));
    }
  }

  /**
   * Flash a specific pad's color in the background
   */
  private async flashPad(pad: number, r: number, g: number, b: number): Promise<void> {
    if (this.mode !== 'usb' || !this.outEndpoint) {
      return;
    }
    try {
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      await this.setPadColor(pad, r, g, b);
      await sleep(400);
      await this.setPadColor(pad, 0, 0, 0);
    } catch {
      // Ignore background control errors
    }
  }


  /**
   * Wake up / initialize the USB Toypad hardware
   */
  private async wakeDevice(): Promise<void> {
    try {
      console.log(pc.gray(`[NFC Reader] Sending wake command to Toypad...`));
      const wakePayload = Buffer.from('(c) LEGO 2014');
      await this.writeRequest(commands.CMD_WAKE, wakePayload);
      console.log(pc.green(`[NFC Reader] Toypad woke up successfully.`));

      // Colors for flashing sequence
      const cyanColors = Buffer.from([
        1, 0, 180, 200, // Pad 1 (Center) -> Cyan
        2, 0, 180, 200, // Pad 2 (Left) -> Cyan
        3, 0, 180, 200, // Pad 3 (Right) -> Cyan
      ]);
      const offColors = Buffer.from([
        1, 0, 0, 0, // Pad 1 (Center) -> Off
        2, 0, 0, 0, // Pad 2 (Left) -> Off
        3, 0, 0, 0, // Pad 3 (Right) -> Off
      ]);

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      console.log(pc.gray(`[NFC Reader] Flashing Toypad LEDs 3 times...`));
      for (let i = 0; i < 3; i++) {
        await this.writeRequest(commands.CMD_COLAL, cyanColors);
        await sleep(300);
        await this.writeRequest(commands.CMD_COLAL, offColors);
        if (i < 2) {
          await sleep(300);
        }
      }
      console.log(pc.green(`[NFC Reader] Toypad LEDs initialized and turned off.`));
    } catch (err: any) {
      console.warn(pc.yellow(`[NFC Reader] Warning: Failed to send initial commands to Toypad: ${err.message}`));
    }
  }

  /**
   * Process incoming byte buffer from custom NFC hardware
   */
  private handleUsbData(buffer: Buffer) {
    try {
      const hex = buffer.toString('hex');
      console.log(pc.gray(`[NFC Reader] Raw USB bytes received: ${hex}`));

      // Check the header byte (magic byte) to identify packet type
      if (buffer[0] === 0x56 || (buffer[0] === 0x55 && buffer[1] === 11)) {
        // Unsolicited Toypad Tag Event (starts with 0x56, or 0x55 with 11-byte payload on custom hardware)
        const event = new Event(buffer);
        let cardId = event.uid;
        const isArrival = event.dir === 1;
        let readerId = `usb-0x${this.vendorId.toString(16)}-0x${this.productId.toString(16)}-pad${event.pad}`;

        // Restore raw mock string if mapped
        if (this.mockUids.has(cardId)) {
          const mapping = this.mockUids.get(cardId)!;
          cardId = mapping.rawCardId;
          if (isNaN(Number(mapping.rawReaderId))) {
            readerId = mapping.rawReaderId;
          }
        }

        if (cardId) {
          const scanEvent: NfcScanEvent = {
            cardId,
            readerId,
            scannedAt: new Date(),
            rawData: hex,
          };

          const db = Database.getInstance();
          const settings = db.getTagSettings(scanEvent.cardId);

          if (isArrival) {
            console.log(
              pc.green(
                `[NFC Reader] Tag Scanned (Arrival) -> UID: ${scanEvent.cardId} on Pad ${event.pad}`,
              ),
            );
            this.emit('scan', scanEvent);
            const rgb = hexToRgb(settings.arrivalColor);
            this.flashPad(event.pad, rgb.r, rgb.g, rgb.b).catch(() => {});
          } else {
            console.log(
              pc.yellow(
                `[NFC Reader] Tag Removed (Departure) -> UID: ${scanEvent.cardId} from Pad ${event.pad}`,
              ),
            );
            this.emit('remove', {
              cardId: scanEvent.cardId,
              pad: event.pad,
              readerId: scanEvent.readerId,
              scannedAt: scanEvent.scannedAt,
            });
            const rgb = hexToRgb(settings.departureColor);
            this.flashPad(event.pad, rgb.r, rgb.g, rgb.b).catch(() => {});
          }
        }
      } else if (buffer[0] === 0x55) {
        // Standard transaction response (starts with 0x55)
        const response = new Response(buffer);
        console.log(
          pc.gray(
            `[NFC Reader] Command Response -> CID: 0x${response.cid.toString(16).padStart(2, '0')}, Payload: ${response.payload.toString('hex')}`,
          ),
        );
        this.emit('response', response);
      } else {
        // Fallback for unexpected or custom packet format
        console.log(pc.yellow(`[NFC Reader] Unexpected packet format received.`));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`[NFC Reader] Error parsing USB buffer: ${errMsg}`));
    }
  }

  /**
   * Clean up and handle reader disconnection
   */
  private handleDisconnect() {
    if (!this.isConnected) return;

    this.isConnected = false;
    this.inEndpoint = null;
    this.outEndpoint = null;
    this.activeInterface = null;
    this.device = null;

    this.emit('disconnect');

    // Start reconnecting
    this.startReconnectLoop();
  }

  /**
   * Background reconnect attempts
   */
  private startReconnectLoop() {
    if (this.reconnectInterval || this.mode === 'mock') return;

    this.reconnectInterval = setInterval(async () => {
      console.log(pc.gray(`[NFC Reader] Attempting to reconnect to USB device...`));
      const success = await this.connectUsb();
      if (success) {
        console.log(pc.green(`[NFC Reader] Successfully reconnected to USB device.`));
      }
    }, 5000);
  }

  /**
   * Programmatically simulate a card scan (Mock mode)
   */
  public mockScan(
    cardId: string,
    readerOrPad: string | number = 'mock-usb-reader',
    dir: number = 1,
  ): boolean {
    if (this.mode !== 'mock') {
      console.warn(pc.yellow(`[NFC Reader] Ignoring mock scan; service is running in PHYSICAL USB mode.`));
      return false;
    }

    try {
      let padIndex = 1;
      let readerId = 'mock-usb-reader';

      if (typeof readerOrPad === 'number') {
        padIndex = readerOrPad;
        readerId = `mock-usb-reader-pad${padIndex}`;
      } else if (typeof readerOrPad === 'string') {
        readerId = readerOrPad;
        const match = readerOrPad.match(/pad(\d+)/i);
        if (match && match[1]) {
          padIndex = parseInt(match[1], 10);
        }
      }

      // Generate a valid 7-byte mock hex string for the Event class
      let hexUid = '';
      const isHex = /^[0-9a-fA-F]{14}$/.test(cardId);
      if (isHex) {
        hexUid = cardId.toUpperCase();
      } else {
        const tempBuf = Buffer.alloc(7, 0);
        Buffer.from(cardId).copy(tempBuf, 0);
        hexUid = tempBuf.toString('hex').toUpperCase();
      }

      // Store the mapping to decode it back seamlessly on arrival
      this.mockUids.set(hexUid, { rawCardId: cardId.toUpperCase(), rawReaderId: String(readerOrPad) });

      // Build a simulated binary Event frame (starts with 0x56)
      const mockEvent = new Event({
        pad: padIndex,
        index: 0,
        dir: dir,
        uid: hexUid,
      });
      const buffer = mockEvent.build();

      console.log(
        pc.yellow(
          `[NFC Reader] [MOCK SCAN] Simulated Event: Pad ${padIndex}, Dir ${dir}, UID ${cardId.toUpperCase()} (Reader: ${readerId})`,
        ),
      );

      // Feed through the exact same USB incoming data handler
      this.handleUsbData(buffer);
      return true;
    } catch (err: any) {
      console.error(pc.red(`[NFC Reader] Mock scan generation failed: ${err.message}`));
      return false;
    }
  }

  /**
   * Graceful stop for server shutdown
   */
  public async stop(): Promise<void> {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.inEndpoint) {
      try {
        this.inEndpoint.stopPoll();
      } catch {
        // Ignore error
      }
    }

    if (this.activeInterface) {
      try {
        await this.activeInterface.release(true);
      } catch {
        // Ignore error
      }
    }

    if (this.device) {
      try {
        this.device.close();
      } catch {
        // Ignore error
      }
    }

    this.isConnected = false;
    console.log(pc.gray(`[NFC Reader] USB service stopped.`));
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      mode: this.mode,
      vendorId: `0x${this.vendorId.toString(16).padStart(4, '0')}`,
      productId: `0x${this.productId.toString(16).padStart(4, '0')}`,
    };
  }
}

