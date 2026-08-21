export const formatNumber = (value: number): string => new Intl.NumberFormat('ru-RU').format(value);

export const formatCompactNumber = (value: number): string => {
  const abs = Math.abs(value);
  if (abs < 1000) return formatNumber(Math.round(value));

  const units = [
    { value: 1_000_000_000_000, label: 'трлн' },
    { value: 1_000_000_000, label: 'млрд' },
    { value: 1_000_000, label: 'млн' },
    { value: 1_000, label: 'тыс.' },
  ];
  const unit = units.find((item) => abs >= item.value) ?? units.at(-1)!;
  const scaled = value / unit.value;
  const maximumFractionDigits = Math.abs(scaled) < 10 ? 2 : Math.abs(scaled) < 100 ? 1 : 0;

  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(scaled)} ${unit.label}`;
};

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
