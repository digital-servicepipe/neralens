import type { AgentGroup } from '../../shared/types/domain';

export const agentGroupLabels: Record<AgentGroup, string> = {
  ai_data_scraper_bot: 'Скраперы',
  ai_assistant_bot: 'Ассистенты',
  ai_agent_bot: 'Агенты',
  ai_bot_search_crawler: 'Поисковые боты',
};

export const agentGroupDescriptions: Record<AgentGroup, string> = {
  ai_data_scraper_bot: 'Сборщики данных и обучающие краулеры AI-систем.',
  ai_assistant_bot: 'Пользовательские ассистенты, которые открывают страницы по запросу человека.',
  ai_agent_bot: 'Автономные агенты, выполняющие цепочки действий и проверок.',
  ai_bot_search_crawler: 'AI-поисковики и индексирующие краулеры ответных систем.',
};

export const agentGroups: AgentGroup[] = [
  'ai_data_scraper_bot',
  'ai_assistant_bot',
  'ai_agent_bot',
  'ai_bot_search_crawler',
];

export const botSignatures: Record<AgentGroup, string[]> = {
  ai_data_scraper_bot: ['GPTBot', 'ClaudeBot', 'Bytespider', 'CCBot', 'Diffbot', 'FacebookBot', 'Meta-ExternalAgent'],
  ai_assistant_bot: ['ChatGPT-User', 'Claude-User', 'Perplexity-User', 'MistralAI-User', 'YouBot'],
  ai_agent_bot: ['ChatGPT Agent', 'Claude-Web', 'Operator', 'OpenAI-Operator', 'Agent'],
  ai_bot_search_crawler: ['OAI-SearchBot', 'PerplexityBot', 'Amazonbot', 'Applebot', 'Claude-SearchBot', 'Google-Extended'],
};

const normalizedGroupAliases: Record<string, AgentGroup> = {
  scrapers: 'ai_data_scraper_bot',
  scraper: 'ai_data_scraper_bot',
  'data_scrapers': 'ai_data_scraper_bot',
  'data scraper': 'ai_data_scraper_bot',
  'ai data scraper bot': 'ai_data_scraper_bot',
  'ai_data_scraper_bot': 'ai_data_scraper_bot',
  'скраперы': 'ai_data_scraper_bot',
  assistants: 'ai_assistant_bot',
  assistant: 'ai_assistant_bot',
  'ai assistant bot': 'ai_assistant_bot',
  'ai_assistant_bot': 'ai_assistant_bot',
  'ассистенты': 'ai_assistant_bot',
  agents: 'ai_agent_bot',
  agent: 'ai_agent_bot',
  'ai agent bot': 'ai_agent_bot',
  'ai_agent_bot': 'ai_agent_bot',
  'агенты': 'ai_agent_bot',
  search: 'ai_bot_search_crawler',
  search_crawlers: 'ai_bot_search_crawler',
  crawler: 'ai_bot_search_crawler',
  'search crawler': 'ai_bot_search_crawler',
  'ai bot search crawler': 'ai_bot_search_crawler',
  'ai_bot_search_crawler': 'ai_bot_search_crawler',
  'поисковые боты': 'ai_bot_search_crawler',
};

export function getBotDisplayName(botType: string, ua: string): string {
  const haystack = `${botType} ${ua}`.toLowerCase();
  for (const signatures of Object.values(botSignatures)) {
    const hit = signatures.find((signature) => haystack.includes(signature.toLowerCase()));
    if (hit) return hit;
  }
  return botType?.trim() || ua?.split(/[ /;]/)[0] || 'Unknown bot';
}

export function classifyAgentGroup(uaGroup: string | undefined, botType: string, ua: string): AgentGroup {
  const normalizedUaGroup = uaGroup?.trim().toLowerCase();
  if (normalizedUaGroup && normalizedGroupAliases[normalizedUaGroup]) return normalizedGroupAliases[normalizedUaGroup];

  const haystack = `${botType} ${ua}`.toLowerCase();
  for (const group of agentGroups) {
    if (botSignatures[group].some((signature) => haystack.includes(signature.toLowerCase()))) return group;
  }
  return 'ai_data_scraper_bot';
}
