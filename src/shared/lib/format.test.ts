import { describe, expect, it } from 'vitest';
import { formatPercent, formatPercentValue } from './format';

describe('percentage formatting', () => {
  it('keeps the standard two-decimal display for regular percentages', () => {
    expect(formatPercent(70.454)).toBe('70,45%');
  });

  it('never turns a small non-zero percentage into zero', () => {
    expect(formatPercent(0.004)).toBe('0,004%');
    expect(formatPercent(0.004567)).toBe('0,00457%');
    expect(formatPercentValue(-0.00042)).toBe('-0,00042');
  });

  it('shows an actual zero as zero', () => {
    expect(formatPercent(0)).toBe('0%');
  });
});
