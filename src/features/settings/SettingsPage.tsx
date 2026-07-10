import { FileText, Trash2, Upload } from 'lucide-react';
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
  const dates = rows.map((row) => row.date).filter((date) => date !== 'Unknown').sort();
  const period = dates.length ? `${formatDate(dates[0])} - ${formatDate(dates.at(-1) ?? dates[0])}` : 'Не определён';
  const first = rows.length ? formatDateTime(rows[0]) : 'Нет данных';
  const last = rows.length ? formatDateTime(rows[rows.length - 1]) : 'Нет данных';

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
          <strong>{formatNumber(rows.length)}</strong>
        </div>
        <div className="settings-side-card">
          <p>НАБОР</p>
          <strong>{files.length} файлов</strong>
          <span>Можно загружать несколько CSV подряд. Они объединяются автоматически.</span>
        </div>
      </aside>

      <section className="panel settings-card">
        <h2>Карты сайта</h2>
        <p className="settings-copy">Показывают, какие страницы есть на сайте. Так видно не только посещённые пути, но и ветки, куда AI-боты еще не заходили.</p>
        <InfoBox label="СЕЙЧАС" value={sitemapFiles.length ? `${sitemapFiles.length} файл(а)` : 'Не загружен'} hint={sitemapFiles.map((file) => file.name).join(', ')} />
        <button className="primary-button" onClick={onSitemapUpload}><Upload className="h-4 w-4" />Загрузить XML</button>
      </section>

      <section className="panel settings-card">
        <h2>robots.txt</h2>
        <p className="settings-copy">Помогает понять, какие разделы сайта закрыты для ботов и где запросы из логов могут упираться в ограничения доступа.</p>
        <InfoBox label="СЕЙЧАС" value={robotsTxt ? 'Загружен' : 'Не загружен'} hint="Используется в карте сайта и проверках доступности страниц." />
        <button className="primary-button" onClick={onRobotsUpload}><FileText className="h-4 w-4" />Загрузить TXT</button>
      </section>

      <section className="panel settings-card domain-card">
        <h2>Домен сайта</h2>
        <p className="settings-copy">Используется для открытия и копирования ссылок, когда в логах указан только путь.</p>
        <label className="settings-label">
          <span>БАЗОВЫЙ ДОМЕН</span>
          <input value={siteDomain} onChange={(event) => onSiteDomainChange(event.target.value)} />
        </label>
        <p className="settings-help">Можно указать домен с протоколом или без него, например `client.ru` или `https://client.ru`.</p>
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
