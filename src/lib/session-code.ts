import { customAlphabet } from "nanoid";

// Alphabet sans caractères ambigus (pas de 0/O, 1/I/L).
const generateCode = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 5);

export function newSessionCode() {
  return generateCode();
}
