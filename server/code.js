import { randomInt } from 'node:crypto';

export const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const codeLength = 6;

export function generateCode() {
  return Array.from({ length: codeLength }, () => codeAlphabet[randomInt(codeAlphabet.length)]).join('');
}

export function normalizeCode(input) {
  return String(input ?? '').trim().toUpperCase();
}
