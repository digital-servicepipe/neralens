import { Bot, Database, Factory, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { totalRequestCount } from '../analytics/selectors';
import { totalIndustryTraffic } from '../analytics/industrySelectors';
import { formatNumber } from '../../shared/lib/format';
import type { AnalysisMode, ImportedFileMeta, IndustryRow, LogRow } from '../../shared/types/domain';

interface SettingsPageProps {
  analysisMode: AnalysisMode;
  rows: LogRow[];
  industryRows: IndustryRow[];
  files: ImportedFileMeta[];
  servicepipeLogs: boolean;
  onAddLogs: () => void;
  onAddIndustry: () => void;
  onClearLogs: () => void;
  onServicepipeLogsChange: (value: boolean) => void;
  onAnalysisModeChange: (value: AnalysisMode) => void;
}

export function SettingsPage({ analysisMode, rows, industryRows, files, servicepipeLogs, onAddLogs, onAddIndustry, onClearLogs, onServicepipeLogsChange, onAnalysisModeChange }: SettingsPageProps) {
  const dates = rows.map((row) => row.date).filter((date) => date !== 'Unknown').sort();
  const industryDates = industryRows.map((row) => row.date).filter((date) => date !== 'Unknown').sort();
  const period = dates.length ? `${formatDate(dates[0])} - ${formatDate(dates.at(-1) ?? dates[0])}` : 'Не определён';
  const industryPeriod = industryDates.length ? `${formatDate(industryDates[0])} - ${formatDate(industryDates.at(-1) ?? industryDates[0])}` : 'Не определён';
  const uniquePaths = new Set(rows.map((row) => row.path)).size;
  const industries = new Set(industryRows.map((row) => row.industry)).size;
  const totalRequests = totalRequestCount(rows);
  const totalIndustryRequests = totalIndustryTraffic(industryRows);
  const logFiles = useMemo(() => files.filter((file) => file.kind === 'logs'), [files]);
  const industryFiles = useMemo(() => files.filter((file) => file.kind === 'industry'), [files]);

  return (
    <div className="settings-page">
      <section className="panel settings-hero">
        <div className="settings-hero-copy">
          <span className="settings-icon" aria-hidden="true"><Database className="h-5 w-5" /></span>
          <div>
            <h2>Данные проекта</h2>
            <p>Загруженные данные хранятся в браузере и восстанавливаются после обновления страницы.</p>
          </div>
        </div>
        <div className="settings-metrics">
          <InfoBox label={analysisMode === 'industry' ? 'Трафик' : 'Строки'} value={formatNumber(analysisMode === 'industry' ? totalIndustryRequests : totalRequests)} />
          <InfoBox label="Файлы" value={formatNumber(analysisMode === 'industry' ? industryFiles.length : logFiles.length)} />
          <InfoBox label="Период" value={analysisMode === 'industry' ? industryPeriod : period} />
          <InfoBox label={analysisMode === 'industry' ? 'Отрасли' : 'URL из логов'} value={formatNumber(analysisMode === 'industry' ? industries : uniquePaths)} />
        </div>
      </section>

      <section className="panel settings-options-card settings-preferences-card">
        <CardHead icon={<SlidersHorizontal className="h-5 w-5" />} title="Какой отчёт показывать" subtitle="Это переключает дашборд. Загруженные файлы для обоих отчётов остаются на месте." />
        <div className={`settings-preferences-grid ${analysisMode === 'logs' ? '' : 'single'}`}>
          {analysisMode === 'logs' && (
            <label className="settings-toggle-row">
              <span>
                <strong>Это файл Servicepipe</strong>
                <small>{servicepipeLogs ? 'Подставляем понятные названия страниц.' : 'Показываем страницы как в файле.'}</small>
              </span>
              <input type="checkbox" checked={servicepipeLogs} onChange={(event) => onServicepipeLogsChange(event.currentTarget.checked)} />
              <span className="settings-toggle" aria-hidden="true" />
            </label>
          )}
          <div className="settings-mode-row">
            <span>
              <strong>Открытый дашборд</strong>
              <small>{analysisMode === 'industry' ? 'Сравнение отраслей по трафику и атакам.' : 'Запросы ИИ-ботов к страницам сайта.'}</small>
            </span>
            <div className="settings-mode-toggle" role="group" aria-label="Режим анализа">
              <button type="button" className={analysisMode === 'logs' ? 'active' : ''} onClick={() => onAnalysisModeChange('logs')}>ИИ-боты</button>
              <button type="button" className={analysisMode === 'industry' ? 'active' : ''} onClick={() => onAnalysisModeChange('industry')}>Отраслевой</button>
            </div>
          </div>
        </div>
      </section>

      <section className="panel settings-data-library">
        <CardHead icon={<Database className="h-5 w-5" />} title="Файлы для отчётов" subtitle="Можно загрузить оба типа данных и спокойно переключаться между дашбордами." />
        <div className="settings-source-grid">
          <DataSourceCard
            icon={<Bot className="h-5 w-5" />}
            title="ИИ-боты"
            description="Для отчёта по страницам сайта, агентам, динамике запросов и источникам."
            files={logFiles}
            statLabel="Строки"
            statValue={formatNumber(totalRequests)}
            period={period}
            emptyText="Файл по ИИ-ботам ещё не загружен."
            actionLabel={logFiles.length ? 'Добавить CSV' : 'Загрузить CSV'}
            onUpload={onAddLogs}
          />
          <DataSourceCard
            icon={<Factory className="h-5 w-5" />}
            title="Отраслевой отчёт"
            description="Для сравнения отраслей по общему трафику, ботам и типам атак."
            files={industryFiles}
            statLabel="Трафик"
            statValue={formatNumber(totalIndustryRequests)}
            period={industryPeriod}
            emptyText="Отраслевой файл ещё не загружен."
            actionLabel={industryFiles.length ? 'Заменить CSV/TSV' : 'Загрузить CSV/TSV'}
            onUpload={onAddIndustry}
          />
        </div>
      </section>

      <section className="panel settings-danger-card">
        <div>
          <h2>Очистка</h2>
          <p>Удаляет загруженные данные из локального хранилища.</p>
        </div>
        <button className="danger-button" type="button" onClick={onClearLogs}>
          <Trash2 className="h-4 w-4" />
          Очистить данные
        </button>
      </section>
    </div>
  );
}

function CardHead({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="settings-card-head">
      <span className="settings-icon" aria-hidden="true">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-box">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function DataSourceCard({
  icon,
  title,
  description,
  files,
  statLabel,
  statValue,
  period,
  emptyText,
  actionLabel,
  onUpload,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  files: ImportedFileMeta[];
  statLabel: string;
  statValue: string;
  period: string;
  emptyText: string;
  actionLabel: string;
  onUpload: () => void;
}) {
  return (
    <article className="settings-source-card">
      <div className="settings-source-head">
        <span className="settings-icon" aria-hidden="true">{icon}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="settings-source-stats">
        <InfoBox label="Файлы" value={formatNumber(files.length)} />
        <InfoBox label={statLabel} value={statValue} />
        <InfoBox label="Период" value={period} />
      </div>
      <div className="settings-file-list">
        {files.length ? files.map((file) => (
          <div className="settings-file-row" key={file.id}>
            <strong>{file.name}</strong>
            <span>{formatNumber(file.rowCount)} строк</span>
          </div>
        )) : <p className="settings-empty">{emptyText}</p>}
      </div>
      <button className="primary-button settings-card-action" type="button" onClick={onUpload}>
        <Upload className="h-4 w-4" />
        {actionLabel}
      </button>
    </article>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}
