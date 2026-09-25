import { describe, expect, it } from 'vitest';

import { formatDate, isValidDate } from './date';

describe('formatDate', () => {
  it('formats a Date object in a readable month-day-year format', () => {
    expect(formatDate(new Date('2024-01-15T12:00:00Z'))).toBe('Jan 15, 2024');
  });

  it('accepts ISO date strings and formats them consistently', () => {
    expect(formatDate('2024-02-01T00:00:00Z')).toBe('Feb 1, 2024');
  });

  it('throws when the value is not a valid date', () => {
    expect(() => formatDate('not-a-date')).toThrow('Invalid date');
  });
});

describe('isValidDate', () => {
  it('returns true for valid date inputs', () => {
    expect(isValidDate(new Date('2024-03-01T00:00:00Z'))).toBe(true);
    expect(isValidDate('2024-03-01')).toBe(true);
    expect(isValidDate(1717200000000)).toBe(true);
  });

  it('returns false for invalid date inputs', () => {
    expect(isValidDate('not-a-date')).toBe(false);
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });
});
