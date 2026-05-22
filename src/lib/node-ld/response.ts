import { Frame } from './frame.js';

export class Response {
  public frame: Frame;
  public cid: number = 0;
  public payload: Buffer = Buffer.alloc(0);

  constructor(data?: Buffer | Frame) {
    if (data instanceof Buffer) {
      this.frame = new Frame(data);
      this.parse(this.frame);
    } else if (data instanceof Frame) {
      this.frame = data;
      this.parse(data);
    } else {
      this.frame = new Frame();
    }
  }

  /**
   * Parse a Response from an existing Frame
   */
  public parse(f: Frame): void {
    this.frame = f;
    const p = f.payload;
    this.cid = p[0] || 0;
    this.payload = p.subarray(1);
  }

  /**
   * Build the Response into a 32-byte Buffer
   */
  public build(): Buffer {
    const b = Buffer.alloc(this.payload.length + 1);
    b[0] = this.cid;
    this.payload.copy(b, 1);

    this.frame.type = 0x55; // Response magic byte matches request
    this.frame.payload = b;
    return this.frame.build();
  }
}
