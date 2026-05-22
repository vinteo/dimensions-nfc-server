import { Frame } from './frame.js';

export class Event {
  public frame: Frame;
  public pad: number = 0;
  public index: number = 0;
  public dir: number = 0; // 1 for tag arrival, 0 for tag departure
  public uid: string = '';

  constructor(data?: Buffer | Frame | Partial<Event>) {
    if (Buffer.isBuffer(data)) {
      this.frame = new Frame(data);
      this.parse(this.frame);
    } else if (data instanceof Frame) {
      this.frame = data;
      this.parse(data);
    } else {
      this.frame = new Frame();
      if (data) {
        const partial = data as Partial<Event>;
        this.pad = partial.pad || 0;
        this.index = partial.index || 0;
        this.dir = partial.dir || 0;
        this.uid = partial.uid || '';
      }
    }
  }

  /**
   * Parse an Event from an existing Frame
   */
  public parse(f: Frame): void {
    this.frame = f;
    const p = f.payload;
    this.pad = p[0] || 0;
    this.index = p[2] || 0;
    this.dir = p[3] === 0 ? 1 : 0; // Physical Toy Pad: 0 = Tag Inserted (Arrival = 1), 1 = Tag Removed (Departure = 0)
    
    // Tag UID is a 7-byte hex string located starting at index 4 (from index 4 to index 11)
    if (p.length >= 11) {
      this.uid = p.subarray(4, 11).toString('hex').toUpperCase();
    } else {
      this.uid = '';
    }
  }

  /**
   * Build the Event into a 32-byte Buffer
   */
  public build(): Buffer {
    const b = Buffer.alloc(11, 0);
    b[0] = this.pad;
    b[2] = this.index;
    b[3] = this.dir === 1 ? 0 : 1; // Map internal Arrival (1) to physical 0, Departure (0) to physical 1
    
    if (this.uid) {
      const uidBuf = Buffer.from(this.uid, 'hex');
      uidBuf.copy(b, 4);
    }

    this.frame.type = this.frame.type || 0x56; // Keep existing type (e.g. 0x55) or default to 0x56
    this.frame.payload = b;
    return this.frame.build();
  }
}
