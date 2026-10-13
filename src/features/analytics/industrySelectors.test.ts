import { describe, expect, it } from 'vitest';
import type { IndustryRow } from '../../shared/types/domain';
import { buildIndustryDailySeries, buildIndustrySummaries, buildTrafficComposition, metricTrafficCount, normalizedMetricShares, weightedAverage } from './industrySelectors';

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

  it('uses the correct denominator for daily attack percentages and counts', () => {
    const [day] = buildIndustryDailySeries([
      { ...baseRow, allTrafic: 1000, apiPercent: 2, parsersPercent: 1, credsPercent: 0, scanerPercent: 0, paymentsCrackPercent: 0, smsPushBomberPercent: 0 },
      { ...baseRow, allTrafic: 3000, apiPercent: 4, parsersPercent: 2, credsPercent: 0, scanerPercent: 0, paymentsCrackPercent: 0, smsPushBomberPercent: 0 },
    ]);

    expect(day.apiPercent).toBe(3.5);
    expect(day.parsersPercent).toBe(1.75);
    expect(day.apiPercentCount).toBe(14);
    expect(day.parsersPercentCount).toBe(7);
  });

  it('weights bot-composition metrics by total traffic', () => {
    const rows = [
      { ...baseRow, allTrafic: 1000, badBotsPercent: 10, strongBotsPercent: 20 },
      { ...baseRow, allTrafic: 1000, badBotsPercent: 30, strongBotsPercent: 60 },
    ];

    expect(weightedAverage(rows, 'strongBotsPercent')).toBe(40);
  });

  it('weights attack metrics by malicious traffic and derives counts from malicious traffic', () => {
    const rows = [
      { ...baseRow, allTrafic: 1000, badBotsPercent: 10, checkPercent: 5, apiPercent: 10 },
      { ...baseRow, allTrafic: 1000, badBotsPercent: 30, checkPercent: 5, apiPercent: 20 },
    ];

    expect(weightedAverage(rows, 'apiPercent')).toBe(17);
    expect(metricTrafficCount(rows, 'apiPercent')).toBe(85);
    expect(metricTrafficCount(rows.map((row) => ({ ...row, parsersPercent: row.apiPercent })), 'parsersPercent')).toBe(85);
    expect(buildIndustryDailySeries(rows)[0].apiPercentCount).toBe(85);
  });

  it('adds check to malicious bots and keeps the traffic composition at 100%', () => {
    const rows = [{ ...baseRow, checkPercent: undefined, humansPercent: 70, goodBotsPercent: 10, badBotsPercent: 15 }];
    const composition = buildTrafficComposition(rows);

    expect(composition).toHaveLength(3);
    expect(composition.find((item) => item.key === 'badBotsPercent')?.percent).toBe(20);
    expect(composition.reduce((sum, item) => sum + item.percent, 0)).toBeCloseTo(100, 10);
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

    expect(composition.map((item) => item.percent)).toEqual([86.52, 7.02, 6.46]);
    expect(composition.reduce((sum, item) => sum + item.percent, 0)).toBeCloseTo(100, 10);
  });

  it('keeps the displayed good-versus-bad bot split at exactly 100%', () => {
    const rows = [{ ...baseRow, goodBotsPercent: 8, badBotsPercent: 2 }];
    const shares = normalizedMetricShares(rows, ['goodBotsPercent', 'badBotsPercent']);

    expect(shares.map((item) => item.percent)).toEqual([80, 20]);
    expect(shares.reduce((sum, item) => sum + item.percent, 0)).toBe(100);
  });

  it('preserves source attack percentages in industry summaries', () => {
    const summaries = buildIndustrySummaries([
      { ...baseRow, industry: 'Retail', apiPercent: 2, parsersPercent: 1 },
      { ...baseRow, industry: 'Banking', apiPercent: 1, parsersPercent: 1, scanerPercent: 1 },
    ]);

    expect(summaries.find((summary) => summary.industry === 'Retail')?.apiPercent).toBe(2);
    expect(summaries.find((summary) => summary.industry === 'Retail')?.parsersPercent).toBe(1);
    expect(summaries.find((summary) => summary.industry === 'Banking')?.scanerPercent).toBe(1);
  });
});
