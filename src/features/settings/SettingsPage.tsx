import { Database, FileText, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
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
  onClearLogs: () => void;
  onServicepipeLogsChange: (value: boolean) => void;
  onAnalysisModeChange: (value: AnalysisMode) => void;
}

export function SettingsPage({ analysisMode, rows, industryRows, files, servicepipeLogs, onAddLogs, onClearLogs, onServicepipeLogsChange, onAnalysisModeChange }: SettingsPageProps) {
  const dates = rows.map((row) => row.date).filter((date) => date !== 'Unknown').sort();
  const industryDates = industryRows.map((row) => row.date).filter((date) => date !== 'Unknown').sort();
  const period = dates.length ? `${formatDate(dates[0])} - ${formatDate(dates.at(-1) ?? dates[0])}` : 'Не определён';
  const industryPeriod = industryDates.length ? `${formatDate(industryDates[0])} - ${formatDate(industryDates.at(-1) ?? industryDates[0])}` : 'Не определён';
  const uniquePaths = new Set(rows.map((row) => row.path)).size;
  const industries = new Set(industryRows.map((row) => row.industry)).size;
  const totalRequests = totalRequestCount(rows);
  const totalIndustryRequests = totalIndustryTraffic(industryRows);
  const visibleFiles = useMemo(() => files.filter((file) => file.kind === analysisMode), [analysisMode, files]);

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
          <InfoBox label="Файлы" value={formatNumber(visibleFiles.length)} />
          <InfoBox label="Период" value={analysisMode === 'industry' ? industryPeriod : period} />
          <InfoBox label={analysisMode === 'industry' ? 'Отрасли' : 'URL из логов'} value={formatNumber(analysisMode === 'industry' ? industries : uniquePaths)} />
        </div>
      </section>

      <section className="panel settings-upload-card settings-data-card">
        <CardHead icon={<FileText className="h-5 w-5" />} title={analysisMode === 'industry' ? 'Отраслевой файл' : 'Файл по ИИ-ботам'} subtitle={analysisMode === 'industry' ? 'CSV/TSV с отраслевыми метриками атак.' : 'CSV с запросами ИИ-ботов.'} />
        <div className="settings-card-body">
          <div className="settings-card-stats">
            <InfoBox label="Файлы" value={formatNumber(visibleFiles.length)} />
            <InfoBox label={analysisMode === 'industry' ? 'Трафик' : 'Строки'} value={formatNumber(analysisMode === 'industry' ? totalIndustryRequests : totalRequests)} />
          </div>
          <div className="settings-file-list">
            {visibleFiles.length ? visibleFiles.map((file) => (
              <div className="settings-file-row" key={file.id}>
                <strong>{file.name}</strong>
                <span>{formatNumber(file.rowCount)} строк</span>
              </div>
            )) : <p className="settings-empty">{analysisMode === 'industry' ? 'Отраслевой файл пока не загружен.' : 'Файлы логов пока не загружены.'}</p>}
          </div>
          <button className="primary-button settings-card-action" type="button" onClick={onAddLogs}>
            <Upload className="h-4 w-4" />
            {analysisMode === 'industry' ? 'Загрузить CSV/TSV' : 'Добавить CSV'}
          </button>
        </div>
      </section>

      <section className="panel settings-options-card settings-preferences-card">
        <CardHead icon={<SlidersHorizontal className="h-5 w-5" />} title="Параметры анализа" subtitle="Режим отчёта и обработка логов." />
        <div className={`settings-preferences-grid ${analysisMode === 'logs' ? '' : 'single'}`}>
          {analysisMode === 'logs' && (
            <label className="settings-toggle-row">
              <span>
                <strong>Логи Servicepipe</strong>
                <small>{servicepipeLogs ? 'Да: подставляем встроенные русские тайтлы.' : 'Нет: показываем названия из URL или загруженного JSON.'}</small>
              </span>
              <input type="checkbox" checked={servicepipeLogs} onChange={(event) => onServicepipeLogsChange(event.currentTarget.checked)} />
              <span className="settings-toggle" aria-hidden="true" />
            </label>
          )}
          <div className="settings-mode-row">
            <span>
              <strong>Режим анализа</strong>
              <small>{analysisMode === 'industry' ? 'Отраслевой отчёт по атакам.' : 'Аналитика запросов ИИ-ботов.'}</small>
            </span>
            <div className="settings-mode-toggle" role="group" aria-label="Режим анализа">
              <button type="button" className={analysisMode === 'logs' ? 'active' : ''} onClick={() => onAnalysisModeChange('logs')}>ИИ-боты</button>
              <button type="button" className={analysisMode === 'industry' ? 'active' : ''} onClick={() => onAnalysisModeChange('industry')}>Отраслевой</button>
            </div>
          </div>
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

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}
