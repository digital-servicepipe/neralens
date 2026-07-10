import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, FolderTree, GitBranch, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import { emptyFilters, normalizeFilters, type FiltersState, type ImportedFileMeta, type LogRow, type PersistedState, type TextFilePayload } from '../shared/types/domain';
import { clearPersistedState, loadPersistedState, savePersistedState } from '../shared/lib/storage';
import { parseLogFile } from '../features/import/logParser';
import { formatNumber, pluralFiles } from '../shared/lib/format';
import { readUrlState, writeUrlState } from '../entities/filter/urlState';
import { useAnalytics } from '../features/analytics/useAnalytics';
import { DashboardPage } from '../features/dashboard/DashboardPage';

type Screen = 'overview' | 'pages' | 'sitemap' | 'settings';

const activeScreenKey = 'neralens-active-screen';
const siteDomainKey = 'neralens-site-domain';

const screenMeta: Record<Screen, { title: string; subtitle: string }> = {
  overview: { title: 'Обзор', subtitle: 'Общая картина по запросам AI-ботов.' },
  pages: { title: 'Страницы', subtitle: 'Пути, разделы и детальная статистика URL.' },
  sitemap: { title: 'Карта', subtitle: 'Связь sitemap, посещений и ограничений robots.txt.' },
  settings: { title: 'Настройки', subtitle: 'Загрузка логов и файлов сайта, очистка и базовые параметры.' },
};

function createFileMeta(file: File, rowCount: number): ImportedFileMeta {
  return {
    id: `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    kind: 'logs',
    name: file.name,
    rowCount,
    uploadedAt: new Date().toISOString(),
  };
}

function isScreen(value: unknown): value is Screen {
  return value === 'overview' || value === 'pages' || value === 'sitemap' || value === 'settings';
}

export function App() {
  const [isReady, setReady] = useState(false);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [files, setFiles] = useState<ImportedFileMeta[]>([]);
  const [sitemapFiles, setSitemapFiles] = useState<TextFilePayload[]>([]);
  const [robotsTxt, setRobotsTxt] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [isParsing, setParsing] = useState(false);
  const [siteDomain, setSiteDomain] = useState(() => localStorage.getItem(siteDomainKey) || 'neralens.ru');
  const [filters, setFilters] = useState<FiltersState>(() => normalizeFilters(readUrlState().filters));
  const [activeScreen, setActiveScreen] = useState<Screen>(() => {
    const urlScreen = readUrlState().screen;
    if (isScreen(urlScreen)) return urlScreen;
    const stored = localStorage.getItem(activeScreenKey);
    return isScreen(stored) ? stored : 'overview';
  });

  const logInputRef = useRef<HTMLInputElement | null>(null);
  const sitemapInputRef = useRef<HTMLInputElement | null>(null);
  const robotsInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadPersistedState()
      .then((state) => {
        setRows(state.rows);
        setFiles(state.files);
        setSitemapFiles(state.sitemapFiles);
        setRobotsTxt(state.robotsTxt);
      })
      .catch(() => setError('Не удалось восстановить сохранённые файлы из IndexedDB.'))
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback(async (state: PersistedState) => {
    setRows(state.rows);
    setFiles(state.files);
    setSitemapFiles(state.sitemapFiles);
    setRobotsTxt(state.robotsTxt);
    await savePersistedState(state);
  }, []);

  useEffect(() => {
    localStorage.setItem(activeScreenKey, activeScreen);
    writeUrlState(activeScreen, filters);
  }, [activeScreen, filters]);

  useEffect(() => {
    localStorage.setItem(siteDomainKey, siteDomain);
  }, [siteDomain]);

  const analytics = useAnalytics(rows, filters, robotsTxt);

  const handleLogFiles = async (incoming: FileList | File[]) => {
    const selected = Array.from(incoming);
    if (!selected.length) return;
    setParsing(true);
    setError('');
    setNote('');
    try {
      const parsed = await Promise.all(selected.map(async (file) => ({ file, parsed: await parseLogFile(file) })));
      const metas = parsed.map(({ file, parsed: result }) => createFileMeta(file, result.rowCount));
      const nextRows = [...rows, ...parsed.flatMap((item) => item.parsed.rows)];
      await persist({ version: 3, rows: nextRows, files: [...files, ...metas], sitemapFiles, robotsTxt });
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

  const handleSitemapFiles = async (incoming: FileList | File[]) => {
    const selected = Array.from(incoming);
    if (!selected.length) return;
    setError('');
    const next = await Promise.all(selected.map(async (file) => ({ name: file.name, content: await file.text() })));
    await persist({ version: 3, rows, files, sitemapFiles: next, robotsTxt });
  };

  const handleRobotsFile = async (file: File) => {
    setError('');
    await persist({ version: 3, rows, files, sitemapFiles, robotsTxt: await file.text() });
  };

  const resetAll = async () => {
    await clearPersistedState();
    setRows([]);
    setFiles([]);
    setSitemapFiles([]);
    setRobotsTxt('');
    setFilters(emptyFilters);
    setActiveScreen('overview');
    setNote('');
    setError('');
  };

  const controls = useMemo(
    () => (
      <>
        <input ref={logInputRef} className="hidden" type="file" accept=".csv,.xlsx,.xls,text/csv" multiple onChange={(event) => event.currentTarget.files && void handleLogFiles(event.currentTarget.files)} />
        <input ref={sitemapInputRef} className="hidden" type="file" accept=".xml,text/xml" multiple onChange={(event) => event.currentTarget.files && void handleSitemapFiles(event.currentTarget.files)} />
        <input ref={robotsInputRef} className="hidden" type="file" accept=".txt,text/plain" onChange={(event) => event.currentTarget.files?.[0] && void handleRobotsFile(event.currentTarget.files[0])} />
      </>
    ),
    [rows, files, sitemapFiles, robotsTxt],
  );

  if (!isReady) {
    return <main className="flex min-h-screen items-center justify-center text-sm font-bold text-aqua">Загружаю сохранённые файлы...</main>;
  }

  const content = rows.length ? (
    <DashboardPage
      screen={activeScreen}
      rows={rows}
      files={files}
      sitemapFiles={sitemapFiles}
      robotsTxt={robotsTxt}
      siteDomain={siteDomain}
      filters={filters}
      analytics={analytics}
      onFiltersChange={setFilters}
      onResetFilters={() => setFilters(emptyFilters)}
      onPathSelect={(path) => setFilters((current) => ({ ...current, pathQuery: path }))}
      onSiteDomainChange={setSiteDomain}
      onAddLogs={() => logInputRef.current?.click()}
      onSitemapUpload={() => sitemapInputRef.current?.click()}
      onRobotsUpload={() => robotsInputRef.current?.click()}
      onClearLogs={() => void resetAll()}
    />
  ) : (
    <EmptyImportScreen
      error={error}
      isParsing={isParsing}
      onLogFiles={handleLogFiles}
      onPickLogs={() => logInputRef.current?.click()}
      onPickSitemap={() => sitemapInputRef.current?.click()}
      onPickRobots={() => robotsInputRef.current?.click()}
    />
  );

  return (
    <div className="app-shell">
      {controls}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><NeraLensLogo /></span>
          <span>
            <strong>NeraLens</strong>
            <small>ИИ-запросы по логам</small>
          </span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-link ${activeScreen === 'overview' ? 'active' : ''}`} onClick={() => setActiveScreen('overview')}><LayoutGrid className="h-4 w-4" />Обзор</button>
          <button className={`nav-link ${activeScreen === 'pages' ? 'active' : ''}`} onClick={() => setActiveScreen('pages')}><FileText className="h-4 w-4" />Страницы</button>
          <button className={`nav-link ${activeScreen === 'sitemap' ? 'active' : ''}`} onClick={() => setActiveScreen('sitemap')}><GitBranch className="h-4 w-4" />Карта</button>
          <button className={`nav-link ${activeScreen === 'settings' ? 'active' : ''}`} onClick={() => setActiveScreen('settings')}><SlidersHorizontal className="h-4 w-4" />Настройки</button>
        </nav>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <h1 className="page-title">{screenMeta[activeScreen].title}</h1>
            <p className="page-subtitle">{screenMeta[activeScreen].subtitle}</p>
          </div>
          <div className="row-count-badge">{formatNumber(analytics.filteredRows.length)} строк</div>
        </header>
        {error && <div className="panel mb-3 p-3 text-sm text-danger">{error}</div>}
        {note && !error && <div className="panel mb-3 p-3 text-sm text-ink">{note}</div>}
        {isParsing && <div className="panel mb-3 p-3 text-sm font-bold text-aqua">Обрабатываю файлы...</div>}
        {content}
      </main>
    </div>
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
  onPickSitemap,
  onPickRobots,
}: {
  error: string;
  isParsing: boolean;
  onLogFiles: (files: FileList | File[]) => void;
  onPickLogs: () => void;
  onPickSitemap: () => void;
  onPickRobots: () => void;
}) {
  return (
    <section className="panel p-6">
      <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void onLogFiles(event.dataTransfer.files); }}>
        <p className="text-2xl font-extrabold text-ink">Загрузите логи AI-ботов</p>
        <p className="mt-2 text-sm text-muted">CSV или XLSX, внутри которого лежит CSV-поток. После импорта откроется обзор.</p>
        <div className="mt-4 flex gap-2">
          <button className="primary-button" onClick={onPickLogs}>Загрузить CSV</button>
          <button className="ghost-button" onClick={onPickSitemap}>Загрузить XML</button>
          <button className="ghost-button" onClick={onPickRobots}>Загрузить TXT</button>
        </div>
      </div>
      {isParsing && <p className="mt-3 text-sm font-bold text-aqua">Обрабатываю файлы...</p>}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
