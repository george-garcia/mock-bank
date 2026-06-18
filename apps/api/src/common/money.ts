/**
 * Money is represented internally as an integer number of minor units (cents).
 * All arithmetic is integer arithmetic — floats are never used for money.
 *
 * The domain is bounded (decimal(12,2) → max ~10^12 cents), which is well within
 * Number.MAX_SAFE_INTEGER (~9×10^15), so a JS number safely holds the cents value.
 */

const AMOUNT_RE = /^-?\d{1,15}(\.\d{1,2})?$/;

/** Parse a decimal money string ("123.45") into integer minor units (12345). */
export function toMinor(decimal: string): number {
  const trimmed = String(decimal).trim();
  if (!AMOUNT_RE.test(trimmed)) {
    throw new Error(`Invalid monetary amount: "${decimal}"`);
  }
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole, frac = ''] = unsigned.split('.');
  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  return negative ? -cents : cents;
}

/** Format integer minor units (12345) back into a decimal string ("123.45"). */
export function toDecimalString(minor: number): string {
  if (!Number.isInteger(minor)) {
    throw new Error(`Minor units must be an integer, got: ${minor}`);
  }
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const cents = abs % 100;
  return `${negative ? '-' : ''}${whole}.${cents.toString().padStart(2, '0')}`;
}

/** True when the string is a well-formed, strictly-positive money amount. */
export function isPositiveAmount(decimal: string): boolean {
  try {
    return toMinor(decimal) > 0;
  } catch {
    return false;
  }
}
