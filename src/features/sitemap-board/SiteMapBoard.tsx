import { useMemo, useState } from 'react';
import { Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { Check, Copy, ExternalLink, Filter, FolderTree } from 'lucide-react';
import { absoluteUrlForPath } from '../../shared/lib/url';
import { formatNumber, truncateMiddle } from '../../shared/lib/format';
import { Panel } from '../../shared/ui/Panel';
import { buildUrlSummaries, parseAllSitemapFiles } from '../analytics/selectors';
import { disallowMatches, parseRobotsTxt } from './sitemapParser';
import type { FiltersState, LogRow, SitemapUrl, TextFilePayload } from '../../shared/types/domain';

type Status = 'hot' | 'warm' | 'cold' | 'empty' | 'blocked';

interface GroupData extends Record<string, unknown> {
  label: string;
  fileName: string;
  totalRequests: number;
  urlCount: number;
  activeCount: number;
  expanded: boolean;
  onToggle: (key: string) => void;
  groupKey: string;
}

interface PathData extends Record<string, unknown> {
  title: string;
  path: string;
  fullUrl: string;
  total: number;
  status: Status;
  botLabels: string[];
  onPathSelect: (path: string) => void;
}

function statusOf(total: number, blocked: boolean, warm: number, hot: number): Status {
  if (blocked) return 'blocked';
  if (total <= 0) return 'empty';
  if (total >= hot) return 'hot';
  if (total >= warm) return 'warm';
  return 'cold';
}

function quantile(values: number[], percent: number): number {
  if (!values.length) return 0;
  return values[Math.min(values.length - 1, Math.floor(values.length * percent))] ?? 0;
}

function GroupNode({ data }: NodeProps<Node<GroupData>>) {
  return (
    <div className="fk-map-node fk-map-group">
      <Handle type="source" position={Position.Right} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-ink">{data.label}</p>
          <p className="mt-1 truncate text-xs font-bold uppercase text-muted">{data.fileName}</p>
          <p className="mt-1 text-xs text-muted">{formatNumber(data.urlCount)} URL, {formatNumber(data.totalRequests)} запросов</p>
        </div>
        <button className="badge" type="button" onClick={() => data.onToggle(data.groupKey)}>{data.expanded ? 'Скрыть' : `Показать ${data.urlCount}`}</button>
      </div>
      <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="bg-surface p-3"><p className="text-xs font-bold uppercase text-muted">URL</p><p className="text-lg font-extrabold text-ink">{formatNumber(data.urlCount)}</p></div>
        <div className="bg-surface p-3"><p className="text-xs font-bold uppercase text-muted">Активные</p><p className="text-lg font-extrabold text-ink">{formatNumber(data.activeCount)}</p></div>
      </div>
    </div>
  );
}

function PathNode({ data }: NodeProps<Node<PathData>>) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(data.fullUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className={`fk-map-node fk-map-path fk-map-path--${data.status}`}>
      <Handle type="target" position={Position.Left} />
      <div>
        <p className="text-sm font-extrabold text-ink" title={data.title}>{truncateMiddle(data.title, 34)}</p>
        <p className="mt-1 text-xs text-muted break-words">{truncateMiddle(data.path, 48)}</p>
        <div className="mt-2 flex gap-1" style={{ flexWrap: 'wrap' }}>
          {data.botLabels.slice(0, 1).map((bot) => <span className="badge" key={bot}>{truncateMiddle(bot, 18)}</span>)}
          {data.botLabels.length > 1 && <span className="badge">+{data.botLabels.length - 1}</span>}
          {!data.botLabels.length && <span className="badge">Нет запросов</span>}
        </div>
      </div>
      <div className="fk-map-path-actions">
        <button className="fk-map-path-action" type="button" title="Скопировать URL" onClick={() => void copy()}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
        <a className="fk-map-path-action" href={data.fullUrl} target="_blank" rel="noreferrer" title="Открыть URL"><ExternalLink className="h-4 w-4" /></a>
        <button className="fk-map-path-action" type="button" title="Поставить путь в фильтр" onClick={() => data.onPathSelect(data.path)}><Filter className="h-4 w-4" /></button>
      </div>
      <span className="badge" style={{ position: 'absolute', right: 12, top: 12 }}>{formatNumber(data.total)}</span>
    </div>
  );
}

const nodeTypes = { group: GroupNode, path: PathNode };

export function SiteMapBoard({
  rows,
  sitemapFiles,
  robotsTxt,
  siteDomain,
  onPathSelect,
}: {
  rows: LogRow[];
  filters: FiltersState;
  sitemapFiles: TextFilePayload[];
  robotsTxt: string;
  siteDomain: string;
  onPathSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const sitemapUrls = useMemo(() => parseAllSitemapFiles(sitemapFiles), [sitemapFiles]);
  const summaries = useMemo(() => buildUrlSummaries(rows, robotsTxt), [rows, robotsTxt]);
  const robots = useMemo(() => parseRobotsTxt(robotsTxt), [robotsTxt]);
  const sitemapByPath = useMemo(() => new Map(sitemapUrls.map((url) => [url.path, url])), [sitemapUrls]);
  const totals = summaries.map((item) => item.total).filter((value) => value > 0).sort((a, b) => a - b);
  const warm = quantile(totals, 0.35);
  const hot = quantile(totals, 0.75);

  const grouped = useMemo(() => {
    const groupMap = new Map<string, SitemapUrl[]>();
    sitemapFiles.forEach((file) => {
      parseAllSitemapFiles([file]).forEach((url) => {
        const list = groupMap.get(file.name) ?? [];
        list.push(url);
        groupMap.set(file.name, list);
      });
    });
    return Array.from(groupMap.entries());
  }, [sitemapFiles]);

  const graph = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let y = 0;
    grouped.forEach(([fileName, urls], fileIndex) => {
      const key = `sitemap:${fileName}:${fileIndex}`;
      const groupSummaries = urls.map((url) => summaries.find((summary) => summary.path === url.path)).filter(Boolean);
      const totalRequests = groupSummaries.reduce((sum, item) => sum + (item?.total ?? 0), 0);
      const isExpanded = expanded.includes(key);
      nodes.push({
        id: `group:${key}`,
        type: 'group',
        position: { x: 0, y },
        draggable: false,
        data: {
          groupKey: key,
          label: fileName,
          fileName,
          totalRequests,
          urlCount: urls.length,
          activeCount: groupSummaries.filter((summary) => (summary?.total ?? 0) > 0).length,
          expanded: isExpanded,
          onToggle: (nextKey: string) => setExpanded((current) => current.includes(nextKey) ? current.filter((item) => item !== nextKey) : [...current, nextKey]),
        } satisfies GroupData,
        style: { width: 320, height: 176 },
      });
      if (isExpanded) {
        urls
          .map((url) => ({ url, summary: summaries.find((summary) => summary.path === url.path) }))
          .sort((a, b) => (b.summary?.total ?? 0) - (a.summary?.total ?? 0))
          .slice(0, 240)
          .forEach(({ url, summary }, index) => {
            const column = index % 3;
            const row = Math.floor(index / 3);
            const blocked = summary ? summary.disallowedBy.length > 0 : disallowMatches({ path: url.path, botType: '*', httpUserAgent: '*' }, robots).length > 0;
            const status = statusOf(summary?.total ?? 0, blocked, warm, hot);
            const id = `path:${key}:${url.path}`;
            nodes.push({
              id,
              type: 'path',
              position: { x: 412 + column * 392, y: y + row * 172 },
              draggable: false,
              data: {
                title: url.title,
                path: url.path,
                fullUrl: absoluteUrlForPath(url.path, rows, siteDomain),
                total: summary?.total ?? 0,
                status,
                botLabels: Object.keys(summary?.bots ?? {}),
                onPathSelect,
              } satisfies PathData,
              style: { width: 360, height: 150 },
            });
            edges.push({ id: `edge:${key}:${url.path}`, source: `group:${key}`, target: id, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: 'rgba(141,160,158,.36)', strokeWidth: 1.2 } });
          });
      }
      y += Math.max(248, Math.ceil((isExpanded ? urls.length : 1) / 3) * 172 + 72);
    });
    return { nodes, edges };
  }, [expanded, grouped, hot, onPathSelect, robots, rows, siteDomain, summaries, warm]);

  const visibleSitemapPaths = sitemapUrls.filter((url) => sitemapByPath.has(url.path));
  const activeCount = visibleSitemapPaths.filter((url) => summaries.some((summary) => summary.path === url.path && summary.total > 0)).length;

  return (
    <Panel title="Карта сайта" subtitle="Sitemap-группы слева, URL-узлы справа. Цвет показывает поток запросов и robots-блокировки." action={<FolderTree className="h-4 w-4 text-aqua" />}>
      <div className="mb-3 flex gap-2" style={{ flexWrap: 'wrap' }}>
        <button className="badge" type="button" onClick={() => setExpanded(grouped.map(([name], index) => `sitemap:${name}:${index}`))}>Раскрыть всё</button>
        <button className="badge" type="button" onClick={() => setExpanded([])}>Свернуть всё</button>
        <span className="badge">URL в карте: {formatNumber(sitemapUrls.length)}</span>
        <span className="badge">С запросами: {formatNumber(activeCount)}</span>
      </div>
      <div className="fk-map-canvas">
        {graph.nodes.length ? (
          <ReactFlow nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} fitView nodesDraggable={false} panOnScroll zoomOnScroll minZoom={0.35} maxZoom={1.6} proOptions={{ hideAttribution: true }}>
            <Background color="rgba(141,160,158,.24)" gap={20} size={1} />
            <MiniMap pannable zoomable position="top-right" nodeBorderRadius={6} style={{ width: 280, height: 170, background: '#101213', border: '1px solid var(--fk-border-strong)', borderRadius: 8 }} />
            <Controls showInteractive={false} />
          </ReactFlow>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">Карта сайта пока не загружена. Добавьте sitemap XML.</div>
        )}
      </div>
      <div className="mt-3 flex gap-3 text-xs text-muted" style={{ flexWrap: 'wrap' }}>
        {(['hot', 'warm', 'cold', 'empty', 'blocked'] as Status[]).map((status) => <span key={status} className="badge"><span className="dot" style={{ background: status === 'blocked' ? 'var(--fk-danger)' : status === 'empty' ? '#65706f' : status === 'cold' ? '#7f9997' : status === 'warm' ? 'var(--fk-accent-soft)' : 'var(--fk-accent)' }} />{status}</span>)}
      </div>
    </Panel>
  );
}
