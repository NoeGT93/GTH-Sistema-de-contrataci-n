import { randomInt } from "node:crypto";

// Sin 0/O, 1/I/L para que se pueda dictar por teléfono.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function trackingCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
