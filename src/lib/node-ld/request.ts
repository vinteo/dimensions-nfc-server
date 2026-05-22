import { Frame } from './frame.js';

export class Request {
  public frame: Frame;
  public cmd: number = 0;
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
   * Parse a Request from an existing Frame
   */
  public parse(f: Frame): void {
    this.frame = f;
    const p = f.payload;
    this.cmd = p[0] || 0;
    this.cid = p[1] || 0;
    this.payload = p.subarray(2);
  }

  /**
   * Build the Request into a 32-byte Buffer
   */
  public build(): Buffer {
    const b = Buffer.alloc(this.payload.length + 2);
    b[0] = this.cmd;
    b[1] = this.cid;
    this.payload.copy(b, 2);

    this.frame.type = 0x55; // Outgoing command magic byte
    this.frame.payload = b;
    return this.frame.build();
  }
}
