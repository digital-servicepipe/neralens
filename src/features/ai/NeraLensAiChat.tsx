import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BotMessageSquare, Eraser, Loader2, Send, Settings, Sparkles, X } from 'lucide-react';
import type { IndustryRow } from '../../shared/types/domain';
import { sendNeraLensAiMessage, type AiChatMessage, type NeraLensAiConfig } from './neraLensAi';

export function NeraLensAiChat({
  open,
  rows,
  config,
  onClose,
  onOpenSettings,
}: {
  open: boolean;
  rows: IndustryRow[];
  config: NeraLensAiConfig;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [isSending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canSend = draft.trim().length > 0 && !isSending && rows.length > 0;
  const quickPrompts = [
    'Сделай короткое резюме для PR-релиза',
    'Найди главный инфоповод в отчёте',
    'Какие отрасли стоит выделить в новости?',
  ];

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 170)}px`;
  }, [draft]);

  if (!open) return null;

  const submit = async () => {
    const content = draft.trim();
    if (!content || isSending) return;
    const nextMessages = [...messages, { role: 'user', content } satisfies AiChatMessage];
    setMessages(nextMessages);
    setDraft('');
    setError('');
    setSending(true);
    try {
      const answer = await sendNeraLensAiMessage(config, nextMessages, rows);
      setMessages([...nextMessages, { role: 'assistant', content: answer }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось отправить запрос.');
    } finally {
      setSending(false);
    }
  };

  const applyQuickPrompt = (value: string) => {
    setDraft(value);
    setError('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <div className="ai-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="ai-modal" role="dialog" aria-modal="true" aria-label="NeraLens AI">
        <header className="ai-modal-head">
          <div className="ai-title-row">
            <span className="ai-title-icon" aria-hidden="true"><Sparkles className="h-5 w-5" /></span>
            <h2>NeraLens AI</h2>
          </div>
          <div className="ai-modal-actions">
            {messages.length > 0 && (
              <button type="button" title="Очистить чат" aria-label="Очистить чат" onClick={() => { setMessages([]); setError(''); }}>
                <Eraser className="h-4 w-4" />
              </button>
            )}
            <button type="button" title="Настройки AI" aria-label="Настройки AI" onClick={onOpenSettings}>
              <Settings className="h-4 w-4" />
            </button>
            <button type="button" title="Закрыть" aria-label="Закрыть" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="ai-message-list" ref={scrollRef}>
          {!messages.length && (
            <div className="ai-empty-message">
              <BotMessageSquare className="h-5 w-5" />
              <strong>Что подготовить по отчёту?</strong>
              <div className="ai-quick-prompts">
                {quickPrompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => applyQuickPrompt(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <article className={`ai-message ${message.role}`} key={`${message.role}-${index}`}>
              <span>{message.role === 'user' ? 'Вы' : 'NeraLens AI'}</span>
              {message.role === 'assistant' ? <MarkdownMessage content={message.content} /> : <p>{message.content}</p>}
            </article>
          ))}
          {isSending && <article className="ai-message assistant pending"><span>NeraLens AI</span><p><Loader2 className="h-4 w-4" />Думаю...</p></article>}
        </div>

        {error && <div className="ai-error">{error}</div>}

        <form className="ai-compose" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <div className="ai-compose-field">
            <textarea
              ref={textareaRef}
              value={draft}
              rows={1}
              placeholder="Напишите вопрос по отчёту"
              onChange={(event) => setDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
          </div>
          <button type="submit" disabled={!canSend} title="Отправить" aria-label="Отправить">
            <Send className="h-4 w-4" />
            Отправить
          </button>
        </form>
      </section>
    </div>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let listItems: ReactNode[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(<ul key={`list-${blocks.length}`}>{listItems}</ul>);
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flushList();
      blocks.push(<h3 key={`h-${index}`}>{renderInlineMarkdown(heading[1])}</h3>);
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/);
    if (bullet) {
      listItems.push(<li key={`li-${index}`}>{renderInlineMarkdown(bullet[1])}</li>);
      return;
    }

    flushList();
    blocks.push(<p key={`p-${index}`}>{renderInlineMarkdown(trimmed)}</p>);
  });

  flushList();
  return <div className="ai-markdown">{blocks}</div>;
}

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    return bold ? <strong key={index}>{bold[1]}</strong> : part;
  });
}
