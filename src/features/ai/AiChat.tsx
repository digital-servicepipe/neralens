import { Fragment, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, Copy, Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import type { useAnalytics } from '../analytics/useAnalytics';
import { buildAiContextPackage, DEFAULT_AI_PROMPT, DEFAULT_OPENROUTER_MODEL, FALLBACK_OPENROUTER_MODELS } from './aiContext';

type Analytics = ReturnType<typeof useAnalytics>;
type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface AiChatProps {
  open: boolean;
  onClose: () => void;
  analytics: Analytics;
}

const promptStorage = 'neralens-ai-prompt';
const unavailableDefaults = new Set([
  'deepseek/deepseek-r1-0528:free',
  'qwen/qwen3-235b-a22b:free',
  'openrouter/owl-alpha',
  'openrouter/free',
]);
const env = import.meta.env as Record<string, string | undefined>;
const OPENROUTER_MODEL = normalizeModel(env.VITE_OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL);

function createId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export function AiChat({ open, onClose, analytics }: AiChatProps) {
  const prompt = env.VITE_NERALENS_AI_PROMPT || localStorage.getItem(promptStorage) || DEFAULT_AI_PROMPT;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: 'assistant',
      content: 'Привет. Спроси, что проверить в логах AI-ботов.',
    },
  ]);
  const [isSending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const contextPackage = useMemo(() => buildAiContextPackage({ analytics }), [analytics]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }, [open, messages]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || isSending) return;
    const userMessage: ChatMessage = { id: createId(), role: 'user', content: question };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    resetInputHeight();
    setSending(true);
    setError('');

    try {
      const data = await requestOpenRouter({
        model: OPENROUTER_MODEL,
        prompt: prompt.trim() || DEFAULT_AI_PROMPT,
        contextPackage,
        messages: nextMessages,
      });
      const answer = data?.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error('Модель вернула пустой ответ.');
      setMessages((current) => [...current, { id: createId(), role: 'assistant', content: answer }]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Не удалось получить ответ от OpenRouter.';
      setError(message);
      setMessages((current) => [...current, { id: createId(), role: 'assistant', content: `Не получилось отправить запрос. ${message}` }]);
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    requestAnimationFrame(resizeInput);
  };

  const resizeInput = () => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(156, node.scrollHeight)}px`;
  };

  const resetInputHeight = () => {
    requestAnimationFrame(() => {
      const node = inputRef.current;
      if (node) node.style.height = '';
    });
  };

  const copyMessage = async (message: ChatMessage) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId((current) => (current === message.id ? '' : current)), 1200);
  };

  const startNewChat = () => {
    setMessages([{
      id: createId(),
      role: 'assistant',
      content: 'Новый диалог. Что посмотрим в логах?',
    }]);
    setError('');
    setInput('');
    resetInputHeight();
  };

  return (
    <div className="ai-chat-backdrop" role="dialog" aria-modal="true" aria-label="NeraLens AI">
      <section className="ai-chat-panel">
        <header className="ai-chat-head">
          <div className="ai-chat-title">
            <span><Sparkles className="h-4 w-4" /></span>
            <div>
              <h2>NeraLens AI</h2>
              <p>Аналитик логов AI-ботов</p>
            </div>
          </div>
          <div className="ai-chat-actions">
            <button className="ai-icon-button" type="button" onClick={startNewChat} aria-label="Новый диалог" title="Новый диалог">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button className="ai-icon-button" type="button" onClick={onClose} aria-label="Закрыть" title="Закрыть">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="ai-chat-messages" ref={scrollRef}>
          {messages.map((message) => (
            <article className={`ai-message ${message.role}`} key={message.id}>
              <div className="ai-message-avatar">{message.role === 'assistant' ? <Bot className="h-4 w-4" /> : 'Вы'}</div>
              <div className="ai-message-content">
                <div className="ai-message-body">{message.role === 'assistant' ? renderMarkdown(message.content) : message.content}</div>
                {message.role === 'assistant' && (
                  <button className="ai-message-action" type="button" onClick={() => void copyMessage(message)} aria-label="Скопировать ответ" title="Скопировать">
                    {copiedId === message.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </article>
          ))}
          {isSending && (
            <article className="ai-message assistant">
              <div className="ai-message-avatar"><Loader2 className="h-4 w-4 spin" /></div>
              <div className="ai-message-content">
                <div className="ai-message-body ai-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </article>
          )}
        </div>

        {error && <div className="ai-chat-error">{error}</div>}

        <form className="ai-chat-composer" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => handleInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Спроси, что проверить в логах..."
            rows={1}
          />
          <button className="ai-send-button" type="submit" disabled={isSending || !input.trim()} aria-label="Отправить" title="Отправить">
            {isSending ? <Loader2 className="h-4 w-4 spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </section>
    </div>
  );
}

function normalizeModel(value: string) {
  const model = value.trim();
  if (!model || unavailableDefaults.has(model)) return DEFAULT_OPENROUTER_MODEL;
  return model;
}

function renderMarkdown(markdown: string) {
  const parts = markdown.split(/(```[\s\S]*?```)/g).filter(Boolean);
  return (
    <div className="ai-markdown">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const code = part.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, '').trim();
          return <pre key={index}><code>{code}</code></pre>;
        }
        return <Fragment key={index}>{renderTextMarkdown(part, index)}</Fragment>;
      })}
    </div>
  );
}

function renderTextMarkdown(text: string, seed: number) {
  const nodes: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let paragraph: string[] = [];
  let listItems: ReactNode[][] = [];
  let listType: 'ul' | 'ol' | null = null;
  let lastListItem: ReactNode[] | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    nodes.push(<p key={`${seed}-p-${nodes.length}`}>{renderInline(paragraph.join(' '))}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) return;
    const Tag = listType;
    nodes.push(
      <Tag key={`${seed}-list-${nodes.length}`}>
        {listItems.map((item, index) => <li key={index}>{item}</li>)}
      </Tag>,
    );
    listItems = [];
    listType = null;
    lastListItem = null;
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (isTableLine(line)) {
      flushParagraph();
      flushList();
      const tableLines: string[] = [];
      while (lineIndex < lines.length && isTableLine(lines[lineIndex].trim())) {
        tableLines.push(lines[lineIndex].trim());
        lineIndex += 1;
      }
      lineIndex -= 1;
      const table = renderTable(tableLines, `${seed}-table-${nodes.length}`);
      if (table) nodes.push(table);
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const Tag = (`h${level + 2}` as 'h3' | 'h4' | 'h5');
      nodes.push(<Tag key={`${seed}-h-${nodes.length}`}>{renderInline(heading[2])}</Tag>);
      continue;
    }

    const boldHeading = /^\*\*(.+)\*\*$/.exec(line);
    if (boldHeading) {
      flushParagraph();
      flushList();
      nodes.push(<h3 key={`${seed}-bh-${nodes.length}`}>{renderInline(boldHeading[1])}</h3>);
      continue;
    }

    const quote = /^>\s+(.+)$/.exec(line);
    if (quote) {
      flushParagraph();
      flushList();
      nodes.push(<blockquote key={`${seed}-q-${nodes.length}`}>{renderInline(quote[1])}</blockquote>);
      continue;
    }

    const list = /^(\d+[.)]|[-*])\s+(.+)$/.exec(line);
    if (list) {
      flushParagraph();
      const nextType = /^\d/.test(list[1]) ? 'ol' : 'ul';
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      lastListItem = renderInline(list[2]);
      listItems.push(lastListItem);
      continue;
    }

    if (listType && lastListItem && /^\s{2,}\S/.test(rawLine)) {
      lastListItem.push(' ', ...renderInline(line));
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return nodes;
}

function isTableLine(line: string) {
  return line.startsWith('|') && line.endsWith('|') && line.slice(1, -1).includes('|');
}

function parseTableCells(line: string) {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorRow(cells: string[]) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderTable(lines: string[], key: string) {
  const rows = lines.map(parseTableCells).filter((cells) => cells.some(Boolean));
  if (rows.length < 2) return null;
  const [head, maybeSeparator, ...rest] = rows;
  const body = isSeparatorRow(maybeSeparator) ? rest : [maybeSeparator, ...rest];
  if (!body.length) return null;

  return (
    <div className="ai-markdown-table-wrap" key={key}>
      <table className="ai-markdown-table">
        <thead>
          <tr>{head.map((cell, index) => <th key={index}>{renderInline(cell)}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {head.map((_, cellIndex) => <td key={cellIndex}>{renderInline(row[cellIndex] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|https?:\/\/[^\s)]+|`([^`]+)`|\*\*([^*]+)\*\*)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;

    if (match[2] && match[3]) {
      nodes.push(renderLink(match[2], match[3], key));
    } else if (match[4]) {
      nodes.push(<code key={key}>{match[4]}</code>);
    } else if (match[5]) {
      nodes.push(<strong key={key}>{renderInline(match[5])}</strong>);
    } else if (token.startsWith('http')) {
      const { href, suffix } = splitUrlPunctuation(token);
      nodes.push(renderLink(href, href, key));
      if (suffix) nodes.push(suffix);
    }
    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function splitUrlPunctuation(url: string) {
  const match = /([.,;:!?]+)$/.exec(url);
  if (!match) return { href: url, suffix: '' };
  return { href: url.slice(0, -match[1].length), suffix: match[1] };
}

function renderLink(label: string, rawHref: string, key: string) {
  const href = sanitizeHref(rawHref);
  if (!href) return <span key={key}>{label}</span>;
  return (
    <a key={key} href={href} target={href.startsWith('#') ? undefined : '_blank'} rel="noreferrer">
      {label}
    </a>
  );
}

function sanitizeHref(rawHref: string) {
  const href = rawHref.trim();
  if (/^(https?:|mailto:)/i.test(href)) return href;
  if (/^\/[^\s]*$/.test(href)) return href;
  if (/^#[^\s]*$/.test(href)) return href;
  return '';
}

function formatOpenRouterError(body: string, status: number) {
  try {
    const parsed = JSON.parse(body);
    const message = parsed?.error?.message || parsed?.message;
    if (message) return message;
  } catch {
    // Plain text response.
  }
  return body || `OpenRouter вернул ${status}`;
}

async function requestOpenRouter({
  model,
  prompt,
  contextPackage,
  messages,
}: {
  model: string;
  prompt: string;
  contextPackage: unknown;
  messages: ChatMessage[];
}) {
  const models = Array.from(new Set([model, ...FALLBACK_OPENROUTER_MODELS]));
  const requestMessages = [
    { role: 'system', content: prompt },
    {
      role: 'user',
      content: `Агрегат логов AI-ботов. Поля: path, userAgent, requests, firstSeen, lastSeen, days, hours, statuses.\n${JSON.stringify(contextPackage, null, 2)}`,
    },
    ...messages.slice(-8).map((message) => ({ role: message.role, content: message.content })),
  ];
  const errors: string[] = [];

  for (const candidate of models) {
    const response = await fetch('/api/openrouter/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: candidate,
        messages: requestMessages,
        temperature: 0.2,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const answer = data?.choices?.[0]?.message?.content?.trim() ?? '';
      if (isNonAnswer(answer)) {
        errors.push(`${candidate}: модель вернула служебный safety-ответ вместо анализа`);
        continue;
      }
      return { ...data, modelUsed: candidate };
    }

    const body = await response.text();
    errors.push(`${candidate}: ${formatOpenRouterError(body, response.status)}`);
    if (![404, 429, 503].includes(response.status)) break;
  }

  throw new Error(`Модели недоступны сейчас:\n${errors.slice(0, 5).join('\n')}`);
}

function isNonAnswer(answer: string) {
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return true;
  if (/^user safety:\s*safe\b/i.test(answer)) return true;
  if (/^safe$/i.test(answer)) return true;
  return false;
}
