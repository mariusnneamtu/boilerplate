export const PERIOD_SECONDS = 120;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function normalizeBase32(value: string) {
  return value.toUpperCase().replace(/[\s-]/g, "").replace(/0/g, "O").replace(/[1IL]/g, "I");
}

function decodeBase32(value: string): number[] {
  const normalized = normalizeBase32(value).replace(/=+$/, "");
  if (!normalized || /[^A-Z2-7]/.test(normalized)) {
    throw new Error("Invalid Base32 secret");
  }

  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Invalid Base32 secret");
    buffer = (buffer << 5) | index;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >>> bitsLeft) & 0xff);
    }
  }
  return bytes;
}

function rotateLeft(value: number, amount: number) {
  return (value << amount) | (value >>> (32 - amount));
}

function sha1(message: number[]): number[] {
  const bytes = [...message];
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let shift = 7; shift >= 0; shift -= 1) bytes.push((bitLength / 2 ** (shift * 8)) & 0xff);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Array<number>(80).fill(0);
    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4;
      words[index] = ((bytes[start] << 24) | (bytes[start + 1] << 16) | (bytes[start + 2] << 8) | bytes[start + 3]) | 0;
    }
    for (let index = 16; index < 80; index += 1) {
      words[index] = rotateLeft(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let index = 0; index < 80; index += 1) {
      let functionValue: number;
      let constant: number;
      if (index < 20) {
        functionValue = (b & c) | (~b & d);
        constant = 0x5a827999;
      } else if (index < 40) {
        functionValue = b ^ c ^ d;
        constant = 0x6ed9eba1;
      } else if (index < 60) {
        functionValue = (b & c) | (b & d) | (c & d);
        constant = 0x8f1bbcdc;
      } else {
        functionValue = b ^ c ^ d;
        constant = 0xca62c1d6;
      }
      const temp = (rotateLeft(a, 5) + functionValue + e + constant + words[index]) | 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const result: number[] = [];
  for (const word of [h0, h1, h2, h3, h4]) {
    result.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
  }
  return result;
}

function hmacSha1(key: number[], message: number[]) {
  const blockSize = 64;
  const normalizedKey = key.length > blockSize ? sha1(key) : [...key];
  while (normalizedKey.length < blockSize) normalizedKey.push(0);
  const inner = normalizedKey.map((byte) => byte ^ 0x36);
  const outer = normalizedKey.map((byte) => byte ^ 0x5c);
  return sha1([...outer, ...sha1([...inner, ...message])]);
}

export function generateTOTP(secret: string, timestamp = Date.now()) {
  const key = decodeBase32(secret);
  const counter = Math.floor(timestamp / 1000 / PERIOD_SECONDS);
  const counterBytes: number[] = [];
  let remaining = counter;
  for (let index = 7; index >= 0; index -= 1) {
    counterBytes[index] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }

  const hash = hmacSha1(key, counterBytes);
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = (((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3]) >>> 0;
  return String(binary % 1_000_000).padStart(6, "0");
}
