import { Database, FileText, Network, Trash2, Upload } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { parseAllSitemapFiles, totalRequestCount } from '../analytics/selectors';
import { formatNumber } from '../../shared/lib/format';
import type { ImportedFileMeta, LogRow, TextFilePayload } from '../../shared/types/domain';

interface SettingsPageProps {
  rows: LogRow[];
  files: ImportedFileMeta[];
  sitemapFiles: TextFilePayload[];
  onAddLogs: () => void;
  onSitemapUpload: () => void;
  onClearLogs: () => void;
}

export function SettingsPage({ rows, files, sitemapFiles, onAddLogs, onSitemapUpload, onClearLogs }: SettingsPageProps) {
  const sitemapUrls = useMemo(() => parseAllSitemapFiles(sitemapFiles), [sitemapFiles]);
  const dates = rows.map((row) => row.date).filter((date) => date !== 'Unknown').sort();
  const period = dates.length ? `${formatDate(dates[0])} - ${formatDate(dates.at(-1) ?? dates[0])}` : 'Не определён';
  const uniquePaths = new Set(rows.map((row) => row.path)).size;
  const totalRequests = totalRequestCount(rows);

  return (
    <div className="settings-page">
      <section className="panel settings-hero">
        <div className="settings-hero-copy">
          <span className="settings-icon" aria-hidden="true"><Database className="h-5 w-5" /></span>
          <div>
            <h2>Данные проекта</h2>
            <p>Логи и sitemap хранятся в браузере и восстанавливаются после обновления страницы.</p>
          </div>
        </div>
        <div className="settings-metrics">
          <InfoBox label="Строки" value={formatNumber(totalRequests)} />
          <InfoBox label="Файлы логов" value={formatNumber(files.length)} />
          <InfoBox label="Период" value={period} />
          <InfoBox label="URL из логов" value={formatNumber(uniquePaths)} />
        </div>
      </section>

      <section className="panel settings-upload-card">
        <CardHead icon={<FileText className="h-5 w-5" />} title="Логи" subtitle="CSV с запросами AI-ботов." />
        <div className="settings-card-body">
          <div className="settings-file-list">
            {files.length ? files.map((file) => (
              <div className="settings-file-row" key={file.id}>
                <strong>{file.name}</strong>
                <span>{formatNumber(file.rowCount)} строк</span>
              </div>
            )) : <p className="settings-empty">Файлы логов пока не загружены.</p>}
          </div>
          <button className="primary-button settings-card-action" type="button" onClick={onAddLogs}>
            <Upload className="h-4 w-4" />
            Добавить CSV
          </button>
        </div>
      </section>

      <section className="panel settings-upload-card">
        <CardHead icon={<Network className="h-5 w-5" />} title="Sitemap" subtitle="XML-карты сайта и JSON с названиями страниц." />
        <div className="settings-card-body">
          <div className="settings-card-stats">
            <InfoBox label="Файлы" value={formatNumber(sitemapFiles.length)} />
            <InfoBox label="URL" value={formatNumber(sitemapUrls.length)} />
          </div>
          <div className="settings-file-list">
            {sitemapFiles.length ? sitemapFiles.map((file) => (
              <div className="settings-file-row" key={file.name}>
                <strong>{file.name}</strong>
                <span>{formatNumber(file.content.length)} символов</span>
              </div>
            )) : <p className="settings-empty">Sitemap пока не загружен.</p>}
          </div>
          <button className="primary-button settings-card-action" type="button" onClick={onSitemapUpload}>
            <Upload className="h-4 w-4" />
            Загрузить XML/JSON
          </button>
        </div>
      </section>

      <section className="panel settings-danger-card">
        <div>
          <h2>Очистка</h2>
          <p>Удаляет загруженные логи и sitemap из локального хранилища.</p>
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
