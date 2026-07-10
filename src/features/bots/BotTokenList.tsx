import type { CSSProperties } from 'react';
import type { AgentGroup } from '../../shared/types/domain';
import { getBotColor } from './botDictionary';

interface BotToken {
  name: string;
  groups?: AgentGroup[];
  active?: boolean;
}

export function BotTokenList({ bots, limit = 8 }: { bots: BotToken[]; limit?: number }) {
  if (!bots.length) return <span className="text-muted">Нет user-agent</span>;

  const visible = bots.slice(0, limit);
  const hidden = bots.length - visible.length;

  return (
    <span className="bot-token-list">
      {visible.map((bot) => (
        <span
          className={`bot-token ${bot.active ? 'is-active' : ''}`}
          key={bot.name}
          style={{ '--bot-color': getBotColor(bot.name, bot.groups) } as CSSProperties}
          title={bot.name}
        >
          <strong>{bot.name}</strong>
        </span>
      ))}
      {hidden > 0 && <span className="bot-token-more">+{hidden}</span>}
    </span>
  );
}
