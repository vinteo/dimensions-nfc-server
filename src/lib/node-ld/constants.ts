export const commands = {
  CMD_WAKE: 0xb0,
  CMD_SEED: 0xb1,
  CMD_CHAL: 0xb3,
  CMD_COL: 0xc0,
  CMD_GETCOL: 0xc1,
  CMD_FADE: 0xc2,
  CMD_FLASH: 0xc3,
  CMD_FADRD: 0xc4,
  CMD_FADAL: 0xc6,
  CMD_FLSAL: 0xc7,
  CMD_COLAL: 0xc8,
  CMD_TGLST: 0xd0,
  CMD_READ: 0xd2,
  CMD_WRITE: 0xd3,
  CMD_MODEL: 0xd4,
  CMD_PWD: 0xe1,
  CMD_ACTIVE: 0xe5,
  CMD_LEDSQ: 0xff,
} as const;

export type CommandType = typeof commands[keyof typeof commands];
