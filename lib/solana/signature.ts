/**
 * lib/solana/signature.ts
 *
 * Finds Solana transaction signatures in free text.
 *
 * A transaction signature is 64 bytes written in base58. That is 87 or 88
 * characters in practice; leading zero bytes can make it a little shorter.
 * Wallet addresses are 32 bytes (32 to 44 characters), so the two never
 * collide.
 */

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SIGNATURE_BYTES = 64;
const SIGNATURE_SHAPE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
const NON_BASE58 = /[^1-9A-HJ-NP-Za-km-z]+/;

/** Decode a base58 string to bytes. Returns null when it is not valid base58. */
export function decodeBase58(value: string): Uint8Array | null {
  if (!value) return null;

  const radix = BigInt(58);
  let num = BigInt(0);
  for (let i = 0; i < value.length; i++) {
    const digit = BASE58_ALPHABET.indexOf(value[i]);
    if (digit < 0) return null;
    num = num * radix + BigInt(digit);
  }

  const bytes: number[] = [];
  const byteMask = BigInt(255);
  const byteShift = BigInt(8);
  while (num > BigInt(0)) {
    bytes.push(Number(num & byteMask));
    num = num >> byteShift;
  }

  // Each leading "1" stands for a leading zero byte.
  for (let i = 0; i < value.length && value[i] === "1"; i++) {
    bytes.push(0);
  }

  return Uint8Array.from(bytes.reverse());
}

/** True when the value is base58 that decodes to exactly 64 bytes. */
export function isTransactionSignature(value: string): boolean {
  if (typeof value !== "string" || !SIGNATURE_SHAPE.test(value)) return false;
  const bytes = decodeBase58(value);
  return bytes !== null && bytes.length === SIGNATURE_BYTES;
}

/**
 * First transaction signature in the text, or null. Works on a bare
 * signature and on explorer links such as
 * https://explorer.solana.com/tx/<signature>?cluster=devnet
 */
export function findTransactionSignature(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  for (const token of text.split(NON_BASE58)) {
    if (isTransactionSignature(token)) return token;
  }
  return null;
}
