import { useRef, type ReactNode } from 'react';
import { Download } from 'lucide-react';

type ExportFormat = 'svg' | 'png';

export function ExportableChart({ fileName, children }: { fileName: string; children: ReactNode }) {
  const chartRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={chartRef} className="exportable-chart" data-chart-export-name={fileName}>
      {children}
    </div>
  );
}

export function ChartExportMenu({ fileName }: { fileName: string }) {
  return (
    <div className="chart-export-menu" role="group" aria-label="Скачать график">
      <button type="button" className="chart-export-button primary" title="Скачать график в PNG" aria-label="Скачать график в PNG" onClick={() => exportChart(fileName, 'png')}>
        <Download size={15} strokeWidth={2.2} />
        <span>PNG</span>
      </button>
      <button type="button" className="chart-export-button" title="Скачать график в SVG" aria-label="Скачать график в SVG" onClick={() => exportChart(fileName, 'svg')}>
        SVG
      </button>
    </div>
  );
}

export function chartExportFileName(title: string) {
  return `nera-lens-${title
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')}`;
}

function exportChart(fileName: string, format: ExportFormat) {
  const container = document.querySelector(`[data-chart-export-name="${CSS.escape(fileName)}"]`);
  const svg = container?.querySelector('svg');
  if (!svg) return;

  const serializedSvg = serializeSvg(svg);
  if (format === 'svg') {
    downloadBlob(new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' }), `${fileName}.svg`);
    return;
  }

  exportSvgAsPng(serializedSvg, svg, fileName);
}

function serializeSvg(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const rootStyles = getComputedStyle(document.documentElement);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(svg.clientWidth || svg.getBoundingClientRect().width));
  clone.setAttribute('height', String(svg.clientHeight || svg.getBoundingClientRect().height));
  clone.style.setProperty('--fk-muted', rootStyles.getPropertyValue('--fk-muted').trim() || '#8e918f');
  clone.style.setProperty('--fk-text', rootStyles.getPropertyValue('--fk-text').trim() || '#e3e3e3');

  return new XMLSerializer().serializeToString(clone);
}

function exportSvgAsPng(serializedSvg: string, sourceSvg: SVGSVGElement, fileName: string) {
  const image = new Image();
  const svgUrl = URL.createObjectURL(new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' }));
  const width = sourceSvg.clientWidth || Math.ceil(sourceSvg.getBoundingClientRect().width);
  const height = sourceSvg.clientHeight || Math.ceil(sourceSvg.getBoundingClientRect().height);
  const scale = 4;

  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      URL.revokeObjectURL(svgUrl);
      return;
    }
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--fk-card').trim() || '#1e1f20';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(svgUrl);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${fileName}.png`);
    }, 'image/png', 1);
  };
  image.onerror = () => URL.revokeObjectURL(svgUrl);
  image.src = svgUrl;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
