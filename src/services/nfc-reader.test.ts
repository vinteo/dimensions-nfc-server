import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NfcReaderService, NfcScanEvent } from './nfc-reader.js';

describe('NfcReaderService (Mock Mode)', () => {
  let nfcReader: NfcReaderService;

  beforeEach(async () => {
    // Ensure we are working with the clean configured instance
    process.env.NFC_MODE = 'mock';
    nfcReader = NfcReaderService.getInstance();
    await nfcReader.start();
  });

  afterEach(async () => {
    await nfcReader.stop();
  });

  it('should return correct connection status and default custom USB IDs in mock mode', () => {
    const status = nfcReader.getStatus();
    
    expect(status.connected).toBe(true);
    expect(status.mode).toBe('mock');
    expect(status.vendorId).toBe('0x0e6f');
    expect(status.productId).toBe('0x0241');
  });

  it('should emit a scan event when a mock scan is triggered', async () => {
    const mockCardId = 'NFC-TAG-ABCDE';
    const mockReaderId = 'test-mock-reader';

    const scanPromise = new Promise<NfcScanEvent>((resolve) => {
      nfcReader.once('scan', (event: NfcScanEvent) => {
        resolve(event);
      });
    });

    const triggerSuccess = nfcReader.mockScan(mockCardId, mockReaderId);
    expect(triggerSuccess).toBe(true);

    const event = await scanPromise;
    expect(event.cardId).toBe(mockCardId.toUpperCase());
    expect(event.readerId).toBe(mockReaderId);
    expect(event.scannedAt).toBeInstanceOf(Date);
    expect(event.rawData).toMatch(/^56[0-9a-f]{62}$/);
  });

  it('should handle multiple scan subscribers without error', async () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    nfcReader.on('scan', callback1);
    nfcReader.on('scan', callback2);

    nfcReader.mockScan('TEST-CARD-ID');

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);

    nfcReader.off('scan', callback1);
    nfcReader.off('scan', callback2);
  });

  it('should correctly parse 0x55 event packets with length 11 in handleUsbData', async () => {
    const mockCardId = '04A3BDFA544280';
    const scanPromise = new Promise<NfcScanEvent>((resolve) => {
      nfcReader.once('scan', (event: NfcScanEvent) => {
        resolve(event);
      });
    });

    // Construct a custom 0x55 event buffer
    // Payload length: 11
    // Pad: 2
    // Index: 1
    // Dir: 0 (arrival: physical 0 = inserted)
    // UID: 04 A3 BD FA 54 42 80 (7 bytes)
    const buf = Buffer.alloc(32, 0);
    buf[0] = 0x55; // type
    buf[1] = 11;   // len
    buf[2] = 2;    // pad
    buf[3] = 0;    // empty
    buf[4] = 1;    // index
    buf[5] = 0;    // dir
    const uidBuf = Buffer.from(mockCardId, 'hex');
    uidBuf.copy(buf, 6);

    // Calculate checksum
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      sum = (sum + buf[i]) % 256;
    }
    buf[13] = sum;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (nfcReader as any).handleUsbData(buf);

    const event = await scanPromise;
    expect(event.cardId).toBe(mockCardId);
    expect(event.readerId).toBe('usb-0xe6f-0x241-pad2');
  });
});
