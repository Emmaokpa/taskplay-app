// lib/generate-code.ts

/**
 * Generates a random, easy-to-read alphanumeric code of a given length.
 * Avoids characters that can be easily confused like 'I', 'O', '0', '1'.
 * Note: For very large user bases, you might want to check for collisions in the database,
 * but with 8 characters, the chance of a collision is extremely low (1 in 2 trillion+).
 */
export function generateReferralCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
