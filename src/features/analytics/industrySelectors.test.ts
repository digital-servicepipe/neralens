import { describe, expect, it } from 'vitest';
import type { IndustryRow } from '../../shared/types/domain';
import { buildIndustryDailySeries, weightedAverage } from './industrySelectors';

const baseRow: IndustryRow = {
  industry: 'Retail',
  date: '2026-07-01',
  allTrafic: 1000,
  badBotsPercent: 10,
  goodBotsPercent: 5,
  humansPercent: 85,
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

  it('keeps attack percentages as weighted values from the source file', () => {
    const rows = [
      { ...baseRow, allTrafic: 1000, badBotsPercent: 10, apiPercent: 2 },
      { ...baseRow, allTrafic: 3000, badBotsPercent: 20, apiPercent: 4 },
    ];

    expect(weightedAverage(rows, 'apiPercent')).toBe(3.5);
  });

  it('calculates daily attack counts directly from traffic and source percent', () => {
    const [day] = buildIndustryDailySeries([
      { ...baseRow, allTrafic: 1000, badBotsPercent: 10, apiPercent: 2 },
      { ...baseRow, allTrafic: 3000, badBotsPercent: 20, apiPercent: 4 },
    ]);

    expect(day.apiPercent).toBe(3.5);
    expect(day.apiPercentCount).toBe(140);
  });

  it('weights bot-composition metrics by malicious-bot volume', () => {
    const rows = [
      { ...baseRow, allTrafic: 1000, badBotsPercent: 10, strongBotsPercent: 20 },
      { ...baseRow, allTrafic: 1000, badBotsPercent: 30, strongBotsPercent: 60 },
    ];

    expect(weightedAverage(rows, 'strongBotsPercent')).toBe(50);
  });
});
