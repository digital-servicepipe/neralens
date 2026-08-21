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
  { key: 'credsPercent', label: 'Доля атак, связанных с подбором учётных данных от общего объёма трафика', shortLabel: 'Доля атак, связанных с подбором учётных данных от общего объёма трафика' },
  { key: 'scanerPercent', label: 'Доля сканеров от общего объёма трафика', shortLabel: 'Доля сканеров от общего объёма трафика' },
  { key: 'paymentsCrackPercent', label: 'Доля атак, связанных с подбором платёжных данных от общего объёма трафика', shortLabel: 'Доля атак, связанных с подбором платёжных данных от общего объёма трафика' },
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

export function weightedAverage(rows: IndustryRow[], key: keyof IndustryRow): number {
  const totals = rows.reduce(
    (acc, row) => {
      const weight = row.allTrafic || 0;
      const value = typeof row[key] === 'number' ? row[key] : 0;
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

export function buildIndustrySummaries(rows: IndustryRow[]): IndustrySummary[] {
  const byIndustry = new Map<string, IndustryRow[]>();
  rows.forEach((row) => {
    const list = byIndustry.get(row.industry) ?? [];
    list.push(row);
    byIndustry.set(row.industry, list);
  });

  return Array.from(byIndustry.entries())
    .map(([industry, groupRows]) => {
      const dates = groupRows.map((row) => row.date).filter((date) => date !== 'Unknown').sort();
      return {
        industry,
        rows: groupRows.length,
        totalTraffic: totalIndustryTraffic(groupRows),
        firstDate: dates[0] ?? 'Unknown',
        lastDate: dates.at(-1) ?? 'Unknown',
        badBotsPercent: weightedAverage(groupRows, 'badBotsPercent'),
        goodBotsPercent: weightedAverage(groupRows, 'goodBotsPercent'),
        humansPercent: weightedAverage(groupRows, 'humansPercent'),
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
    })
    .sort((a, b) => b.totalTraffic - a.totalTraffic);
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
    .map(([date, dayRows]) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      traffic: totalIndustryTraffic(dayRows),
      badBotsPercent: weightedAverage(dayRows, 'badBotsPercent'),
      apiPercent: weightedAverage(dayRows, 'apiPercent'),
      parsersPercent: weightedAverage(dayRows, 'parsersPercent'),
      credsPercent: weightedAverage(dayRows, 'credsPercent'),
      scanerPercent: weightedAverage(dayRows, 'scanerPercent'),
      paymentsCrackPercent: weightedAverage(dayRows, 'paymentsCrackPercent'),
      smsPushBomberPercent: weightedAverage(dayRows, 'smsPushBomberPercent'),
    }));
}
