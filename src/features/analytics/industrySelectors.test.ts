import { describe, expect, it } from 'vitest';
import type { IndustryRow } from '../../shared/types/domain';
import { buildIndustryDailySeries, buildIndustrySummaries, buildTrafficComposition, normalizedMetricShares, percentOfBadBotTraffic, weightedAverage } from './industrySelectors';

const baseRow: IndustryRow = {
  industry: 'Retail',
  date: '2026-07-01',
  allTrafic: 1000,
  badBotsPercent: 10,
  goodBotsPercent: 5,
  humansPercent: 85,
  checkPercent: 0,
  botsPercent: 40,
  strongBotsPercent: 60,
  mobileBotsPercent: 30,
  desktopBotsPercent: 60,
  unknownBotsPercent: 10,
  dataCentersPercent: 8,
  apiPercent: 2,
  ruPercent: 70,
  foreignPercent: 30,
  parsersPercent: 4,
  credsPercent: 1,
  scanerPercent: 3,
  paymentsCrackPercent: 0.5,
  smsPushBomberPercent: 0.25,
};

describe('industrySelectors', () => {
  it('keeps total-traffic weighted averages for ordinary percent metrics', () => {
    const rows = [
      { ...baseRow, allTrafic: 1000, humansPercent: 80 },
      { ...baseRow, allTrafic: 3000, humansPercent: 60 },
    ];

    expect(weightedAverage(rows, 'humansPercent')).toBe(65);
  });

  it('recalculates attack percentages against malicious traffic', () => {
    const rows = [
      { ...baseRow, allTrafic: 1000, badBotsPercent: 10, apiPercent: 2 },
      { ...baseRow, allTrafic: 3000, badBotsPercent: 20, apiPercent: 4 },
    ];

    expect(percentOfBadBotTraffic(rows, 'apiPercent')).toBe(20);
  });

  it('normalizes the daily threat structure to 100% while preserving source-derived counts', () => {
    const [day] = buildIndustryDailySeries([
      { ...baseRow, allTrafic: 1000, apiPercent: 2, parsersPercent: 1, credsPercent: 0, scanerPercent: 0, paymentsCrackPercent: 0, smsPushBomberPercent: 0 },
      { ...baseRow, allTrafic: 3000, apiPercent: 4, parsersPercent: 2, credsPercent: 0, scanerPercent: 0, paymentsCrackPercent: 0, smsPushBomberPercent: 0 },
    ]);

    expect(day.apiPercent).toBe(66.67);
    expect(day.parsersPercent).toBe(33.33);
    expect(day.apiPercent + day.parsersPercent + day.credsPercent + day.scanerPercent + day.paymentsCrackPercent + day.smsPushBomberPercent).toBe(100);
    expect(day.apiPercentCount).toBe(140);
  });

  it('weights bot-composition metrics by malicious-bot volume', () => {
    const rows = [
      { ...baseRow, allTrafic: 1000, badBotsPercent: 10, strongBotsPercent: 20 },
      { ...baseRow, allTrafic: 1000, badBotsPercent: 30, strongBotsPercent: 60 },
    ];

    expect(weightedAverage(rows, 'strongBotsPercent')).toBe(50);
  });

  it('derives check as the residual and keeps the traffic composition at 100%', () => {
    const rows = [{ ...baseRow, checkPercent: undefined, humansPercent: 70, goodBotsPercent: 10, badBotsPercent: 15 }];
    const composition = buildTrafficComposition(rows);

    expect(composition.find((item) => item.key === 'checkPercent')?.percent).toBe(5);
    expect(composition.reduce((sum, item) => sum + item.percent, 0)).toBe(100);
  });

  it('reconciles displayed traffic shares to exactly 100.00% after rounding', () => {
    const rows = [{
      ...baseRow,
      humansPercent: 86.524,
      goodBotsPercent: 7.017,
      badBotsPercent: 4.265,
      checkPercent: 2.194,
    }];
    const composition = buildTrafficComposition(rows);

    expect(composition.map((item) => item.percent)).toEqual([86.52, 7.02, 4.26, 2.2]);
    expect(composition.reduce((sum, item) => sum + item.percent, 0)).toBe(100);
  });

  it('normalizes overlapping threat tags into a separate 100-percent composition', () => {
    const rows = [{ ...baseRow, apiPercent: 8, parsersPercent: 2 }];
    const shares = normalizedMetricShares(rows, ['apiPercent', 'parsersPercent']);

    expect(shares.map((item) => item.percent)).toEqual([80, 20]);
    expect(shares.reduce((sum, item) => sum + item.percent, 0)).toBe(100);
  });

  it('keeps every industry threat row at exactly 100.00%', () => {
    const summaries = buildIndustrySummaries([
      { ...baseRow, industry: 'Retail', apiPercent: 2, parsersPercent: 1 },
      { ...baseRow, industry: 'Banking', apiPercent: 1, parsersPercent: 1, scanerPercent: 1 },
    ]);

    summaries.forEach((summary) => {
      const total = summary.apiPercent + summary.parsersPercent + summary.credsPercent + summary.scanerPercent + summary.paymentsCrackPercent + summary.smsPushBomberPercent;
      expect(total).toBe(100);
      expect(Math.max(summary.apiPercent, summary.parsersPercent, summary.credsPercent, summary.scanerPercent, summary.paymentsCrackPercent, summary.smsPushBomberPercent)).toBeLessThanOrEqual(100);
    });
  });
});
