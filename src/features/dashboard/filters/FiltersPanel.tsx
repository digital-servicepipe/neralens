import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CalendarDays, ChevronDown, Layers, RotateCcw, Search, Shield, SlidersHorizontal } from 'lucide-react';
import { agentGroupLabels } from '../../bots/botDictionary';
import type { AgentGroup, FiltersState } from '../../../shared/types/domain';

interface FiltersPanelProps {
  filters: FiltersState;
  options: {
    agentGroups: AgentGroup[];
    agentDetails: string[];
    requestStatuses: string[];
    sections: string[];
    countries: string[];
  };
  onChange: React.Dispatch<React.SetStateAction<FiltersState>>;
  onReset: () => void;
}

type Popover = 'date' | 'groups' | 'bots' | 'statuses' | 'sections' | null;

function toggle<T extends string>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

export function FiltersPanel({ filters, options, onChange, onReset }: FiltersPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const [popover, setPopover] = useState<Popover>(null);
  const [botQuery, setBotQuery] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(filters.dateFrom || '2026-06-01'));

  const activeCount = [
    filters.dateFrom || filters.dateTo,
    filters.agentGroups.length,
    filters.agentDetails.length,
    filters.requestStatuses.length,
    filters.sections.length,
    filters.pathQuery,
  ].filter(Boolean).length;

  const botOptions = useMemo(
    () => options.agentDetails.filter((bot) => bot.toLowerCase().includes(botQuery.toLowerCase())),
    [botQuery, options.agentDetails],
  );
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const monthTitle = useMemo(() => formatMonthTitle(visibleMonth), [visibleMonth]);

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
        <FilterButton icon={<CalendarDays className="h-4 w-4" />} label="Дата" value={dateLabel(filters)} open={popover === 'date'} onClick={() => setPopover(popover === 'date' ? null : 'date')} />
        <FilterButton icon={<Bot className="h-4 w-4" />} label="Группы" value={filters.agentGroups.length ? `${filters.agentGroups.length} выбрано` : 'Все'} badge={filters.agentGroups.length || undefined} open={popover === 'groups'} onClick={() => setPopover(popover === 'groups' ? null : 'groups')} />
        <FilterButton icon={<SlidersHorizontal className="h-4 w-4" />} label="Боты" value={filters.agentDetails.length ? `${filters.agentDetails.length} выбрано` : 'Все'} open={popover === 'bots'} onClick={() => setPopover(popover === 'bots' ? null : 'bots')} wide />
        <FilterButton icon={<Shield className="h-4 w-4" />} label="Статусы" value={filters.requestStatuses[0] ?? 'Все'} open={popover === 'statuses'} onClick={() => setPopover(popover === 'statuses' ? null : 'statuses')} />
        <FilterButton icon={<Layers className="h-4 w-4" />} label="Разделы сайта" value={filters.sections[0] ?? 'Все'} open={popover === 'sections'} onClick={() => setPopover(popover === 'sections' ? null : 'sections')} />
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
        <div className="date-popover floating-popover">
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

              return (
                <button
                  className={`calendar-day ${active ? 'active' : ''} ${inRange ? 'in-range' : ''} ${currentMonth ? '' : 'outside'}`}
                  key={iso}
                  type="button"
                  onClick={() => pickDate(iso)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="quick-range">
            <button type="button" onClick={() => setQuickRange(7)}>7 дней</button>
            <button type="button" onClick={() => setQuickRange(30)}>30 дней</button>
            <button type="button" onClick={() => onChange((current) => ({ ...current, dateFrom: '', dateTo: '' }))}>Очистить</button>
          </div>
        </div>
      )}

      {popover === 'groups' && (
        <ListPopover className="groups-popover">
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
        <ListPopover className="bots-popover">
          <div className="popover-search"><Search className="h-4 w-4" /><input value={botQuery} placeholder="Найти бота" onChange={(event) => setBotQuery(event.target.value)} /></div>
          <div className="popover-meta"><span>{botOptions.length} из {options.agentDetails.length}</span><button onClick={() => onChange((current) => ({ ...current, agentDetails: [] }))}>Очистить</button></div>
          {botOptions.map((bot) => (
            <CheckRow
              key={bot}
              label={bot}
              checked={filters.agentDetails.includes(bot)}
              onClick={() => onChange((current) => ({ ...current, agentDetails: toggle(current.agentDetails, bot) }))}
            />
          ))}
        </ListPopover>
      )}

      {popover === 'statuses' && (
        <ListPopover className="statuses-popover">
          {options.requestStatuses.map((status) => (
            <CheckRow key={status} label={status} checked={filters.requestStatuses.includes(status)} onClick={() => onChange((current) => ({ ...current, requestStatuses: toggle(current.requestStatuses, status) }))} />
          ))}
        </ListPopover>
      )}

      {popover === 'sections' && (
        <ListPopover className="sections-popover">
          {options.sections.map((section) => (
            <CheckRow key={section} label={section} checked={filters.sections.includes(section)} onClick={() => onChange((current) => ({ ...current, sections: toggle(current.sections, section) }))} />
          ))}
        </ListPopover>
      )}
    </section>
  );
}

function FilterButton({ icon, label, value, badge, wide, open, onClick }: { icon: React.ReactNode; label: string; value: string; badge?: number; wide?: boolean; open: boolean; onClick: () => void }) {
  return (
    <button className={`filter-field ${wide ? 'wide' : ''} ${open ? 'open' : ''}`} onClick={onClick}>
      <span className="field-icon">{icon}</span>
      <span className="field-copy"><small>{label}</small><strong>{value}</strong></span>
      {badge ? <span className="field-badge">{badge}</span> : <ChevronDown className="field-chevron h-4 w-4" />}
    </button>
  );
}

function ListPopover({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`floating-popover list-popover ${className}`}>{children}</div>;
}

function CheckRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button className={`check-row ${checked ? 'checked' : ''}`} onClick={onClick}>
      <span className="radio-dot" />
      <span>{label}</span>
    </button>
  );
}

function dateLabel(filters: FiltersState) {
  if (filters.dateFrom && filters.dateTo) return `${shortDate(filters.dateFrom)} - ${shortDate(filters.dateTo)}`;
  if (filters.dateFrom) return `с ${shortDate(filters.dateFrom)}`;
  if (filters.dateTo) return `до ${shortDate(filters.dateTo)}`;
  return '01 июн. 2026 г...';
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
