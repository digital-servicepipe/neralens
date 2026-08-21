import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, CalendarDays, ChevronDown, ChevronsUpDown, Factory, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { Panel } from '../../../shared/ui/Panel';
import { formatCompactNumber, formatNumber, formatPercent } from '../../../shared/lib/format';
import type { IndustryRow } from '../../../shared/types/domain';
import { buildIndustryDailySeries, buildIndustrySummaries, totalIndustryTraffic, weightedAverage, type IndustrySummary } from '../../analytics/industrySelectors';

const axis = { fill: 'var(--fk-muted)', fontSize: 12 };
const grid = 'rgba(255,255,255,.08)';
const chartBarCursor = { fill: 'rgba(255,255,255,.075)' };
const chartLineCursor = { stroke: 'rgba(255,255,255,.18)', strokeWidth: 1 };

const brandColors = {
  turquoise: '#01cdcb',
  turquoiseSoft: '#6AF0EF',
  turquoisePale: '#ADFBFA',
  tealDeep: '#01ACAB',
  neutralBlue: '#8BBFD7',
  gray: '#ACACAC',
  grayDark: '#808080',
  orangeSoft: '#FFB499',
  orange: '#F7632F',
  orangeDeep: '#E74A13',
} as const;

type ColoredIndustryMetric =
  | 'humansPercent'
  | 'goodBotsPercent'
  | 'ruPercent'
  | 'foreignPercent'
  | 'botsPercent'
  | 'desktopBotsPercent'
  | 'mobileBotsPercent'
  | 'unknownBotsPercent'
  | 'dataCentersPercent'
  | 'strongBotsPercent'
  | 'badBotsPercent'
  | 'apiPercent'
  | 'parsersPercent'
  | 'credsPercent'
  | 'scanerPercent'
  | 'paymentsCrackPercent'
  | 'smsPushBomberPercent';

const industryMetricColors: Record<ColoredIndustryMetric, string> = {
  humansPercent: brandColors.turquoise,
  goodBotsPercent: brandColors.turquoisePale,
  ruPercent: brandColors.turquoiseSoft,
  foreignPercent: brandColors.neutralBlue,
  botsPercent: brandColors.tealDeep,
  desktopBotsPercent: brandColors.neutralBlue,
  mobileBotsPercent: brandColors.turquoise,
  unknownBotsPercent: brandColors.grayDark,
  dataCentersPercent: brandColors.gray,
  strongBotsPercent: brandColors.orangeDeep,
  badBotsPercent: brandColors.orange,
  apiPercent: brandColors.orange,
  parsersPercent: brandColors.orangeSoft,
  credsPercent: brandColors.orangeDeep,
  scanerPercent: brandColors.orangeSoft,
  paymentsCrackPercent: brandColors.orangeDeep,
  smsPushBomberPercent: brandColors.orange,
};

const industryRankColors = [
  brandColors.turquoise,
  brandColors.turquoiseSoft,
  brandColors.turquoisePale,
  brandColors.neutralBlue,
  brandColors.tealDeep,
  brandColors.gray,
  brandColors.grayDark,
];

const attackSeries = [
  ['apiPercent', 'API-атаки', industryMetricColors.apiPercent],
  ['parsersPercent', 'Активность парсеров', industryMetricColors.parsersPercent],
  ['credsPercent', 'Подбор учётных данных', industryMetricColors.credsPercent],
  ['scanerPercent', 'Сканеры', industryMetricColors.scanerPercent],
  ['paymentsCrackPercent', 'Подбор платёжных данных', industryMetricColors.paymentsCrackPercent],
  ['smsPushBomberPercent', 'SMS/Push-бомберы', industryMetricColors.smsPushBomberPercent],
] as const;

interface MetricDatum {
  name: string;
  value: number;
  count: number;
  color: string;
}

const industryFieldLabels = {
  industry: 'Отрасль компании',
  date: 'Дата',
  allTrafic: 'Общее количество трафика',
  badBotsPercent: 'Вредоносные боты',
  goodBotsPercent: 'Обеленные боты (Яндекс, Гугл...)',
  humansPercent: 'Человеческий трафик',
  botsPercent: 'Обычные боты',
  strongBotsPercent: 'Продвинутые боты',
  mobileBotsPercent: 'Мобильные боты',
  desktopBotsPercent: 'Десктопные боты',
  unknownBotsPercent: 'Боты с неизвестным типом устройства',
  dataCentersPercent: 'Трафик из дата-центров',
  apiPercent: 'API-атаки',
  ruPercent: 'Трафик из России',
  foreignPercent: 'Иностранный трафик',
  parsersPercent: 'Активность парсеров',
  credsPercent: 'Подбор учётных данных',
  scanerPercent: 'Сканеры',
  paymentsCrackPercent: 'Подбор платёжных данных',
  smsPushBomberPercent: 'SMS/Push-бомберы',
} satisfies Record<keyof IndustryRow, string>;

export interface IndustryFiltersState {
  dateFrom: string;
  dateTo: string;
  industries: string[];
}

export const emptyIndustryFilters: IndustryFiltersState = {
  dateFrom: '',
  dateTo: '',
  industries: [],
};

export function IndustryDashboard({ rows }: { rows: IndustryRow[] }) {
  const [filters, setFilters] = useState<IndustryFiltersState>(emptyIndustryFilters);
  const filteredRows = useMemo(() => filterIndustryRows(rows, filters), [filters, rows]);
  const summaries = useMemo(() => buildIndustrySummaries(filteredRows), [filteredRows]);
  const daily = useMemo(() => buildIndustryDailySeries(filteredRows), [filteredRows]);
  const totalTraffic = useMemo(() => totalIndustryTraffic(filteredRows), [filteredRows]);
  const activeDates = new Set(filteredRows.map((row) => row.date).filter((date) => date !== 'Unknown')).size;
  const filterOptions = useMemo(() => buildIndustryFilterOptions(rows), [rows]);
  const trafficMix = useMemo(() => buildMetricBars(filteredRows, [
    ['humansPercent', industryFieldLabels.humansPercent],
    ['badBotsPercent', industryFieldLabels.badBotsPercent],
    ['goodBotsPercent', industryFieldLabels.goodBotsPercent],
  ]), [filteredRows]);
  const botProfile = useMemo(() => buildMetricBars(filteredRows, [
    ['strongBotsPercent', industryFieldLabels.strongBotsPercent],
    ['botsPercent', industryFieldLabels.botsPercent],
    ['desktopBotsPercent', industryFieldLabels.desktopBotsPercent],
    ['mobileBotsPercent', industryFieldLabels.mobileBotsPercent],
    ['unknownBotsPercent', industryFieldLabels.unknownBotsPercent],
  ]), [filteredRows]);
  const attackMetrics = useMemo(() => buildMetricBars(filteredRows, [
    ['apiPercent', industryFieldLabels.apiPercent],
    ['parsersPercent', industryFieldLabels.parsersPercent],
    ['credsPercent', industryFieldLabels.credsPercent],
    ['scanerPercent', industryFieldLabels.scanerPercent],
    ['paymentsCrackPercent', industryFieldLabels.paymentsCrackPercent],
    ['smsPushBomberPercent', industryFieldLabels.smsPushBomberPercent],
  ]).sort((a, b) => b.value - a.value), [filteredRows]);
  const geoInfraMetrics = useMemo(() => buildMetricBars(filteredRows, [
    ['ruPercent', industryFieldLabels.ruPercent],
    ['foreignPercent', industryFieldLabels.foreignPercent],
    ['dataCentersPercent', industryFieldLabels.dataCentersPercent],
  ]), [filteredRows]);
  const industryBadBots = summaries
    .slice()
    .sort((a, b) => b.badBotsPercent - a.badBotsPercent)
    .slice(0, 12)
    .map((item, index) => ({
      name: item.industry,
      value: item.badBotsPercent,
      traffic: item.totalTraffic,
      count: estimateMetricCount(item.totalTraffic, item.badBotsPercent),
      color: industryRankColors[index % industryRankColors.length],
    }));
  const attackAxisTicks = useMemo(() => buildPercentTicks(attackMetrics.map((item) => item.value)), [attackMetrics]);
  const botAxisTicks = useMemo(() => buildPercentTicks(botProfile.map((item) => item.value)), [botProfile]);
  const industryAxisTicks = useMemo(() => buildPercentTicks(industryBadBots.map((item) => item.value)), [industryBadBots]);

  if (!rows.length) {
    return (
      <section className="panel p-6">
        <div className="drop-zone">
          <p className="text-2xl font-extrabold text-ink">Загрузите отраслевой CSV/TSV</p>
          <p className="mt-2 text-sm text-muted">В настройках выберите отраслевой режим и добавьте файл с колонками industry, date, all_trafic и процентными метриками.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="view-stack industry-dashboard">
      <IndustryFilters filters={filters} options={filterOptions} onChange={setFilters} onReset={() => setFilters(emptyIndustryFilters)} />

      <section className="kpi-grid grid gap-3">
        <IndustryKpi label="ТРАФИК" value={formatNumber(totalTraffic)} hint="общий объём в срезе" />
        <IndustryKpi label="ОТРАСЛИ" value={formatNumber(summaries.length)} hint="уникальные отрасли" />
        <IndustryKpi label="ДНИ" value={formatNumber(activeDates)} hint="период наблюдений" />
        <IndustryKpi label="ЧЕЛОВЕЧЕСКИЙ ТРАФИК" value={formatPercent(weightedAverage(filteredRows, 'humansPercent'))} hint="доля в общем трафике" />
        <IndustryKpi label="ВРЕДОНОСНЫЕ БОТЫ" value={formatPercent(weightedAverage(filteredRows, 'badBotsPercent'))} hint="доля в общем трафике" />
        <IndustryKpi label="ПАРСЕРЫ" value={formatPercent(weightedAverage(filteredRows, 'parsersPercent'))} hint="доля в общем трафике" />
      </section>

      <section className="industry-main-grid grid gap-3">
        <Panel title="Динамика ключевых атак" subtitle="Проценты от всего трафика по дням" bodyClassName="height-chart">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={daily} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
              <defs>
                {attackSeries.map(([key, , color]) => (
                  <linearGradient key={key} id={`industry-${key}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.34} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: grid }} />
              <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
              <Tooltip content={<PercentTooltip />} cursor={chartLineCursor} />
              {attackSeries.map(([key, name, color]) => (
                <Area key={key} dataKey={key} name={name} type="monotone" stroke={color} fill={`url(#industry-${key})`} strokeWidth={2.25} isAnimationActive={false} dot={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <IndustryBar title={industryFieldLabels.badBotsPercent} subtitle="Проценты от всего трафика по отраслям компании" data={industryBadBots} ticks={industryAxisTicks} />
      </section>

      <section className="industry-detail-grid grid gap-3">
        <DonutPanel title="Состав трафика" subtitle="Проценты от всего трафика" data={trafficMix} />
        <IndustryBar title="Профиль ботов" subtitle="Проценты внутри всего бот-трафика" data={botProfile} height={260} ticks={botAxisTicks} />
        <IndustryBar title="Типы атак" subtitle="Проценты от всего трафика" data={attackMetrics} height={300} ticks={attackAxisTicks} />
        <DonutPanel title="География и инфраструктура" subtitle="Проценты от всего трафика" data={geoInfraMetrics} />
        <IndustryTable summaries={summaries} />
      </section>
    </div>
  );
}

export function filterIndustryRows(rows: IndustryRow[], filters: IndustryFiltersState) {
  const industries = new Set(filters.industries);
  return rows.filter((row) => {
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo && row.date > filters.dateTo) return false;
    if (industries.size && !industries.has(row.industry)) return false;
    return true;
  });
}

export function buildIndustryFilterOptions(rows: IndustryRow[]) {
  const activeDates: Record<string, number> = {};
  const industries = new Set<string>();
  rows.forEach((row) => {
    industries.add(row.industry);
    if (row.date && row.date !== 'Unknown') activeDates[row.date] = (activeDates[row.date] ?? 0) + row.allTrafic;
  });
  return {
    activeDates,
    industries: Array.from(industries).sort((a, b) => a.localeCompare(b, 'ru')),
  };
}

function buildMetricBars(rows: IndustryRow[], items: Array<[keyof IndustryRow, string]>) {
  const traffic = totalIndustryTraffic(rows);
  return items.map(([key, name]) => {
    const value = weightedAverage(rows, key);
    return {
      name,
      value,
      count: estimateMetricCount(traffic, value),
      color: industryMetricColors[key as ColoredIndustryMetric] ?? brandColors.turquoise,
    };
  });
}

function estimateMetricCount(traffic: number, percent: number) {
  return Math.round((traffic * percent) / 100);
}

function IndustryKpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="kpi-card panel">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      <p className="kpi-hint">{hint}</p>
    </article>
  );
}

type IndustryPopover = 'date' | 'industries' | null;
type IndustryPopoverKey = Exclude<IndustryPopover, null>;

export function IndustryFilters({
  filters,
  options,
  onChange,
  onReset,
}: {
  filters: IndustryFiltersState;
  options: ReturnType<typeof buildIndustryFilterOptions>;
  onChange: React.Dispatch<React.SetStateAction<IndustryFiltersState>>;
  onReset: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const datePopoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<IndustryPopoverKey, HTMLButtonElement | null>>({ date: null, industries: null });
  const wheelAtRef = useRef(0);
  const datePopoverWasOpenRef = useRef(false);
  const [popover, setPopover] = useState<IndustryPopover>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const [industryQuery, setIndustryQuery] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(filters.dateFrom || latestActiveDate(options.activeDates) || formatIso(new Date())));
  const activeDateSet = useMemo(() => new Set(Object.keys(options.activeDates)), [options.activeDates]);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const monthTitle = useMemo(() => formatMonthTitle(visibleMonth), [visibleMonth]);
  const industryOptions = useMemo(
    () => options.industries.filter((industry) => industry.toLowerCase().includes(industryQuery.toLowerCase())),
    [industryQuery, options.industries],
  );
  const activeCount = [filters.dateFrom || filters.dateTo, filters.industries.length].filter(Boolean).length;

  useEffect(() => {
    if (popover !== 'date') {
      datePopoverWasOpenRef.current = false;
      return;
    }
    if (datePopoverWasOpenRef.current) return;
    datePopoverWasOpenRef.current = true;
    setVisibleMonth(monthStart(filters.dateFrom || filters.dateTo || latestActiveDate(options.activeDates) || formatIso(new Date())));
  }, [filters.dateFrom, filters.dateTo, options.activeDates, popover]);

  const setTriggerRef = useCallback((key: IndustryPopoverKey) => (node: HTMLButtonElement | null) => {
    triggerRefs.current[key] = node;
  }, []);

  const updatePopoverPosition = useCallback(() => {
    if (!popover || !panelRef.current) return;
    const panelRect = panelRef.current.getBoundingClientRect();
    const triggerRect = triggerRefs.current[popover]?.getBoundingClientRect();
    if (!triggerRect) return;
    const preferredWidth = popover === 'date' ? 312 : Math.max(320, Math.round(triggerRect.width));
    const width = Math.min(preferredWidth, Math.max(260, Math.round(panelRect.width - 16)));
    const rawLeft = Math.round(triggerRect.left - panelRect.left);
    const maxLeft = Math.max(8, Math.round(panelRect.width - width - 8));
    const left = Math.max(8, Math.min(rawLeft, maxLeft));
    const top = Math.round(triggerRect.bottom - panelRect.top + 8);
    const originX = Math.round(triggerRect.left - panelRect.left + triggerRect.width / 2 - left);
    setPopoverStyle({ left, top, width, transformOrigin: `${originX}px top` });
  }, [popover]);

  useLayoutEffect(() => {
    updatePopoverPosition();
  }, [updatePopoverPosition]);

  useEffect(() => {
    if (!popover) return;
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [popover, updatePopoverPosition]);

  useEffect(() => {
    if (!popover) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      setPopover(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopover(null);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [popover]);

  const pickDate = (iso: string) => {
    onChange((current) => {
      if (!current.dateFrom || current.dateTo) return { ...current, dateFrom: iso, dateTo: '' };
      return iso < current.dateFrom ? { ...current, dateFrom: iso, dateTo: current.dateFrom } : { ...current, dateTo: iso };
    });
  };

  const setQuickRange = (days: number) => {
    const end = filters.dateTo || filters.dateFrom || latestActiveDate(options.activeDates) || formatIso(endOfMonth(visibleMonth));
    const start = shiftDate(end, -(days - 1));
    onChange((current) => ({ ...current, dateFrom: start, dateTo: end }));
  };

  const switchMonthByWheel = useCallback((deltaY: number) => {
    if (Math.abs(deltaY) < 8) return;
    const now = performance.now();
    if (now - wheelAtRef.current < 180) return;
    wheelAtRef.current = now;
    setVisibleMonth((current) => addMonths(current, deltaY > 0 ? 1 : -1));
  }, []);

  useEffect(() => {
    if (popover !== 'date') return;
    const node = datePopoverRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      switchMonthByWheel(event.deltaY);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [popover, switchMonthByWheel]);

  return (
    <section className="filters-panel panel" ref={panelRef}>
      <div className="filters-title-row">
        <div className="filters-title">
          <span className="filters-title-icon"><SlidersHorizontal className="h-4 w-4" /></span>
          <strong>Фильтры</strong>
          <span className="active-pill">{activeCount} активных</span>
        </div>
      </div>
      <div className="filter-fields industry-filter-fields">
        <FilterButton ref={setTriggerRef('date')} icon={<CalendarDays className="h-4 w-4" />} label="Дата" value={dateLabel(filters)} open={popover === 'date'} onClick={() => setPopover(popover === 'date' ? null : 'date')} />
        <FilterButton ref={setTriggerRef('industries')} icon={<Factory className="h-4 w-4" />} label="Отрасли" value={filters.industries.length ? `${filters.industries.length} выбрано` : 'Все'} badge={filters.industries.length || undefined} open={popover === 'industries'} onClick={() => setPopover(popover === 'industries' ? null : 'industries')} wide />
        <button className="filter-reset" onClick={onReset}><RotateCcw className="h-4 w-4" />Сброс</button>
      </div>

      {popover === 'date' && (
        <div className="date-popover floating-popover" ref={datePopoverRef} style={popoverStyle}>
          <div className="date-popover-head">
            <button type="button" aria-label="Предыдущий месяц" onClick={() => setVisibleMonth((current) => addMonths(current, -1))}>‹</button>
            <strong>{monthTitle}</strong>
            <button type="button" aria-label="Следующий месяц" onClick={() => setVisibleMonth((current) => addMonths(current, 1))}>›</button>
          </div>
          <div className="calendar-grid">
            {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
            {calendarDays.map(({ date, iso, currentMonth }) => {
              const active = iso === filters.dateFrom || iso === filters.dateTo;
              const inRange = Boolean(filters.dateFrom && filters.dateTo && iso > filters.dateFrom && iso < filters.dateTo);
              const selected = active || inRange;
              const hasData = activeDateSet.has(iso);
              return (
                <button className={`calendar-day ${selected ? 'selected' : ''} ${hasData ? 'has-data' : ''} ${currentMonth ? '' : 'outside'}`} key={iso} type="button" title={formatLongDate(date)} aria-label={formatLongDate(date)} onClick={() => pickDate(iso)}>
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
            <button type="button" onClick={() => setQuickRange(7)}>7 дней</button>
            <button type="button" onClick={() => setQuickRange(30)}>30 дней</button>
            <button type="button" onClick={() => onChange((current) => ({ ...current, dateFrom: '', dateTo: '' }))}>Очистить</button>
          </div>
        </div>
      )}

      {popover === 'industries' && (
        <ListPopover className="with-footer" style={popoverStyle}>
          <div className="popover-search"><Search className="h-4 w-4" /><input value={industryQuery} placeholder="Найти отрасль" onChange={(event) => setIndustryQuery(event.target.value)} /></div>
          <div className="popover-scroll">
            {industryOptions.map((industry) => (
              <CheckRow key={industry} label={industry} checked={filters.industries.includes(industry)} onClick={() => onChange((current) => ({ ...current, industries: toggle(current.industries, industry) }))} />
            ))}
          </div>
          <div className="popover-meta popover-footer"><span>{industryOptions.length} из {options.industries.length}</span><button onClick={() => onChange((current) => ({ ...current, industries: [] }))}>Очистить</button></div>
        </ListPopover>
      )}
    </section>
  );
}

const FilterButton = forwardRef<HTMLButtonElement, { icon: React.ReactNode; label: string; value: string; badge?: number; wide?: boolean; open: boolean; onClick: () => void }>(function FilterButton({ icon, label, value, badge, wide, open, onClick }, ref) {
  return (
    <button ref={ref} className={`filter-field ${wide ? 'wide' : ''} ${open ? 'open' : ''}`} aria-expanded={open} onClick={onClick}>
      <span className="field-icon">{icon}</span>
      <span className="field-copy"><small>{label}</small><strong>{value}</strong></span>
      {badge ? <span className="field-badge">{badge}</span> : <ChevronDown className="field-chevron h-4 w-4" />}
    </button>
  );
});

function ListPopover({ children, className = '', style }: React.PropsWithChildren<{ className?: string; style?: CSSProperties }>) {
  return <div className={`floating-popover list-popover ${className}`} style={style}>{children}</div>;
}

function CheckRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button className={`check-row ${checked ? 'checked' : ''}`} onClick={onClick}>
      <span className="radio-dot" />
      <span>{label}</span>
    </button>
  );
}

function PercentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const visibleItems = payload
    .filter((item: any) => Number(item.value) > 0)
    .sort((a: any, b: any) => Number(b.value) - Number(a.value));
  if (!visibleItems.length) return null;

  return (
    <div className="chart-tooltip industry-percent-tooltip">
      <p>{label}</p>
      {visibleItems.map((item: any, index: number) => (
        <div key={`${item.name}-${index}`} className="chart-tooltip-row industry-tooltip-row">
          <span className="chart-tooltip-label"><i style={{ backgroundColor: item.stroke || item.fill }} />{item.name}</span>
          <span className="industry-tooltip-values">
            <strong>≈ {formatCompactNumber(estimateMetricCount(Number(item.payload?.traffic ?? 0), Number(item.value)))}</strong>
            <small>Доля {formatPercent(Number(item.value))}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function BarPercentTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = item.payload?.name ?? item.name;
  const color = item.payload?.color || item.fill || brandColors.turquoise;

  return (
    <div className="chart-tooltip industry-bar-tooltip">
      <div className="chart-tooltip-row industry-tooltip-row">
        <span className="chart-tooltip-label"><i style={{ backgroundColor: color }} />{name}</span>
        <span className="industry-tooltip-values">
          <strong>≈ {formatCompactNumber(Number(item.payload?.count ?? 0))}</strong>
          <small>Доля {formatPercent(Number(item.value))}</small>
        </span>
      </div>
    </div>
  );
}

function DonutPanel({ title, subtitle, data }: { title: string; subtitle: string; data: MetricDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Panel title={title} subtitle={subtitle} bodyClassName="industry-donut-body">
      <div className="industry-donut-chart">
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="rgba(31,32,34,.92)" strokeWidth={2} isAnimationActive={false}>
              {data.map((item) => <Cell key={item.name} fill={item.color} />)}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="industry-donut-legend">
        {data.map((item) => (
          <div className="industry-donut-legend-row" key={item.name}>
            <span><i style={{ backgroundColor: item.color }} />{item.name}</span>
            <strong>{formatPercent(item.value)}<small>≈ {formatCompactNumber(item.count)}</small></strong>
          </div>
        ))}
        {total <= 0 && <p className="settings-empty">Нет данных для отображения.</p>}
      </div>
    </Panel>
  );
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const color = item.payload?.color || item.fill || brandColors.turquoise;

  return (
    <div className="chart-tooltip industry-donut-tooltip">
      <div className="chart-tooltip-row industry-tooltip-row">
        <span className="chart-tooltip-label"><i style={{ backgroundColor: color }} />{item.name}</span>
        <span className="industry-tooltip-values">
          <strong>≈ {formatCompactNumber(Number(item.payload?.count ?? 0))}</strong>
          <small>Доля {formatPercent(Number(item.value))}</small>
        </span>
      </div>
    </div>
  );
}

function IndustryBar({ title, subtitle, data, height = 320, ticks }: { title: string; subtitle: string; data: MetricDatum[]; height?: number; ticks: number[] }) {
  const domainMax = ticks.at(-1) ?? 100;
  return (
    <Panel title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={grid} horizontal={false} />
          <XAxis type="number" tick={axis} axisLine={false} domain={[0, domainMax]} ticks={ticks} tickFormatter={(value) => `${value}%`} />
          <YAxis dataKey="name" type="category" tick={<SingleLineYAxisTick />} tickLine={false} width={220} interval={0} />
          <Tooltip content={<BarPercentTooltip />} cursor={chartBarCursor} />
          <Bar dataKey="value" name={title} radius={[0, 8, 8, 0]} isAnimationActive={false}>
            {data.map((item) => <Cell key={item.name} fill={item.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

function SingleLineYAxisTick({ x, y, payload }: any) {
  const label = String(payload?.value ?? '');
  return (
    <text x={x} y={y} dy={4} fill="var(--fk-muted)" fontSize={12} textAnchor="end">
      <title>{label}</title>
      {label}
    </text>
  );
}

function buildPercentTicks(values: number[]) {
  const maxValue = Math.max(...values, 0);
  if (maxValue <= 5) return [0, 1, 2, 3, 4, 5];
  if (maxValue <= 10) return [0, 2, 4, 6, 8, 10];
  if (maxValue <= 25) return [0, 5, 10, 15, 20, 25];
  if (maxValue <= 50) return [0, 10, 20, 30, 40, 50];
  return [0, 20, 40, 60, 80, 100];
}

function toggle<T extends string>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function dateLabel(filters: IndustryFiltersState) {
  if (filters.dateFrom && filters.dateTo) return `${shortDate(filters.dateFrom)} - ${shortDate(filters.dateTo)}`;
  if (filters.dateFrom) return `с ${shortDate(filters.dateFrom)}`;
  if (filters.dateTo) return `до ${shortDate(filters.dateTo)}`;
  return 'Все даты';
}

function shortDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year.slice(2)}`;
}

function monthStart(iso: string) {
  const [year, month] = iso.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function shiftDate(iso: string, amount: number) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day + amount);
  return formatIso(date);
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

function latestActiveDate(activeDates: Record<string, number>) {
  return Object.keys(activeDates).sort().at(-1) ?? '';
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

type IndustrySortKey = 'industry' | 'totalTraffic' | 'humansPercent' | 'badBotsPercent' | 'goodBotsPercent' | 'apiPercent' | 'parsersPercent' | 'credsPercent' | 'scanerPercent' | 'paymentsCrackPercent' | 'smsPushBomberPercent';
type IndustrySort = { key: IndustrySortKey; direction: 'asc' | 'desc' } | null;

const industryTableColumns: Array<{ key: IndustrySortKey; label: string; render: (item: IndustrySummary) => ReactNode; numeric?: boolean }> = [
  { key: 'industry', label: industryFieldLabels.industry, render: (item) => item.industry },
  { key: 'totalTraffic', label: industryFieldLabels.allTrafic, render: (item) => formatNumber(item.totalTraffic), numeric: true },
  { key: 'humansPercent', label: industryFieldLabels.humansPercent, render: (item) => <MetricValue traffic={item.totalTraffic} percent={item.humansPercent} />, numeric: true },
  { key: 'badBotsPercent', label: industryFieldLabels.badBotsPercent, render: (item) => <MetricValue traffic={item.totalTraffic} percent={item.badBotsPercent} />, numeric: true },
  { key: 'goodBotsPercent', label: industryFieldLabels.goodBotsPercent, render: (item) => <MetricValue traffic={item.totalTraffic} percent={item.goodBotsPercent} />, numeric: true },
  { key: 'apiPercent', label: industryFieldLabels.apiPercent, render: (item) => <MetricValue traffic={item.totalTraffic} percent={item.apiPercent} />, numeric: true },
  { key: 'parsersPercent', label: industryFieldLabels.parsersPercent, render: (item) => <MetricValue traffic={item.totalTraffic} percent={item.parsersPercent} />, numeric: true },
  { key: 'credsPercent', label: industryFieldLabels.credsPercent, render: (item) => <MetricValue traffic={item.totalTraffic} percent={item.credsPercent} />, numeric: true },
  { key: 'scanerPercent', label: industryFieldLabels.scanerPercent, render: (item) => <MetricValue traffic={item.totalTraffic} percent={item.scanerPercent} />, numeric: true },
  { key: 'paymentsCrackPercent', label: industryFieldLabels.paymentsCrackPercent, render: (item) => <MetricValue traffic={item.totalTraffic} percent={item.paymentsCrackPercent} />, numeric: true },
  { key: 'smsPushBomberPercent', label: industryFieldLabels.smsPushBomberPercent, render: (item) => <MetricValue traffic={item.totalTraffic} percent={item.smsPushBomberPercent} />, numeric: true },
];

function MetricValue({ traffic, percent }: { traffic: number; percent: number }) {
  return (
    <span className="industry-metric-value">
      <strong>{formatPercent(percent)}</strong>
      <small>≈ {formatCompactNumber(estimateMetricCount(traffic, percent))}</small>
    </span>
  );
}

function IndustryTable({ summaries }: { summaries: IndustrySummary[] }) {
  const [sort, setSort] = useState<IndustrySort>(null);
  const visibleSummaries = useMemo(() => sortIndustrySummaries(summaries, sort), [sort, summaries]);
  const toggleSort = (key: IndustrySortKey) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'desc' };
      if (current.direction === 'desc') return { key, direction: 'asc' };
      return null;
    });
  };

  return (
    <article className="panel industry-table-panel">
      <div className="section-heading">
        <div>
          <h2>Отраслевой отчет</h2>
          <p>Агрегированные метрики по каждой отрасли. Клик по заголовку сортирует столбец.</p>
        </div>
      </div>
      <div className="industry-table-wrap">
        <table className="industry-table">
          <thead>
            <tr>
              {industryTableColumns.map((column) => (
                <th key={column.key}>
                  <button className={`industry-sort-button ${sort?.key === column.key ? 'active' : ''}`} type="button" onClick={() => toggleSort(column.key)} title="Сортировать">
                    <span>{column.label}</span>
                    <span className="industry-sort-icon" aria-hidden="true">
                      {sort?.key === column.key ? (sort.direction === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4" />}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleSummaries.map((item) => (
              <tr key={item.industry}>
                {industryTableColumns.map((column) => (
                  <td key={column.key} className={column.numeric ? 'numeric-cell' : undefined}>
                    {column.key === 'industry' ? <strong>{column.render(item)}</strong> : column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function sortIndustrySummaries(summaries: IndustrySummary[], sort: IndustrySort) {
  if (!sort) return summaries;
  return [...summaries].sort((a, b) => {
    const left = a[sort.key];
    const right = b[sort.key];
    const result = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), 'ru');
    return sort.direction === 'asc' ? result : -result;
  });
}
