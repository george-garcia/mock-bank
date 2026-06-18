import { toMinor, toDecimalString, isPositiveAmount } from '../money';

describe('money', () => {
  describe('toMinor', () => {
    it('parses whole and fractional amounts', () => {
      expect(toMinor('0')).toBe(0);
      expect(toMinor('1')).toBe(100);
      expect(toMinor('123.45')).toBe(12345);
      expect(toMinor('0.01')).toBe(1);
      expect(toMinor('0.1')).toBe(10);
      expect(toMinor('1000000.99')).toBe(100000099);
    });

    it('handles the classic float-error amounts exactly', () => {
      // 0.1 + 0.2 in cents is exact integer arithmetic
      expect(toMinor('0.1') + toMinor('0.2')).toBe(30);
      expect(toDecimalString(toMinor('0.1') + toMinor('0.2'))).toBe('0.30');
    });

    it('parses negatives', () => {
      expect(toMinor('-50.00')).toBe(-5000);
      expect(toMinor('-0.05')).toBe(-5);
    });

    it('rejects malformed amounts', () => {
      expect(() => toMinor('1.234')).toThrow();
      expect(() => toMinor('abc')).toThrow();
      expect(() => toMinor('1,000.00')).toThrow();
      expect(() => toMinor('')).toThrow();
      expect(() => toMinor('1.2.3')).toThrow();
    });
  });

  describe('toDecimalString', () => {
    it('formats minor units back to 2dp strings', () => {
      expect(toDecimalString(0)).toBe('0.00');
      expect(toDecimalString(5)).toBe('0.05');
      expect(toDecimalString(12345)).toBe('123.45');
      expect(toDecimalString(-5000)).toBe('-50.00');
    });

    it('round-trips with toMinor', () => {
      for (const v of ['0.00', '0.01', '99.99', '1234.56', '1000000.00']) {
        expect(toDecimalString(toMinor(v))).toBe(v);
      }
    });

    it('rejects non-integers', () => {
      expect(() => toDecimalString(1.5)).toThrow();
    });
  });

  describe('isPositiveAmount', () => {
    it('is true only for valid positive amounts', () => {
      expect(isPositiveAmount('0.01')).toBe(true);
      expect(isPositiveAmount('100')).toBe(true);
      expect(isPositiveAmount('0')).toBe(false);
      expect(isPositiveAmount('-1')).toBe(false);
      expect(isPositiveAmount('nope')).toBe(false);
    });
  });
});
