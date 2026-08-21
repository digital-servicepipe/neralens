import type { IndustryRow } from '../../../shared/types/domain';

export type IndustryThreatMetricKey =
  | 'badBotsPercent'
  | 'apiPercent'
  | 'parsersPercent'
  | 'credsPercent'
  | 'scanerPercent'
  | 'paymentsCrackPercent'
  | 'smsPushBomberPercent';

export const industryThreatMetricKeys = [
  'badBotsPercent',
  'apiPercent',
  'parsersPercent',
  'credsPercent',
  'scanerPercent',
  'paymentsCrackPercent',
  'smsPushBomberPercent',
] as const satisfies readonly IndustryThreatMetricKey[];

export const industryThreatLabels: Record<IndustryThreatMetricKey, string> = {
  badBotsPercent: 'Вредоносные боты',
  apiPercent: 'API-атаки',
  parsersPercent: 'Активность парсеров',
  credsPercent: 'Подбор учётных данных',
  scanerPercent: 'Сканеры',
  paymentsCrackPercent: 'Подбор платёжных данных',
  smsPushBomberPercent: 'SMS/Push-бомберы',
};

export const industryThreatColors: Record<IndustryThreatMetricKey, string> = {
  badBotsPercent: '#F7632F',
  apiPercent: '#FF4D2E',
  parsersPercent: '#8BBFD7',
  credsPercent: '#D9BE72',
  scanerPercent: '#BFA7FF',
  paymentsCrackPercent: '#F27F92',
  smsPushBomberPercent: '#6AF0EF',
};

export const industryThreatSeries = industryThreatMetricKeys.map((key) => [
  key,
  industryThreatLabels[key],
  industryThreatColors[key],
] as const);

export function isIndustryThreatMetricKey(key: keyof IndustryRow): key is IndustryThreatMetricKey {
  return (industryThreatMetricKeys as readonly (keyof IndustryRow)[]).includes(key);
}
