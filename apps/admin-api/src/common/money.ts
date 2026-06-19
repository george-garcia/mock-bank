/** Format integer minor units (12345) into a decimal string ("123.45"). Read-only display. */
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
