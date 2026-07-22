import { FileText, Network, Trash2, Upload } from 'lucide-react';
import { useMemo } from 'react';
import { parseAllSitemapFiles, totalRequestCount } from '../analytics/selectors';
import { parseRobotsTxt } from '../sitemap-board/sitemapParser';
import { formatNumber } from '../../shared/lib/format';
import type { ImportedFileMeta, LogRow, TextFilePayload } from '../../shared/types/domain';

interface SettingsPageProps {
  rows: LogRow[];
  files: ImportedFileMeta[];
  sitemapFiles: TextFilePayload[];
  robotsTxt: string;
  siteDomain: string;
  onSiteDomainChange: (domain: string) => void;
  onAddLogs: () => void;
  onSitemapUpload: () => void;
  onRobotsUpload: () => void;
  onClearLogs: () => void;
}

export function SettingsPage({ rows, files, sitemapFiles, robotsTxt, siteDomain, onSiteDomainChange, onAddLogs, onSitemapUpload, onRobotsUpload, onClearLogs }: SettingsPageProps) {
  const sitemapUrls = useMemo(() => parseAllSitemapFiles(sitemapFiles), [sitemapFiles]);
  const robotsRules = useMemo(() => parseRobotsTxt(robotsTxt), [robotsTxt]);
  const dates = rows.map((row) => row.date).filter((date) => date !== 'Unknown').sort();
  const period = dates.length ? `${formatDate(dates[0])} - ${formatDate(dates.at(-1) ?? dates[0])}` : 'Не определён';
  const first = rows.length ? formatDateTime(rows[0]) : 'Нет данных';
  const last = rows.length ? formatDateTime(rows[rows.length - 1]) : 'Нет данных';
  const sitemapGroups = new Set(sitemapUrls.map((url) => url.group)).size;
  const sitemapActivePaths = new Set(rows.map((row) => row.path)).size;
  const totalRequests = totalRequestCount(rows);
  const disallowCount = robotsRules.filter((rule) => rule.directive === 'disallow').length;
  const sitemapRules = robotsRules.filter((rule) => rule.directive === 'sitemap').length;

  return (
    <div className="settings-grid">
      <section className="panel settings-main">
        <h2>Файлы</h2>
        <p className="settings-copy">Загружайте CSV, объединяйте их в один набор и очищайте базу, если нужно начать новый анализ.</p>
        <div className="settings-stats">
          <InfoBox label="ФАЙЛЫ" value={files.map((file) => file.name).join(', ') || 'Не загружены'} />
          <InfoBox label="ПЕРИОД" value={period} />
          <InfoBox label="ПЕРВАЯ ЗАПИСЬ" value={first} />
          <InfoBox label="ПОСЛЕДНЯЯ ЗАПИСЬ" value={last} />
        </div>
        <div className="settings-actions">
          <button className="primary-button" onClick={onAddLogs}><Upload className="h-4 w-4" />Добавить CSV</button>
          <button className="danger-button" onClick={onClearLogs}><Trash2 className="h-4 w-4" />Очистить данные</button>
        </div>
      </section>

      <aside className="panel settings-side">
        <h2>База</h2>
        <div className="settings-side-card">
          <p>СТРОКИ</p>
          <strong>{formatNumber(totalRequests)}</strong>
        </div>
        <div className="settings-side-card">
          <p>НАБОР</p>
          <strong>{files.length} файлов</strong>
          <span>Можно загружать несколько CSV подряд. Они объединяются автоматически.</span>
        </div>
      </aside>

      <section className="panel settings-card domain-card">
        <h2>Домен сайта</h2>
        <p className="settings-copy">Используется для открытия и копирования ссылок, когда в логах указан только путь.</p>
        <label className="settings-label">
          <span>БАЗОВЫЙ ДОМЕН</span>
          <input value={siteDomain} onChange={(event) => onSiteDomainChange(event.target.value)} />
        </label>
        <p className="settings-help">Можно указать домен с протоколом или без него, например `client.ru` или `https://client.ru`.</p>
      </section>

      <section className="panel settings-card settings-sitemap-card">
        <div className="section-heading">
          <div>
            <h2>Sitemap</h2>
            <p>XML-карты сайта и JSON-файлы с названиями страниц.</p>
          </div>
          <Network className="h-5 w-5 text-aqua" />
        </div>
        <div className="settings-stats sitemap-stats">
          <InfoBox label="ФАЙЛЫ" value={sitemapFiles.length ? `${sitemapFiles.length}` : '0'} hint={fileNames(sitemapFiles) || 'Пока не загружены'} />
          <InfoBox label="URL В SITEMAP" value={formatNumber(sitemapUrls.length)} />
          <InfoBox label="ГРУППЫ" value={formatNumber(sitemapGroups)} />
          <InfoBox label="URL ИЗ ЛОГОВ" value={formatNumber(sitemapActivePaths)} />
        </div>
        <div className="settings-file-list">
          {sitemapFiles.length ? sitemapFiles.map((file) => (
            <div className="settings-file-row" key={file.name}>
              <strong>{file.name}</strong>
              <span>{formatNumber(file.content.length)} символов</span>
            </div>
          )) : <p className="settings-copy">Sitemap-файлы пока не загружены.</p>}
        </div>
        <button className="primary-button" type="button" onClick={onSitemapUpload}><Upload className="h-4 w-4" />Загрузить XML/JSON</button>
      </section>

      <section className="panel settings-card settings-robots-card">
        <div className="section-heading">
          <div>
            <h2>robots.txt</h2>
            <p>Правила доступа для краулеров, sitemap-директивы и ограничения обхода.</p>
          </div>
          <FileText className="h-5 w-5 text-aqua" />
        </div>
        <div className="settings-stats sitemap-stats">
          <InfoBox label="СТАТУС" value={robotsTxt ? 'Загружен' : 'Не загружен'} />
          <InfoBox label="ПРАВИЛА" value={formatNumber(robotsRules.length)} />
          <InfoBox label="DISALLOW" value={formatNumber(disallowCount)} />
          <InfoBox label="SITEMAP" value={formatNumber(sitemapRules)} />
        </div>
        <div className="settings-rule-list">
          {robotsRules.length ? robotsRules.slice(0, 8).map((rule, index) => (
            <div className="settings-rule-row" key={`${rule.agent}-${rule.directive}-${rule.value}-${index}`}>
              <span>{rule.agent}</span>
              <strong>{rule.directive}</strong>
              <code>{rule.value || '/'}</code>
            </div>
          )) : <p className="settings-copy">robots.txt пока не загружен.</p>}
        </div>
        <button className="primary-button" type="button" onClick={onRobotsUpload}><Upload className="h-4 w-4" />Загрузить TXT</button>
      </section>
    </div>
  );
}

function InfoBox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="info-box">
      <p>{label}</p>
      <strong>{value}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function formatDateTime(row: LogRow) {
  if (!row.date || row.date === 'Unknown') return row.datetimeRaw || 'Нет данных';
  return `${formatDate(row.date)}${row.hour == null ? '' : `, ${String(row.hour).padStart(2, '0')}:${String(row.minute ?? 0).padStart(2, '0')}`}`;
}

function fileNames(files: TextFilePayload[]) {
  return files.map((file) => file.name).join(', ');
}
