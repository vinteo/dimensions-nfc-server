export class Frame {
  public type: number = 0;
  public len: number = 0;
  public payload: Buffer = Buffer.alloc(0);
  public chksum: number = 0;

  constructor(buf?: Buffer) {
    if (buf) {
      this.parse(buf);
    }
  }

  /**
   * Parse an incoming 32-byte buffer into Frame properties
   */
  public parse(b: Buffer): void {
    this.type = b[0];
    this.len = b[1];
    this.payload = b.subarray(2, 2 + this.len);
    this.chksum = b[this.len + 2];
  }

  /**
   * Construct a 32-byte buffer from Frame properties
   */
  public build(): Buffer {
    const buf = Buffer.alloc(32, 0);
    buf[0] = this.type;
    buf[1] = this.payload.length;
    this.payload.copy(buf, 2);

    // Calculates checksum: sum of all bytes in the frame up to (but not including) the checksum byte
    let sum = 0;
    const chksumIndex = this.payload.length + 2;
    for (let i = 0; i < chksumIndex; i++) {
      sum = (sum + buf[i]) % 256;
    }
    buf[chksumIndex] = sum;
    this.chksum = sum;
    return buf;
  }
}
