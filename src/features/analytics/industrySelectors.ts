import type { IndustryRow } from '../../shared/types/domain';

export interface IndustryMetric {
  key: keyof IndustryRow;
  label: string;
  shortLabel: string;
}

export const industryMetrics: IndustryMetric[] = [
  { key: 'badBotsPercent', label: 'Доля вредоносных ботов от общего объёма трафика', shortLabel: 'Доля вредоносных ботов от общего объёма трафика' },
  { key: 'goodBotsPercent', label: 'Доля обеленных ботов (Яндекс, Гугл...) от общего объёма трафика', shortLabel: 'Доля обеленных ботов (Яндекс, Гугл...) от общего объёма трафика' },
  { key: 'humansPercent', label: 'Доля человеческого трафика от общего объёма трафика', shortLabel: 'Доля человеческого трафика от общего объёма трафика' },
  { key: 'checkPercent', label: 'Доля потенциально легитимных пользователей от общего объёма трафика', shortLabel: 'Потенциально легитимные пользователи' },
  { key: 'botsPercent', label: 'Доля обычных ботов среди всего бот-трафика', shortLabel: 'Доля обычных ботов среди всего бот-трафика' },
  { key: 'strongBotsPercent', label: 'Доля продвинутых ботов среди всего бот-трафика', shortLabel: 'Доля продвинутых ботов среди всего бот-трафика' },
  { key: 'mobileBotsPercent', label: 'Доля мобильных ботов среди всего бот-трафика', shortLabel: 'Доля мобильных ботов среди всего бот-трафика' },
  { key: 'desktopBotsPercent', label: 'Доля десктопных ботов среди всего бот-трафика', shortLabel: 'Доля десктопных ботов среди всего бот-трафика' },
  { key: 'unknownBotsPercent', label: 'Доля ботов с неизвестным типом устройства среди всего бот-трафика', shortLabel: 'Доля ботов с неизвестным типом устройства среди всего бот-трафика' },
  { key: 'dataCentersPercent', label: 'Доля трафика, исходящего из дата-центров от общего объёма трафика', shortLabel: 'Доля трафика, исходящего из дата-центров от общего объёма трафика' },
  { key: 'apiPercent', label: 'Доля API-атак от общего объёма трафика', shortLabel: 'Доля API-атак от общего объёма трафика' },
  { key: 'ruPercent', label: 'Доля трафика из России от общего объёма трафика', shortLabel: 'Доля трафика из России от общего объёма трафика' },
  { key: 'foreignPercent', label: 'Доля иностранного трафика от общего объёма трафика', shortLabel: 'Доля иностранного трафика от общего объёма трафика' },
  { key: 'parsersPercent', label: 'Доля активности парсеров от общего объёма трафика', shortLabel: 'Доля активности парсеров от общего объёма трафика' },
  { key: 'credsPercent', label: 'Доля подбора учётных данных от общего объёма трафика', shortLabel: 'Доля подбора учётных данных от общего объёма трафика' },
  { key: 'scanerPercent', label: 'Доля сканеров от общего объёма трафика', shortLabel: 'Доля сканеров от общего объёма трафика' },
  { key: 'paymentsCrackPercent', label: 'Доля подбора платёжных данных от общего объёма трафика', shortLabel: 'Доля подбора платёжных данных от общего объёма трафика' },
  { key: 'smsPushBomberPercent', label: 'Доля SMS/Push-бомберов от общего объёма трафика', shortLabel: 'Доля SMS/Push-бомберов от общего объёма трафика' },
];

export interface IndustrySummary {
  industry: string;
  rows: number;
  totalTraffic: number;
  firstDate: string;
  lastDate: string;
  badBotsPercent: number;
  goodBotsPercent: number;
  humansPercent: number;
  checkPercent: number;
  botsPercent: number;
  strongBotsPercent: number;
  mobileBotsPercent: number;
  desktopBotsPercent: number;
  unknownBotsPercent: number;
  dataCentersPercent: number;
  apiPercent: number;
  ruPercent: number;
  foreignPercent: number;
  parsersPercent: number;
  credsPercent: number;
  scanerPercent: number;
  paymentsCrackPercent: number;
  smsPushBomberPercent: number;
}

const badBotDenominatorMetrics = new Set<keyof IndustryRow>([
  'botsPercent',
  'strongBotsPercent',
  'mobileBotsPercent',
  'desktopBotsPercent',
  'unknownBotsPercent',
]);

function metricWeight(row: IndustryRow, key: keyof IndustryRow): number {
  // These source percentages describe the composition of malicious bot traffic,
  // so their aggregation denominator is the row's malicious-bot volume.
  if (badBotDenominatorMetrics.has(key)) return row.allTrafic * row.badBotsPercent / 100;
  return row.allTrafic;
}

export function weightedAverage(rows: IndustryRow[], key: keyof IndustryRow): number {
  const totals = rows.reduce(
    (acc, row) => {
      const weight = metricWeight(row, key);
      const value = typeof row[key] === 'number' && Number.isFinite(row[key]) ? row[key] : 0;
      acc.sum += value * weight;
      acc.weight += weight;
      return acc;
    },
    { sum: 0, weight: 0 },
  );
  return totals.weight ? totals.sum / totals.weight : 0;
}

export function totalIndustryTraffic(rows: IndustryRow[]): number {
  return rows.reduce((sum, row) => sum + row.allTrafic, 0);
}

function roundPercent(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function trafficCheckPercent(row: IndustryRow): number {
  if (typeof row.checkPercent === 'number' && Number.isFinite(row.checkPercent)) return row.checkPercent;
  return 100 - row.humansPercent - row.goodBotsPercent - row.badBotsPercent;
}

export function metricTrafficCount(rows: IndustryRow[], key: keyof IndustryRow): number {
  return rows.reduce((sum, row) => {
    const value = key === 'checkPercent'
      ? trafficCheckPercent(row)
      : typeof row[key] === 'number' && Number.isFinite(row[key]) ? Number(row[key]) : 0;
    return sum + (row.allTrafic * value) / 100;
  }, 0);
}

export function badBotTraffic(rows: IndustryRow[]): number {
  return metricTrafficCount(rows, 'badBotsPercent');
}

export function normalizedMetricShares(rows: IndustryRow[], keys: readonly (keyof IndustryRow)[]) {
  const counts = keys.map((key) => ({ key, count: metricTrafficCount(rows, key) }));
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  if (!total) return counts.map((item) => ({ ...item, percent: 0 }));

  const units = counts.map((item, index) => {
    const exact = (item.count / total) * 10_000;
    return { index, whole: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let missingUnits = 10_000 - units.reduce((sum, item) => sum + item.whole, 0);
  [...units]
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .forEach((item) => {
      if (missingUnits > 0) {
        units[item.index].whole += 1;
        missingUnits -= 1;
      }
    });

  return counts.map((item, index) => ({ ...item, percent: units[index].whole / 100 }));
}

export function buildTrafficComposition(rows: IndustryRow[]) {
  const total = totalIndustryTraffic(rows);
  const humansCount = metricTrafficCount(rows, 'humansPercent');
  const goodBotsCount = metricTrafficCount(rows, 'goodBotsPercent');
  const badBotsCount = metricTrafficCount(rows, 'badBotsPercent');
  const checkCount = metricTrafficCount(rows, 'checkPercent');
  const humansPercent = total ? roundPercent((humansCount / total) * 100) : 0;
  const goodBotsPercent = total ? roundPercent((goodBotsCount / total) * 100) : 0;
  const badBotsPercent = total ? roundPercent((badBotsCount / total) * 100) : 0;
  const checkPercent = total ? roundPercent(100 - humansPercent - goodBotsPercent - badBotsPercent) : 0;
  return [
    { key: 'humansPercent' as const, percent: humansPercent, count: humansCount },
    { key: 'goodBotsPercent' as const, percent: goodBotsPercent, count: goodBotsCount },
    { key: 'badBotsPercent' as const, percent: badBotsPercent, count: badBotsCount },
    { key: 'checkPercent' as const, percent: checkPercent, count: checkCount },
  ];
}

function buildIndustrySummary(industry: string, groupRows: IndustryRow[]): IndustrySummary {
  const dates = groupRows.map((row) => row.date).filter((date) => date !== 'Unknown').sort();
  const totalTraffic = totalIndustryTraffic(groupRows);
  const badBotsPercent = weightedAverage(groupRows, 'badBotsPercent');
  const goodBotsPercent = weightedAverage(groupRows, 'goodBotsPercent');
  const humansPercent = weightedAverage(groupRows, 'humansPercent');
  return {
    industry,
    rows: groupRows.length,
    totalTraffic,
    firstDate: dates[0] ?? 'Unknown',
    lastDate: dates.at(-1) ?? 'Unknown',
    badBotsPercent,
    goodBotsPercent,
    humansPercent,
    checkPercent: totalTraffic
      ? roundPercent(100 - roundPercent(humansPercent) - roundPercent(goodBotsPercent) - roundPercent(badBotsPercent))
      : 0,
    botsPercent: weightedAverage(groupRows, 'botsPercent'),
    strongBotsPercent: weightedAverage(groupRows, 'strongBotsPercent'),
    mobileBotsPercent: weightedAverage(groupRows, 'mobileBotsPercent'),
    desktopBotsPercent: weightedAverage(groupRows, 'desktopBotsPercent'),
    unknownBotsPercent: weightedAverage(groupRows, 'unknownBotsPercent'),
    dataCentersPercent: weightedAverage(groupRows, 'dataCentersPercent'),
    apiPercent: weightedAverage(groupRows, 'apiPercent'),
    ruPercent: weightedAverage(groupRows, 'ruPercent'),
    foreignPercent: weightedAverage(groupRows, 'foreignPercent'),
    parsersPercent: weightedAverage(groupRows, 'parsersPercent'),
    credsPercent: weightedAverage(groupRows, 'credsPercent'),
    scanerPercent: weightedAverage(groupRows, 'scanerPercent'),
    paymentsCrackPercent: weightedAverage(groupRows, 'paymentsCrackPercent'),
    smsPushBomberPercent: weightedAverage(groupRows, 'smsPushBomberPercent'),
  };
}

export function buildIndustrySummaries(rows: IndustryRow[]): IndustrySummary[] {
  const byIndustry = new Map<string, IndustryRow[]>();
  rows.forEach((row) => {
    const list = byIndustry.get(row.industry) ?? [];
    list.push(row);
    byIndustry.set(row.industry, list);
  });

  return Array.from(byIndustry.entries())
    .map(([industry, groupRows]) => buildIndustrySummary(industry, groupRows))
    .sort((a, b) => b.totalTraffic - a.totalTraffic);
}

export function buildIndustryTotalSummary(rows: IndustryRow[]): IndustrySummary {
  return buildIndustrySummary('Итого', rows);
}

export function buildIndustryDailySeries(rows: IndustryRow[]) {
  const byDate = new Map<string, IndustryRow[]>();
  rows.forEach((row) => {
    if (!row.date || row.date === 'Unknown') return;
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  });

  return Array.from(byDate.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, dayRows]) => {
      return {
        date,
        label: new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        traffic: totalIndustryTraffic(dayRows),
        badBotsPercent: weightedAverage(dayRows, 'badBotsPercent'),
        apiPercent: weightedAverage(dayRows, 'apiPercent'),
        apiPercentCount: estimatePercentCount(dayRows, 'apiPercent'),
        parsersPercent: weightedAverage(dayRows, 'parsersPercent'),
        parsersPercentCount: estimatePercentCount(dayRows, 'parsersPercent'),
        credsPercent: weightedAverage(dayRows, 'credsPercent'),
        credsPercentCount: estimatePercentCount(dayRows, 'credsPercent'),
        scanerPercent: weightedAverage(dayRows, 'scanerPercent'),
        scanerPercentCount: estimatePercentCount(dayRows, 'scanerPercent'),
        paymentsCrackPercent: weightedAverage(dayRows, 'paymentsCrackPercent'),
        paymentsCrackPercentCount: estimatePercentCount(dayRows, 'paymentsCrackPercent'),
        smsPushBomberPercent: weightedAverage(dayRows, 'smsPushBomberPercent'),
        smsPushBomberPercentCount: estimatePercentCount(dayRows, 'smsPushBomberPercent'),
      };
    });
}

function estimatePercentCount(rows: IndustryRow[], key: keyof IndustryRow) {
  return Math.round(rows.reduce((sum, row) => {
    const value = typeof row[key] === 'number' ? row[key] : 0;
    return sum + (row.allTrafic * value) / 100;
  }, 0));
}
