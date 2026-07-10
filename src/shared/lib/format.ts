export const formatNumber = (value: number): string => new Intl.NumberFormat('ru-RU').format(value);

export const formatPercent = (value: number): string =>
  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)}%`;

export function truncateMiddle(value: string, max = 42): string {
  if (value.length <= max) return value;
  const left = Math.ceil((max - 1) * 0.58);
  return `${value.slice(0, left)}…${value.slice(value.length - (max - left - 1))}`;
}

export function pluralFiles(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'файл';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'файла';
  return 'файлов';
}
