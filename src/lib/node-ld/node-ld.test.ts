import { describe, it, expect } from 'vitest';
import { Frame, Request, Response, Event, commands } from './index.js';

describe('node-ld protocol tests', () => {
  describe('Frame class', () => {
    it('should correctly parse an incoming buffer', () => {
      // 32-byte packet
      const buf = Buffer.alloc(32, 0);
      buf[0] = 0x56; // type
      buf[1] = 0x05; // len
      buf[2] = 0x01; // payload 0
      buf[3] = 0x02; // payload 1
      buf[4] = 0x03; // payload 2
      buf[5] = 0x04; // payload 3
      buf[6] = 0x05; // payload 4
      buf[7] = 0x61; // checksum (0x56 + 0x05 + 0x01 + 0x02 + 0x03 + 0x04 + 0x05 = 0x6a? Wait, 86 + 5 + 1 + 2 + 3 + 4 + 5 = 106 = 0x6a)
      buf[7] = 0x6a;

      const frame = new Frame(buf);
      expect(frame.type).toBe(0x56);
      expect(frame.len).toBe(5);
      expect(frame.payload.toString('hex')).toBe('0102030405');
      expect(frame.chksum).toBe(0x6a);
    });

    it('should correctly calculate the checksum and build buffer', () => {
      const frame = new Frame();
      frame.type = 0x55;
      frame.payload = Buffer.from([0x01, 0x02]);
      
      const built = frame.build();
      expect(built[0]).toBe(0x55);
      expect(built[1]).toBe(2);
      expect(built[2]).toBe(0x01);
      expect(built[3]).toBe(0x02);
      
      // Checksum index is len + 2 = 4
      // Checksum = (0x55 + 0x02 + 0x01 + 0x02) % 256 = 85 + 2 + 1 + 2 = 90 = 0x5a
      expect(built[4]).toBe(0x5a);
      expect(frame.chksum).toBe(0x5a);
      expect(built.length).toBe(32);
    });
  });

  describe('Request class', () => {
    it('should correctly build request packets', () => {
      const payload = Buffer.from([0xaa, 0xbb]);
      const req = new Request();
      req.cmd = commands.CMD_COL;
      req.cid = 0x12;
      req.payload = payload;

      const buffer = req.build();
      expect(buffer[0]).toBe(0x55); // Magic outgoing
      expect(buffer[1]).toBe(4);    // payload length = cmd + cid + subpayload = 4
      expect(buffer[2]).toBe(commands.CMD_COL);
      expect(buffer[3]).toBe(0x12);
      expect(buffer[4]).toBe(0xaa);
      expect(buffer[5]).toBe(0xbb);

      // Checksum = (0x55 + 4 + 0xc0 + 0x12 + 0xaa + 0xbb) % 256
      // = (85 + 4 + 192 + 18 + 170 + 187) % 256 = 656 % 256 = 144 = 0x90
      expect(buffer[6]).toBe(144);
    });
  });

  describe('Response class', () => {
    it('should parse response packets', () => {
      const buf = Buffer.alloc(32, 0);
      buf[0] = 0x55; // magic
      buf[1] = 0x03; // length (cid + payload = 3)
      buf[2] = 0x12; // cid
      buf[3] = 0x00; // payload 0
      buf[4] = 0x01; // payload 1
      buf[5] = 0x6b; // chksum = (85 + 3 + 18 + 0 + 1) = 107 = 0x6b

      const resp = new Response(buf);
      expect(resp.cid).toBe(0x12);
      expect(resp.payload.toString('hex')).toBe('0001');
    });
  });

  describe('Event class', () => {
    it('should parse tag events starting with 0x56', () => {
      const buf = Buffer.alloc(32, 0);
      buf[0] = 0x56; // magic event
      buf[1] = 11;   // length
      buf[2] = 2;    // pad 2
      buf[3] = 0;    // unused
      buf[4] = 1;    // index 1
      buf[5] = 0;    // dir (arrival: physical 0 = inserted)
      
      // UID: 04 A3 BD FA 54 42 80 (7 bytes)
      const uid = Buffer.from('04a3bdfa544280', 'hex');
      uid.copy(buf, 6); // start after dir

      const event = new Event(buf);
      expect(event.pad).toBe(2);
      expect(event.index).toBe(1);
      expect(event.dir).toBe(1);
      expect(event.uid).toBe('04A3BDFA544280');
    });

    it('should build tag event packets', () => {
      const event = new Event({
        pad: 3,
        index: 2,
        dir: 0, // departure
        uid: '04A3BDFA544280'
      });

      const buffer = event.build();
      expect(buffer[0]).toBe(0x56);
      expect(buffer[1]).toBe(11);
      expect(buffer[2]).toBe(3); // pad
      expect(buffer[3]).toBe(0); // empty
      expect(buffer[4]).toBe(2); // index
      expect(buffer[5]).toBe(1); // dir (departure: physical 1 = removed)

      expect(buffer.subarray(6, 13).toString('hex').toUpperCase()).toBe('04A3BDFA544280');
    });

    it('should parse tag events starting with 0x55', () => {
      const buf = Buffer.alloc(32, 0);
      buf[0] = 0x55; // Custom hardware magic event
      buf[1] = 11;   // length
      buf[2] = 2;    // pad 2
      buf[3] = 0;    // unused
      buf[4] = 1;    // index 1
      buf[5] = 0;    // dir (arrival: physical 0 = inserted)
      
      const uid = Buffer.from('04a3bdfa544280', 'hex');
      uid.copy(buf, 6);

      const event = new Event(buf);
      expect(event.pad).toBe(2);
      expect(event.index).toBe(1);
      expect(event.dir).toBe(1);
      expect(event.uid).toBe('04A3BDFA544280');
      expect(event.frame.type).toBe(0x55);
    });

    it('should preserve frame type 0x55 when building if set', () => {
      const event = new Event({
        pad: 3,
        index: 2,
        dir: 0,
        uid: '04A3BDFA544280'
      });
      event.frame.type = 0x55;

      const buffer = event.build();
      expect(buffer[0]).toBe(0x55);
      expect(buffer[1]).toBe(11);
    });
  });
});
