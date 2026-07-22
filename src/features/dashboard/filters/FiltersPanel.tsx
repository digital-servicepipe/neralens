import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Bot, CalendarDays, ChevronDown, Layers, RotateCcw, Search, Shield, SlidersHorizontal } from 'lucide-react';
import { agentGroupLabels, getBotColor } from '../../bots/botDictionary';
import type { AgentGroup, FiltersState } from '../../../shared/types/domain';

interface FiltersPanelProps {
  filters: FiltersState;
  options: {
    agentGroups: AgentGroup[];
    agentDetails: string[];
    agentDetailGroups: Record<string, AgentGroup[]>;
    requestStatuses: string[];
    sections: string[];
    countries: string[];
    activeDates: Record<string, number>;
  };
  onChange: React.Dispatch<React.SetStateAction<FiltersState>>;
  onReset: () => void;
}

type Popover = 'date' | 'groups' | 'bots' | 'statuses' | 'sections' | null;
type PopoverKey = Exclude<Popover, null>;

function toggle<T extends string>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

export function FiltersPanel({ filters, options, onChange, onReset }: FiltersPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const datePopoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<PopoverKey, HTMLButtonElement | null>>({
    date: null,
    groups: null,
    bots: null,
    statuses: null,
    sections: null,
  });
  const wheelAtRef = useRef(0);
  const datePopoverWasOpenRef = useRef(false);
  const [popover, setPopover] = useState<Popover>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const [botQuery, setBotQuery] = useState('');
  const [sectionQuery, setSectionQuery] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(filters.dateFrom || latestActiveDate(options.activeDates) || formatIso(new Date())));

  const activeCount = [
    filters.dateFrom || filters.dateTo,
    filters.agentGroups.length,
    filters.agentDetails.length,
    filters.requestStatuses.length,
    filters.sections.length,
    filters.excludedSections.length,
    filters.pathQuery,
  ].filter(Boolean).length;

  const allowedBotSet = useMemo(() => {
    if (!filters.agentGroups.length) return null;
    const selectedGroups = new Set(filters.agentGroups);
    return new Set(
      options.agentDetails.filter((bot) => options.agentDetailGroups[bot]?.some((group) => selectedGroups.has(group))),
    );
  }, [filters.agentGroups, options.agentDetailGroups, options.agentDetails]);
  const botSourceOptions = useMemo(
    () => (allowedBotSet ? options.agentDetails.filter((bot) => allowedBotSet.has(bot)) : options.agentDetails),
    [allowedBotSet, options.agentDetails],
  );
  const botOptions = useMemo(
    () => botSourceOptions.filter((bot) => bot.toLowerCase().includes(botQuery.toLowerCase())),
    [botQuery, botSourceOptions],
  );
  const sectionOptions = useMemo(
    () => options.sections.filter((section) => section.toLowerCase().includes(sectionQuery.toLowerCase())),
    [sectionQuery, options.sections],
  );
  const activeDateSet = useMemo(() => new Set(Object.keys(options.activeDates)), [options.activeDates]);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const monthTitle = useMemo(() => formatMonthTitle(visibleMonth), [visibleMonth]);

  useEffect(() => {
    if (popover !== 'date') {
      datePopoverWasOpenRef.current = false;
      return;
    }
    if (datePopoverWasOpenRef.current) return;
    datePopoverWasOpenRef.current = true;
    setVisibleMonth(monthStart(filters.dateFrom || filters.dateTo || latestActiveDate(options.activeDates) || formatIso(new Date())));
  }, [filters.dateFrom, filters.dateTo, options.activeDates, popover]);

  const setTriggerRef = useCallback((key: PopoverKey) => (node: HTMLButtonElement | null) => {
    triggerRefs.current[key] = node;
  }, []);

  const updatePopoverPosition = useCallback(() => {
    if (!popover || !panelRef.current) return;

    const panelRect = panelRef.current.getBoundingClientRect();
    const triggerRect = triggerRefs.current[popover]?.getBoundingClientRect();
    if (!triggerRect) return;

    const preferredWidth = popover === 'date' ? 312 : Math.max(300, Math.round(triggerRect.width));
    const width = Math.min(preferredWidth, Math.max(260, Math.round(panelRect.width - 16)));
    const rawLeft = Math.round(triggerRect.left - panelRect.left);
    const maxLeft = Math.max(8, Math.round(panelRect.width - width - 8));
    const left = Math.max(8, Math.min(rawLeft, maxLeft));
    const top = Math.round(triggerRect.bottom - panelRect.top + 8);
    const originX = Math.round(triggerRect.left - panelRect.left + triggerRect.width / 2 - left);

    setPopoverStyle({
      left,
      top,
      width,
      transformOrigin: `${originX}px top`,
    });
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

      return iso < current.dateFrom
        ? { ...current, dateFrom: iso, dateTo: current.dateFrom }
        : { ...current, dateTo: iso };
    });
  };

  const setQuickRange = (days: number) => {
    const end = filters.dateTo || filters.dateFrom || formatIso(endOfMonth(visibleMonth));
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

  useEffect(() => {
    if (!allowedBotSet || !filters.agentDetails.length) return;

    onChange((current) => {
      const nextAgentDetails = current.agentDetails.filter((bot) => allowedBotSet.has(bot));
      if (nextAgentDetails.length === current.agentDetails.length) return current;
      return { ...current, agentDetails: nextAgentDetails };
    });
  }, [allowedBotSet, filters.agentDetails.length, onChange]);

  return (
    <section className="filters-panel panel" ref={panelRef}>
      <div className="filters-title-row">
        <div className="filters-title">
          <span className="filters-title-icon"><SlidersHorizontal className="h-4 w-4" /></span>
          <strong>Фильтры</strong>
          <span className="active-pill">{activeCount} активных</span>
        </div>
      </div>
      <div className="filter-fields">
        <FilterButton ref={setTriggerRef('date')} icon={<CalendarDays className="h-4 w-4" />} label="Дата" value={dateLabel(filters)} open={popover === 'date'} onClick={() => setPopover(popover === 'date' ? null : 'date')} />
        <FilterButton ref={setTriggerRef('groups')} icon={<Bot className="h-4 w-4" />} label="Группы" value={filters.agentGroups.length ? `${filters.agentGroups.length} выбрано` : 'Все'} badge={filters.agentGroups.length || undefined} open={popover === 'groups'} onClick={() => setPopover(popover === 'groups' ? null : 'groups')} />
        <FilterButton ref={setTriggerRef('bots')} icon={<SlidersHorizontal className="h-4 w-4" />} label="Боты" value={filters.agentDetails.length ? `${filters.agentDetails.length} выбрано` : 'Все'} open={popover === 'bots'} onClick={() => setPopover(popover === 'bots' ? null : 'bots')} wide />
        <FilterButton ref={setTriggerRef('statuses')} icon={<Shield className="h-4 w-4" />} label="Статусы" value={filters.requestStatuses[0] ?? 'Все'} open={popover === 'statuses'} onClick={() => setPopover(popover === 'statuses' ? null : 'statuses')} />
        <FilterButton ref={setTriggerRef('sections')} icon={<Layers className="h-4 w-4" />} label="Разделы сайта" value={sectionsLabel(filters.sections, filters.excludedSections, options.sections.length)} badge={sectionFilterCount(filters) || undefined} open={popover === 'sections'} onClick={() => setPopover(popover === 'sections' ? null : 'sections')} />
        <label className="filter-search">
          <span><Search className="h-4 w-4" /></span>
          <span>
            <small>Путь</small>
            <input value={filters.pathQuery} placeholder="Найти URL или часть пути" onChange={(event) => onChange((current) => ({ ...current, pathQuery: event.target.value }))} />
          </span>
        </label>
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
                <button
                  className={`calendar-day ${selected ? 'selected' : ''} ${hasData ? 'has-data' : ''} ${currentMonth ? '' : 'outside'}`}
                  key={iso}
                  type="button"
                  title={formatLongDate(date)}
                  aria-label={formatLongDate(date)}
                  onClick={() => pickDate(iso)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="calendar-legend" aria-hidden="true">
            <span><i className="legend-selected" />Выбрано</span>
            <span><i className="legend-data" />Есть логи</span>
            <span><i className="legend-muted" />Нет данных</span>
          </div>
          <div className="quick-range">
            <button type="button" onClick={() => setQuickRange(7)}>7 дней</button>
            <button type="button" onClick={() => setQuickRange(30)}>30 дней</button>
            <button type="button" onClick={() => onChange((current) => ({ ...current, dateFrom: '', dateTo: '' }))}>Очистить</button>
          </div>
        </div>
      )}

      {popover === 'groups' && (
        <ListPopover style={popoverStyle}>
          {options.agentGroups.map((group) => (
            <CheckRow
              key={group}
              label={agentGroupLabels[group]}
              checked={filters.agentGroups.includes(group)}
              onClick={() => onChange((current) => ({ ...current, agentGroups: toggle(current.agentGroups, group) }))}
            />
          ))}
        </ListPopover>
      )}

      {popover === 'bots' && (
        <ListPopover style={popoverStyle}>
          <div className="popover-search"><Search className="h-4 w-4" /><input value={botQuery} placeholder="Найти бота" onChange={(event) => setBotQuery(event.target.value)} /></div>
          <div className="popover-meta"><span>{botOptions.length} из {botSourceOptions.length}</span><button onClick={() => onChange((current) => ({ ...current, agentDetails: [] }))}>Очистить</button></div>
          {botOptions.map((bot) => (
            <CheckRow
              key={bot}
              label={bot}
              color={getBotColor(bot, options.agentDetailGroups[bot])}
              checked={filters.agentDetails.includes(bot)}
              onClick={() => onChange((current) => ({ ...current, agentDetails: toggle(current.agentDetails, bot) }))}
            />
          ))}
        </ListPopover>
      )}

      {popover === 'statuses' && (
        <ListPopover style={popoverStyle}>
          {options.requestStatuses.map((status) => (
            <CheckRow key={status} label={status} checked={filters.requestStatuses.includes(status)} onClick={() => onChange((current) => ({ ...current, requestStatuses: toggle(current.requestStatuses, status) }))} />
          ))}
        </ListPopover>
      )}

      {popover === 'sections' && (
        <ListPopover className="with-footer" style={popoverStyle}>
          <div className="popover-search"><Search className="h-4 w-4" /><input value={sectionQuery} placeholder="Найти раздел" onChange={(event) => setSectionQuery(event.target.value)} /></div>
          <div className="popover-scroll">
            {sectionOptions.map((section) => (
              <SectionRow
                key={section}
                label={section}
                checked={filters.sections.includes(section)}
                excluded={filters.excludedSections.includes(section)}
                onToggle={() => onChange((current) => ({
                  ...current,
                  sections: toggle(current.sections, section),
                  excludedSections: current.excludedSections.filter((item) => item !== section),
                }))}
                onExclude={() => onChange((current) => ({
                  ...current,
                  sections: current.sections.filter((item) => item !== section),
                  excludedSections: toggle(current.excludedSections, section),
                }))}
              />
            ))}
          </div>
          <div className="popover-meta popover-footer"><span>{sectionFilterMeta(filters, options.sections.length)}</span><button onClick={() => onChange((current) => ({ ...current, sections: [], excludedSections: [] }))}>Очистить</button></div>
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

function CheckRow({ label, checked, onClick, color }: { label: string; checked: boolean; onClick: () => void; color?: string }) {
  return (
    <button className={`check-row ${checked ? 'checked' : ''} ${color ? 'color-coded' : ''}`} style={color ? ({ '--bot-color': color } as CSSProperties) : undefined} onClick={onClick}>
      <span className="radio-dot" />
      <span>{label}</span>
    </button>
  );
}

function SectionRow({ label, checked, excluded, onToggle, onExclude }: { label: string; checked: boolean; excluded: boolean; onToggle: () => void; onExclude: () => void }) {
  return (
    <div className={`check-row section-filter-row ${checked ? 'checked' : ''} ${excluded ? 'excluded' : ''}`}>
      <button className="section-filter-main" type="button" aria-pressed={checked} onClick={onToggle}>
        <span className="radio-dot" />
        <span className="section-filter-name">{label}</span>
      </button>
      <button className="section-filter-exclude" type="button" aria-pressed={excluded} aria-label={excluded ? `Вернуть раздел ${label}` : `Исключить раздел ${label}`} title={excluded ? 'Вернуть раздел' : 'Исключить раздел'} onClick={onExclude}>
        {excluded ? 'вернуть' : 'исключить'}
      </button>
    </div>
  );
}

function dateLabel(filters: FiltersState) {
  if (filters.dateFrom && filters.dateTo) return `${shortDate(filters.dateFrom)} - ${shortDate(filters.dateTo)}`;
  if (filters.dateFrom) return `с ${shortDate(filters.dateFrom)}`;
  if (filters.dateTo) return `до ${shortDate(filters.dateTo)}`;
  return 'Все даты';
}

function sectionsLabel(sections: string[], excludedSections: string[], total: number) {
  if (sections.length === 0 && excludedSections.length === 0) return 'Все';
  if (sections.length === 1 && excludedSections.length === 0) return sections[0];
  if (sections.length === 0) return `Без ${excludedSections.length} из ${total}`;
  if (excludedSections.length === 0) return `${sections.length} из ${total} разделов`;
  return `${sections.length} выбрано, без ${excludedSections.length}`;
}

function sectionFilterCount(filters: FiltersState) {
  return filters.sections.length + filters.excludedSections.length;
}

function sectionFilterMeta(filters: FiltersState, total: number) {
  const included = filters.sections.length;
  const excluded = filters.excludedSections.length;
  if (!included && !excluded) return `0 из ${total} разделов`;
  if (!excluded) return `${included} из ${total} разделов`;
  if (!included) return `Исключено ${excluded} из ${total}`;
  return `Выбрано ${included}, исключено ${excluded}`;
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
