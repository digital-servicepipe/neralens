import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import { emptyFilters, normalizeFilters, type AnalysisMode, type FiltersState, type ImportedFileMeta, type IndustryRow, type LogRow, type PersistedState, type TextFilePayload } from '../shared/types/domain';
import { clearPersistedState, loadPersistedState, savePersistedState } from '../shared/lib/storage';
import { parseLogFile } from '../features/import/logParser';
import { parseIndustryFile } from '../features/import/industryParser';
import { formatNumber, pluralFiles } from '../shared/lib/format';
import { readUrlState, writeUrlState } from '../entities/filter/urlState';
import { useAnalytics } from '../features/analytics/useAnalytics';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AuthGate } from './AuthGate';
import { totalIndustryTraffic } from '../features/analytics/industrySelectors';

type Screen = 'overview' | 'pages' | 'settings';

const activeScreenKey = 'neralens-active-screen';

const screenMeta: Record<Screen, { title: string; subtitle: string }> = {
  overview: { title: 'Обзор', subtitle: 'Общая картина по запросам AI-ботов к сайту' },
  pages: { title: 'Страницы', subtitle: 'Пути, разделы и детальная статистика по AI-ботам' },
  settings: { title: 'Настройки', subtitle: 'Режим аналитики, загрузка данных и очистка проекта' },
};

const industryScreenMeta: Record<Screen, { title: string; subtitle: string }> = {
  overview: { title: 'Отраслевой отчёт', subtitle: 'Атаки и ботовый трафик в разрезе отраслей' },
  pages: { title: 'Отраслевой отчёт', subtitle: 'Атаки и ботовый трафик в разрезе отраслей' },
  settings: { title: 'Настройки', subtitle: 'Режим аналитики, загрузка данных и очистка проекта' },
};

function createFileMeta(file: File, rowCount: number, kind: AnalysisMode): ImportedFileMeta {
  return {
    id: `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    kind,
    name: file.name,
    rowCount,
    uploadedAt: new Date().toISOString(),
  };
}

function isScreen(value: unknown): value is Screen {
  return value === 'overview' || value === 'pages' || value === 'settings';
}

function inferSiteDomain(rows: LogRow[]): string {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const host = String(row.host || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/g, '');
    if (host) counts.set(host, (counts.get(host) ?? 0) + (row.requestCount ?? 1));
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

export function App() {
  const [isReady, setReady] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('logs');
  const [rows, setRows] = useState<LogRow[]>([]);
  const [industryRows, setIndustryRows] = useState<IndustryRow[]>([]);
  const [files, setFiles] = useState<ImportedFileMeta[]>([]);
  const [sitemapFiles, setSitemapFiles] = useState<TextFilePayload[]>([]);
  const [robotsTxt, setRobotsTxt] = useState('');
  const [servicepipeLogs, setServicepipeLogs] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [isParsing, setParsing] = useState(false);
  const [filters, setFilters] = useState<FiltersState>(() => normalizeFilters(readUrlState().filters));
  const [activeScreen, setActiveScreen] = useState<Screen>(() => {
    const urlScreen = readUrlState().screen;
    if (isScreen(urlScreen)) return urlScreen;
    const stored = localStorage.getItem(activeScreenKey);
    return isScreen(stored) ? stored : 'overview';
  });

  const logInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadPersistedState()
      .then((state) => {
        setRows(state.rows);
        setIndustryRows(state.industryRows);
        setFiles(state.files);
        setSitemapFiles(state.sitemapFiles);
        setRobotsTxt(state.robotsTxt);
        setServicepipeLogs(state.servicepipeLogs);
        setAnalysisMode(state.analysisMode);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback(async (state: PersistedState) => {
    setRows(state.rows);
    setIndustryRows(state.industryRows);
    setFiles(state.files);
    setSitemapFiles(state.sitemapFiles);
    setRobotsTxt(state.robotsTxt);
    setServicepipeLogs(state.servicepipeLogs);
    setAnalysisMode(state.analysisMode);
    await savePersistedState(state);
    setError('');
  }, []);

  useEffect(() => {
    localStorage.setItem(activeScreenKey, activeScreen);
    writeUrlState(activeScreen, filters);
  }, [activeScreen, filters]);

  useEffect(() => {
    if (!isReady) return;
    void savePersistedState({ version: 5, analysisMode, rows, industryRows, files, sitemapFiles, robotsTxt, servicepipeLogs });
  }, [analysisMode, files, industryRows, isReady, robotsTxt, rows, servicepipeLogs, sitemapFiles]);

  useEffect(() => {
    if (analysisMode === 'industry' && activeScreen === 'pages') setActiveScreen('overview');
  }, [activeScreen, analysisMode]);

  const deferredFilters = useDeferredValue(filters);
  const analyticsPending = deferredFilters !== filters;
  const analytics = useAnalytics(rows, deferredFilters, robotsTxt, activeScreen);
  const visibleRowsCount = analysisMode === 'industry' ? totalIndustryTraffic(industryRows) : analytics.kpis.totalRequests;
  const siteDomain = useMemo(() => inferSiteDomain(rows), [rows]);

  const handleLogFiles = async (incoming: FileList | File[]) => {
    const selected = Array.from(incoming);
    if (!selected.length) return;
    setParsing(true);
    setError('');
    setNote('');
    try {
      const parsed = await Promise.all(selected.map(async (file) => ({ file, parsed: await parseLogFile(file) })));
      const metas = parsed.map(({ file, parsed: result }) => createFileMeta(file, result.rowCount, 'logs'));
      const nextRows = [...rows, ...parsed.flatMap((item) => item.parsed.rows)];
      await persist({ version: 5, analysisMode: 'logs', rows: nextRows, industryRows, files: [...files, ...metas], sitemapFiles, robotsTxt, servicepipeLogs });
      const total = parsed.reduce((sum, item) => sum + item.parsed.rowCount, 0);
      const usedUaGroup = parsed.some((item) => item.parsed.usedUaGroupColumn);
      setNote(`Загрузка прошла нормально: ${selected.length} ${pluralFiles(selected.length)}, ${formatNumber(total)} строк. ${usedUaGroup ? 'Группы ботов определены из файла.' : 'Группы ботов определены автоматически.'}`);
      setActiveScreen('overview');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось прочитать файл с логами.');
    } finally {
      setParsing(false);
    }
  };

  const handleIndustryFiles = async (incoming: FileList | File[]) => {
    const selected = Array.from(incoming);
    if (!selected.length) return;
    setParsing(true);
    setError('');
    setNote('');
    try {
      const parsed = await Promise.all(selected.map(async (file) => ({ file, parsed: await parseIndustryFile(file) })));
      const metas = parsed.map(({ file, parsed: result }) => createFileMeta(file, result.rowCount, 'industry'));
      const nextRows = parsed.flatMap((item) => item.parsed.rows);
      await persist({ version: 5, analysisMode: 'industry', rows, industryRows: nextRows, files: [...files.filter((file) => file.kind !== 'industry'), ...metas], sitemapFiles, robotsTxt, servicepipeLogs });
      const total = totalIndustryTraffic(nextRows);
      setNote(`Отраслевой файл загружен: ${selected.length} ${pluralFiles(selected.length)}, ${formatNumber(nextRows.length)} строк, ${formatNumber(total)} трафика.`);
      setActiveScreen('overview');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось прочитать отраслевой файл.');
    } finally {
      setParsing(false);
    }
  };

  const resetAll = async () => {
    await clearPersistedState();
    setRows([]);
    setIndustryRows([]);
    setFiles([]);
    setSitemapFiles([]);
    setRobotsTxt('');
    setServicepipeLogs(true);
    setFilters(emptyFilters);
    setActiveScreen('overview');
    setNote('');
    setError('');
  };

  const controls = useMemo(
    () => (
      <>
        <input ref={logInputRef} className="hidden" type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" multiple onChange={(event) => event.currentTarget.files && void (analysisMode === 'industry' ? handleIndustryFiles(event.currentTarget.files) : handleLogFiles(event.currentTarget.files))} />
      </>
    ),
    [analysisMode, rows, industryRows, files, sitemapFiles, robotsTxt],
  );

  if (!isReady) {
    return <LoadingScreen />;
  }

  const hasProjectData = analysisMode === 'industry' ? industryRows.length > 0 : rows.length > 0 || files.some((file) => file.kind === 'logs');
  const content = hasProjectData ? (
    <DashboardPage
      screen={activeScreen}
      analysisMode={analysisMode}
      rows={rows}
      industryRows={industryRows}
      files={files}
      sitemapFiles={sitemapFiles}
      robotsTxt={robotsTxt}
      siteDomain={siteDomain}
      servicepipeLogs={servicepipeLogs}
      filters={filters}
      analytics={analytics}
      analyticsPending={analyticsPending}
      onFiltersChange={setFilters}
      onResetFilters={() => setFilters(emptyFilters)}
      onPathSelect={(path) => setFilters((current) => ({ ...current, pathQuery: path }))}
      onAddLogs={() => logInputRef.current?.click()}
      onClearLogs={() => void resetAll()}
      onServicepipeLogsChange={setServicepipeLogs}
      onAnalysisModeChange={(mode) => {
        setAnalysisMode(mode);
        setActiveScreen('overview');
        setFilters(emptyFilters);
      }}
    />
  ) : (
    <EmptyImportScreen
      analysisMode={analysisMode}
      error={error}
      isParsing={isParsing}
      onLogFiles={(incoming) => void (analysisMode === 'industry' ? handleIndustryFiles(incoming) : handleLogFiles(incoming))}
      onPickLogs={() => logInputRef.current?.click()}
    />
  );
  const currentScreenMeta = analysisMode === 'industry' ? industryScreenMeta[activeScreen] : screenMeta[activeScreen];

  return (
    <AuthGate>
      <div className="app-shell">
      {controls}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><NeraLensLogo /></span>
          <span>
            <strong>NeraLens</strong>
            <small>{analysisMode === 'industry' ? 'Отраслевые атаки' : 'ИИ-запросы по логам'}</small>
          </span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-link ${activeScreen === 'overview' ? 'active' : ''}`} onClick={() => setActiveScreen('overview')}><LayoutGrid className="h-4 w-4" />Обзор</button>
          {analysisMode === 'logs' && <button className={`nav-link ${activeScreen === 'pages' ? 'active' : ''}`} onClick={() => setActiveScreen('pages')}><FileText className="h-4 w-4" />Страницы</button>}
          <button className={`nav-link ${activeScreen === 'settings' ? 'active' : ''}`} onClick={() => setActiveScreen('settings')}><SlidersHorizontal className="h-4 w-4" />Настройки</button>
        </nav>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <h1 className="page-title">{currentScreenMeta.title}</h1>
            <p className="page-subtitle">{currentScreenMeta.subtitle}</p>
          </div>
          <div className="row-count-badge">{analyticsPending ? 'Обновляем...' : `${formatNumber(visibleRowsCount)} ${analysisMode === 'industry' ? 'трафик' : 'строк'}`}</div>
        </header>
        {error && <div className="panel mb-3 p-3 text-sm text-danger">{error}</div>}
        {note && !error && <div className="panel mb-3 p-3 text-sm text-ink">{note}</div>}
        {isParsing && <div className="panel mb-3 p-3 text-sm font-bold text-aqua">Обработка...</div>}
        {content}
      </main>
      </div>
    </AuthGate>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-live="polite" aria-label="Загрузка NeraLens">
      <span className="loading-spinner" aria-hidden="true" />
    </main>
  );
}

function NeraLensLogo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="13.5" cy="13.5" r="7.5" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M19.4 19.4 26 26" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      <circle cx="12.3" cy="12.1" r="2.2" fill="currentColor" />
      <path d="M22.5 6.5h5M25 4v5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" opacity=".72" />
    </svg>
  );
}

function EmptyImportScreen({
  error,
  isParsing,
  onLogFiles,
  onPickLogs,
  analysisMode,
}: {
  analysisMode: AnalysisMode;
  error: string;
  isParsing: boolean;
  onLogFiles: (files: FileList | File[]) => void;
  onPickLogs: () => void;
}) {
  return (
    <section className="panel p-6">
      <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void onLogFiles(event.dataTransfer.files); }}>
        <p className="text-2xl font-extrabold text-ink">{analysisMode === 'industry' ? 'Загрузите отраслевой файл' : 'Загрузите логи AI-ботов'}</p>
        <p className="mt-2 text-sm text-muted">{analysisMode === 'industry' ? 'CSV/TSV с колонками industry, date, all_trafic и процентными метриками.' : 'CSV с логами. После импорта откроется обзор.'}</p>
        <div className="mt-4 flex gap-2">
          <button className="primary-button" onClick={onPickLogs}>Загрузить CSV/TSV</button>
        </div>
      </div>
      {isParsing && <p className="mt-3 text-sm font-bold text-aqua">Обработка...</p>}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
