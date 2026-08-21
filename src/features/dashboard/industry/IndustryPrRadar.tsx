import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { CalendarDays, ChevronDown, Factory, Gauge, Search, ShieldAlert, Target, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompactNumber, formatNumber, formatPercent } from '../../../shared/lib/format';
import type { IndustryRow } from '../../../shared/types/domain';
import { totalIndustryTraffic, weightedAverage } from '../../analytics/industrySelectors';
import { industryThreatColors, industryThreatLabels, industryThreatMetricKeys, type IndustryThreatMetricKey } from './industryThreats';

const grid = 'rgba(255,255,255,.08)';
const axis = { fill: 'var(--fk-muted)', fontSize: 12 };

type MetricKey = IndustryThreatMetricKey;
type DateRange = { start: string; end: string };

export interface IndustryPrRadarState {
  selectedIndustry: string;
  selectedMetric: MetricKey | 'auto';
  currentRange: DateRange;
  previousRange: DateRange;
}

export const emptyIndustryPrRadarState: IndustryPrRadarState = {
  selectedIndustry: '',
  selectedMetric: 'auto',
  currentRange: { start: '', end: '' },
  previousRange: { start: '', end: '' },
};

const metricLabels = industryThreatLabels;
const prMetrics: MetricKey[] = [...industryThreatMetricKeys];

interface CompareWindow {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
  currentLabel: string;
  previousLabel: string;
  hasPrevious: boolean;
}

interface MetricDynamic {
  key: MetricKey;
  label: string;
  previous: number;
  current: number;
  delta: number;
  count: number;
  peakDate: string;
  peakValue: number;
}

interface IndustryAnalysis {
  industry: string;
  traffic: number;
  rows: number;
  lead: MetricDynamic;
  leadRank: number;
  peak: MetricDynamic;
  metrics: MetricDynamic[];
  chartData: Array<{ label: string; current: number; previous: number; delta: number; count: number; key: MetricKey }>;
  notes: string[];
}

export function IndustryPrRadar({
  rows,
  state,
  onStateChange,
}: {
  rows: IndustryRow[];
  state?: IndustryPrRadarState;
  onStateChange?: Dispatch<SetStateAction<IndustryPrRadarState>>;
}) {
  const dateBounds = useMemo(() => buildDateBounds(rows), [rows]);
  const industryOptions = useMemo(() => buildIndustryOptions(rows), [rows]);
  const [localState, setLocalState] = useState<IndustryPrRadarState>(() => ({
    ...emptyIndustryPrRadarState,
    currentRange: { start: dateBounds.min, end: dateBounds.max },
  }));
  const radarState = state ?? localState;
  const setRadarState = onStateChange ?? setLocalState;
  const { selectedIndustry, selectedMetric, currentRange, previousRange } = radarState;
  const setSelectedIndustry = useCallback((value: string) => {
    setRadarState((current) => ({ ...current, selectedIndustry: value }));
  }, [setRadarState]);
  const setSelectedMetric = useCallback((value: MetricKey | 'auto') => {
    setRadarState((current) => ({ ...current, selectedMetric: value }));
  }, [setRadarState]);
  const setCurrentRange = useCallback((value: SetStateAction<DateRange>) => {
    setRadarState((current) => ({
      ...current,
      currentRange: typeof value === 'function' ? value(current.currentRange) : value,
    }));
  }, [setRadarState]);
  const setPreviousRange = useCallback((value: SetStateAction<DateRange>) => {
    setRadarState((current) => ({
      ...current,
      previousRange: typeof value === 'function' ? value(current.previousRange) : value,
    }));
  }, [setRadarState]);
  const previousDateBounds = useMemo(() => buildPreviousDateBounds(dateBounds, currentRange), [currentRange, dateBounds]);
  const compareWindow = useMemo(() => buildCompareWindow(currentRange, previousRange), [currentRange, previousRange]);
  const currentRows = useMemo(() => filterRows(rows, selectedIndustry, compareWindow.currentStart, compareWindow.currentEnd), [compareWindow, rows, selectedIndustry]);
  const previousRows = useMemo(() => filterRows(rows, selectedIndustry, compareWindow.previousStart, compareWindow.previousEnd), [compareWindow, rows, selectedIndustry]);
  const analysis = useMemo(() => selectedIndustry ? buildIndustryAnalysis(selectedIndustry, currentRows, previousRows, compareWindow, selectedMetric) : null, [compareWindow, currentRows, previousRows, selectedIndustry, selectedMetric]);

  useEffect(() => {
    setCurrentRange((current) => normalizeRange({
      start: current.start || dateBounds.min,
      end: current.end || dateBounds.max,
    }, dateBounds));
  }, [dateBounds, setCurrentRange]);

  useEffect(() => {
    setPreviousRange((current) => normalizeRange(current, previousDateBounds));
  }, [previousDateBounds, setPreviousRange]);

  useEffect(() => {
    if (selectedIndustry && !industryOptions.includes(selectedIndustry)) setSelectedIndustry('');
  }, [industryOptions, selectedIndustry]);

  if (!rows.length) {
    return (
      <section className="panel p-6">
        <p className="text-2xl font-extrabold text-ink">Загрузите отраслевой файл</p>
        <p className="mt-2 text-sm text-muted">PR-радар появится после импорта отраслевого CSV/TSV с датой, отраслью, общим трафиком и долями атак.</p>
      </section>
    );
  }

  return (
    <div className="view-stack industry-pr-page">
      <section className="panel pr-hero">
        <div>
          <p className="empty-import-kicker">PR-радар</p>
          <h2>Динамика по одной отрасли</h2>
          <p>Выберите отрасль и период. Если нужен рост или падение, добавьте прошлый период. Считаются только даты, которые есть в файле.</p>
        </div>
        <span className="pr-hero-meta">Даты в файле: {dateBounds.label}</span>
      </section>

      <section className="panel pr-controls-panel">
        <div>
          <strong>Настройка анализа</strong>
          <span>Один PR-радар = одна отрасль. Отрасли между собой здесь не сравниваются.</span>
        </div>
        <div className="pr-control-grid">
          <IndustryPicker value={selectedIndustry} options={industryOptions} onChange={setSelectedIndustry} />
          <AttackPicker value={selectedMetric} metrics={analysis?.metrics ?? []} disabled={!selectedIndustry || !currentRows.length} onChange={setSelectedMetric} />
          <PeriodPicker title="Период отчёта" range={currentRange} bounds={dateBounds} onChange={setCurrentRange} required />
          <PeriodPicker title="Прошлый период" range={previousRange} bounds={previousDateBounds} onChange={setPreviousRange} />
        </div>
      </section>

      {!selectedIndustry && (
        <section className="panel pr-empty-state">
          <strong>Выберите отрасль</strong>
          <span>После выбора появятся ключевые цифры, динамика и короткие выводы по этой отрасли.</span>
        </section>
      )}

      {selectedIndustry && !currentRows.length && (
        <section className="panel pr-empty-state">
          <strong>Нет данных за выбранный период</strong>
          <span>В файле есть отрасль {selectedIndustry}, но в выбранных датах строк по ней нет.</span>
        </section>
      )}

      {analysis && currentRows.length > 0 && (
        <section className="panel pr-detail">
          <div className="pr-detail-head">
            <div>
              <p className="empty-import-kicker">Выбранная отрасль</p>
              <h2>{analysis.industry}</h2>
              <p>{compareWindow.currentLabel}{compareWindow.hasPrevious ? ` · прошлый период: ${compareWindow.previousLabel}` : ' · прошлый период не выбран'}</p>
            </div>
          </div>

          <div className="pr-fact-grid">
            <FactCard icon={<Target className="h-4 w-4" />} label="Трафик" value={formatCompactNumber(analysis.traffic)} detail={`${formatNumber(analysis.rows)} строк за период`} />
            <FactCard icon={<Gauge className="h-4 w-4" />} label={selectedMetric === 'auto' ? 'Главная атака' : 'Выбранная атака'} value={analysis.lead.label} detail={`${formatPercent(analysis.lead.current)} · ≈ ${formatCompactNumber(analysis.lead.count)}`} tone="risk" />
            <FactCard icon={<CalendarDays className="h-4 w-4" />} label="Пик за период" value={formatDate(analysis.peak.peakDate)} detail={`${analysis.peak.label}: ${formatPercent(analysis.peak.peakValue)}`} />
            <FactCard icon={<TrendingUp className="h-4 w-4" />} label="Динамика" value={compareWindow.hasPrevious ? formatPoints(analysis.lead.delta) : 'не выбрана'} detail={compareWindow.hasPrevious ? `по метрике: ${analysis.lead.label}` : 'выберите прошлый период'} tone={compareWindow.hasPrevious && analysis.lead.delta > 0 ? 'risk' : undefined} />
          </div>

          <div className="pr-section">
            <h3>Коротко для PR</h3>
            <div className="pr-evidence-list compact">
              {analysis.notes.map((item) => <p key={item}>{item}</p>)}
            </div>
          </div>

          <div className="pr-section">
            <h3>{compareWindow.hasPrevious ? 'Атаки: текущий и прошлый период' : 'Атаки за выбранный период'}</h3>
            {compareWindow.hasPrevious && <p className="pr-chart-note">Цвет закреплён за типом угрозы: насыщенная полоса — текущий период, приглушённая — прошлый период.</p>}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysis.chartData} layout="vertical" margin={{ top: 8, right: 18, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={grid} horizontal={false} />
                <XAxis type="number" tick={axis} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <YAxis dataKey="label" type="category" tick={axis} tickLine={false} width={170} interval={0} />
                <Tooltip content={<PrTooltip hasPrevious={compareWindow.hasPrevious} />} cursor={{ fill: 'rgba(255,255,255,.06)' }} />
                {compareWindow.hasPrevious && (
                  <Bar dataKey="previous" name="Прошлый период" radius={[0, 7, 7, 0]} isAnimationActive={false}>
                    {analysis.chartData.map((item) => <Cell key={item.key} fill={industryThreatColors[item.key]} fillOpacity={0.28} />)}
                  </Bar>
                )}
                <Bar dataKey="current" name="Текущий период" radius={[0, 7, 7, 0]} isAnimationActive={false}>
                  {analysis.chartData.map((item) => <Cell key={item.key} fill={industryThreatColors[item.key]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pr-method-note">
            <strong>Как читать:</strong> доли усредняются с весом по all_trafic внутри выбранной отрасли. Объёмы с ≈ считаются как трафик отрасли × доля / 100. Разница с прошлым периодом указана в процентных пунктах.
          </div>
        </section>
      )}
    </div>
  );
}

function buildIndustryAnalysis(industry: string, currentRows: IndustryRow[], previousRows: IndustryRow[], compareWindow: CompareWindow, selectedMetric: MetricKey | 'auto'): IndustryAnalysis {
  const traffic = totalIndustryTraffic(currentRows);
  const metrics = prMetrics
    .map((key) => buildMetricDynamic(currentRows, previousRows, key, traffic))
    .sort((a, b) => b.current - a.current || metricSignal(b, compareWindow.hasPrevious) - metricSignal(a, compareWindow.hasPrevious));
  const lead = (selectedMetric === 'auto' ? metrics[0] : metrics.find((item) => item.key === selectedMetric)) ?? buildMetricDynamic(currentRows, previousRows, 'badBotsPercent', traffic);
  const leadRank = Math.max(1, metrics.findIndex((item) => item.key === lead.key) + 1);
  const peak = metrics.reduce((best, item) => item.peakValue > best.peakValue ? item : best, lead);
  const chartData = metrics.map((item) => ({
    key: item.key,
    label: item.label,
    current: item.current,
    previous: item.previous,
    delta: item.delta,
    count: item.count,
  }));

  return {
    industry,
    traffic,
    rows: currentRows.length,
    lead,
    leadRank,
    peak,
    metrics,
    chartData,
    notes: buildNotes(industry, traffic, lead, leadRank, metrics.length, compareWindow, selectedMetric === 'auto'),
  };
}

function buildMetricDynamic(currentRows: IndustryRow[], previousRows: IndustryRow[], key: MetricKey, traffic: number): MetricDynamic {
  const byDate = new Map<string, IndustryRow[]>();
  currentRows.forEach((row) => {
    if (!rowDateIsKnown(row.date)) return;
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  });
  const points = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRows]) => ({ date, value: weightedAverage(dayRows, key) }));
  const peak = points.reduce((best, point) => point.value > best.value ? point : best, points[0] ?? { date: '', value: 0 });
  const current = weightedAverage(currentRows, key);
  const previous = weightedAverage(previousRows, key);

  return {
    key,
    label: metricLabels[key],
    previous,
    current,
    delta: current - previous,
    count: estimateCount(traffic, current),
    peakDate: peak.date,
    peakValue: peak.value,
  };
}

function buildNotes(industry: string, traffic: number, lead: MetricDynamic, leadRank: number, metricCount: number, compareWindow: CompareWindow, automaticMetric: boolean) {
  const sourceText = automaticMetric ? `самая заметная из ${metricCount} типов угроз` : 'выбранная угроза';
  const rankText = leadRank === 1 ? 'на первом месте среди типов угроз' : `на ${leadRank}-м месте среди типов угроз`;
  const notes = [
    `${industry}, ${compareWindow.currentLabel}: ${lead.label.toLowerCase()} — ${sourceText}. По доле в трафике это ${rankText} в выбранной отрасли.`,
    `Средняя доля за период — ${formatPercent(lead.current)} от общего трафика. Расчётный объём — ≈ ${formatCompactNumber(lead.count)} из ${formatCompactNumber(traffic)} запросов.`,
  ];
  if (compareWindow.hasPrevious) {
    const direction = lead.delta > 0 ? 'выросла' : lead.delta < 0 ? 'снизилась' : 'не изменилась';
    notes.push(`К прошлому периоду ${compareWindow.previousLabel} доля ${lead.label.toLowerCase()} ${direction}: было ${formatPercent(lead.previous)}, стало ${formatPercent(lead.current)}. Изменение — ${formatPoints(lead.delta)}.`);
    return notes;
  }
  notes.push('Прошлый период не выбран. Поэтому здесь можно использовать только факт за выбранные даты, без вывода о росте или снижении.');
  return notes;
}

function metricSignal(metric: MetricDynamic, hasPrevious: boolean) {
  return metric.current * 1.2 + metric.peakValue * .35 + (hasPrevious ? Math.max(0, metric.delta) * 1.6 : 0);
}

function IndustryPicker({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => options.filter((item) => item.toLowerCase().includes(query.toLowerCase())), [options, query]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="pr-filter-card" ref={rootRef}>
      <button className={`filter-field pr-period-trigger ${open ? 'open' : ''}`} type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className="field-icon"><Factory className="h-4 w-4" /></span>
        <span className="field-copy">
          <small>Отрасль</small>
          <strong>{value || 'Выберите отрасль'}</strong>
        </span>
        <ChevronDown className="h-4 w-4 field-chevron" />
      </button>
      {open && (
        <div className="list-popover floating-popover pr-industry-popover">
          <div className="popover-search"><Search className="h-4 w-4" /><input value={query} placeholder="Найти отрасль" onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="popover-scroll">
            {filtered.map((industry) => (
              <button key={industry} className={`check-row ${value === industry ? 'checked' : ''}`} type="button" onClick={() => { onChange(industry); setOpen(false); }}>
                <span className="radio-dot" />
                <span>{industry}</span>
              </button>
            ))}
          </div>
          <div className="popover-meta popover-footer"><span>{filtered.length} из {options.length}</span><button onClick={() => { onChange(''); setOpen(false); }}>Очистить</button></div>
        </div>
      )}
    </div>
  );
}

function AttackPicker({ value, metrics, disabled, onChange }: { value: MetricKey | 'auto'; metrics: MetricDynamic[]; disabled: boolean; onChange: (value: MetricKey | 'auto') => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selected = value === 'auto' ? null : metrics.find((item) => item.key === value);
  const label = selected ? selected.label : 'Самая заметная';

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="pr-filter-card" ref={rootRef}>
      <button className={`filter-field pr-period-trigger ${open ? 'open' : ''}`} type="button" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)}>
        <span className="field-icon"><ShieldAlert className="h-4 w-4" /></span>
        <span className="field-copy">
          <small>Тип атаки</small>
          <strong>{label}</strong>
        </span>
        <ChevronDown className="h-4 w-4 field-chevron" />
      </button>
      {open && (
        <div className="list-popover floating-popover pr-attack-popover">
          <button className={`check-row ${value === 'auto' ? 'checked' : ''}`} type="button" onClick={() => { onChange('auto'); setOpen(false); }}>
            <span className="radio-dot" />
            <span>Самая заметная</span>
            <small>автоматически</small>
          </button>
          <div className="popover-scroll">
            {metrics.map((metric) => (
              <button
                key={metric.key}
                className={`check-row color-coded pr-attack-row ${value === metric.key ? 'checked' : ''}`}
                style={{ '--bot-color': industryThreatColors[metric.key] } as CSSProperties}
                type="button"
                onClick={() => { onChange(metric.key); setOpen(false); }}
              >
                <span className="radio-dot" />
                <span>{metric.label}</span>
                <small>{formatPercent(metric.current)}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodPicker({
  title,
  range,
  bounds,
  onChange,
  required = false,
}: {
  title: string;
  range: { start: string; end: string };
  bounds: { min: string; max: string; label: string; activeDates: Record<string, number> };
  onChange: (range: { start: string; end: string }) => void;
  required?: boolean;
}) {
  const disabled = !bounds.min || !bounds.max;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(range.start || range.end || bounds.min || formatIso(new Date())));
  const activeDateSet = useMemo(() => new Set(Object.keys(bounds.activeDates)), [bounds.activeDates]);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const monthTitle = useMemo(() => formatMonthTitle(visibleMonth), [visibleMonth]);

  useEffect(() => {
    setVisibleMonth(monthStart(range.start || range.end || bounds.min || formatIso(new Date())));
  }, [bounds.min, range.end, range.start]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const clear = () => {
    if (required) onChange({ start: bounds.min, end: bounds.max });
    else onChange({ start: '', end: '' });
    setOpen(false);
  };
  const pickDate = (iso: string) => {
    if (disabled || !activeDateSet.has(iso) || iso < bounds.min || iso > bounds.max) return;
    if (!range.start || range.end) {
      onChange({ start: iso, end: '' });
      return;
    }
    onChange(normalizeRange(iso < range.start ? { start: iso, end: range.start } : { start: range.start, end: iso }, bounds));
    setOpen(false);
  };

  return (
    <div className="pr-filter-card" ref={rootRef}>
      <button className={`filter-field pr-period-trigger ${open ? 'open' : ''}`} type="button" aria-expanded={open} disabled={disabled} onClick={() => setOpen((value) => !value)}>
        <span className="field-icon"><CalendarDays className="h-4 w-4" /></span>
        <span className="field-copy">
          <small>{title}</small>
          <strong>{formatRangeLabel(range.start, range.end)}</strong>
        </span>
        <ChevronDown className="h-4 w-4 field-chevron" />
      </button>
      {open && (
        <div className="date-popover floating-popover pr-period-popover">
          <div className="date-popover-head">
            <button type="button" aria-label="Предыдущий месяц" onClick={() => setVisibleMonth((current) => addMonths(current, -1))}>‹</button>
            <strong>{monthTitle}</strong>
            <button type="button" aria-label="Следующий месяц" onClick={() => setVisibleMonth((current) => addMonths(current, 1))}>›</button>
          </div>
          <div className="calendar-grid">
            {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
            {calendarDays.map(({ date, iso, currentMonth }) => {
              const active = iso === range.start || iso === range.end;
              const inRange = Boolean(range.start && range.end && iso > range.start && iso < range.end);
              const selected = active || inRange;
              const hasData = activeDateSet.has(iso);
              const unavailable = disabled || !hasData || iso < bounds.min || iso > bounds.max;
              return (
                <button
                  className={`calendar-day ${selected ? 'selected' : ''} ${hasData ? 'has-data' : ''} ${currentMonth ? '' : 'outside'} ${unavailable ? 'disabled' : ''}`}
                  key={iso}
                  type="button"
                  title={formatLongDate(date)}
                  aria-label={formatLongDate(date)}
                  disabled={unavailable}
                  onClick={() => pickDate(iso)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="calendar-legend" aria-hidden="true">
            <span><i className="legend-selected" />Выбрано</span>
            <span><i className="legend-data" />Есть данные</span>
            <span><i className="legend-muted" />Нет данных</span>
          </div>
          <div className="quick-range">
            <button type="button" onClick={clear}>{required ? 'Весь период файла' : 'Очистить'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildDateBounds(rows: IndustryRow[]) {
  const dates = rows.map((row) => row.date).filter((date) => rowDateIsKnown(date)).sort();
  const min = dates[0] ?? '';
  const max = dates.at(-1) ?? '';
  return {
    min,
    max,
    label: min && max ? formatRangeLabel(min, max) : 'нет дат',
    activeDates: rows.reduce<Record<string, number>>((acc, row) => {
      if (rowDateIsKnown(row.date)) acc[row.date] = (acc[row.date] ?? 0) + row.allTrafic;
      return acc;
    }, {}),
  };
}

function buildPreviousDateBounds(bounds: ReturnType<typeof buildDateBounds>, currentRange: DateRange) {
  const current = normalizeDateOrder(currentRange);
  const currentStart = current.start || bounds.min;
  if (!bounds.min || !bounds.max || !currentStart) return { ...bounds, min: '', max: '', label: 'нет дат' };
  const previousMax = minIsoDate(bounds.max, shiftIsoDate(currentStart, -1));
  if (!previousMax || previousMax < bounds.min) return { ...bounds, min: '', max: '', label: 'нет доступных дат' };
  return { ...bounds, max: previousMax, label: formatRangeLabel(bounds.min, previousMax) };
}

function buildIndustryOptions(rows: IndustryRow[]) {
  return Array.from(new Set(rows.map((row) => row.industry))).sort((a, b) => a.localeCompare(b, 'ru'));
}

function filterRows(rows: IndustryRow[], industry: string, start: string, end: string) {
  if (!industry || !start || !end) return [];
  return rows.filter((row) => row.industry === industry && rowDateIsKnown(row.date) && row.date >= start && row.date <= end);
}

function normalizeRange(range: { start: string; end: string }, bounds: { min: string; max: string }) {
  if (!bounds.min || !bounds.max) return { start: '', end: '' };
  const start = clampDate(range.start, bounds);
  const end = clampDate(range.end, bounds);
  return normalizeDateOrder({ start, end });
}

function normalizeDateOrder(range: { start: string; end: string }) {
  if (range.start && range.end && range.start > range.end) return { start: range.end, end: range.start };
  return range;
}

function clampDate(value: string, bounds: { min: string; max: string }) {
  if (!value) return '';
  if (bounds.min && value < bounds.min) return bounds.min;
  if (bounds.max && value > bounds.max) return bounds.max;
  return value;
}

function buildCompareWindow(currentRange: { start: string; end: string }, previousRange: { start: string; end: string }): CompareWindow {
  const current = normalizeDateOrder(currentRange);
  const previous = normalizeDateOrder(previousRange);
  const currentEnd = current.end || current.start;
  const previousEnd = previous.end || previous.start;
  const hasPrevious = Boolean(previous.start && previousEnd);
  return {
    currentStart: current.start,
    currentEnd,
    previousStart: previous.start,
    previousEnd,
    currentLabel: formatRangeLabel(current.start, currentEnd),
    previousLabel: hasPrevious ? formatRangeLabel(previous.start, previousEnd) : 'не выбран',
    hasPrevious,
  };
}

function rowDateIsKnown(value: string) {
  return Boolean(value && value !== 'Unknown');
}

function monthStart(iso: string) {
  const [year, month] = iso.split('-').map(Number);
  if (!year || !month) return new Date();
  return new Date(year, month - 1, 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function shiftIsoDate(iso: string, days: number) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatIso(date);
}

function minIsoDate(first: string, second: string) {
  if (!first) return second;
  if (!second) return first;
  return first < second ? first : second;
}

function formatIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonthTitle(date: Date) {
  const title = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date);
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}`;
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const firstCell = new Date(month.getFullYear(), month.getMonth(), 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index);
    return {
      date,
      iso: formatIso(date),
      currentMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function formatRangeLabel(start: string, end: string) {
  if (!start || !end) return 'не выбран';
  return start === end ? formatDate(start) : `${formatDate(start)} - ${formatDate(end)}`;
}

function estimateCount(traffic: number, percent: number) {
  return Math.round((traffic * percent) / 100);
}

function formatPoints(value: number) {
  if (Math.abs(value) < 0.05) return '0 п.п.';
  const sign = value > 0 ? '+' : '';
  const formatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: Math.abs(value) < 10 ? 1 : 0 }).format(value);
  return `${sign}${formatted} п.п.`;
}

function formatDate(value: string) {
  if (!value) return 'нет даты';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function FactCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone?: 'risk' }) {
  return (
    <div className={`pr-fact-card ${tone ?? ''}`}>
      <span aria-hidden="true">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{detail}</em>
    </div>
  );
}

function PrTooltip({ active, payload, hasPrevious }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const color = industryThreatColors[item.key as MetricKey];
  return (
    <div className="chart-tooltip pr-compare-tooltip">
      <p>{item.label}</p>
      <div className="pr-tooltip-line">
        <span><i className="current" style={{ backgroundColor: color }} />Текущий период</span>
        <strong>{formatPercent(item.current)}</strong>
      </div>
      {hasPrevious && (
        <div className="pr-tooltip-line">
          <span><i className="previous" style={{ backgroundColor: color }} />Прошлый период</span>
          <strong>{formatPercent(item.previous)}</strong>
        </div>
      )}
      {hasPrevious && (
        <div className="pr-tooltip-line muted">
          <span>Изменение</span>
          <strong>{formatPoints(item.delta)}</strong>
        </div>
      )}
    </div>
  );
}
