import type { AgentGroup } from '../types/domain';

export const palette = {
  bg: '#0e0e0f',
  surface: '#1e1f20',
  card: '#222327',
  cardHover: '#2a2a2a',
  border: 'rgba(255,255,255,.08)',
  borderStrong: 'rgba(255,255,255,.12)',
  text: '#e3e3e3',
  muted: '#8e918f',
  accent: '#2dd4bf',
  accentSoft: '#70d6ca',
  danger: '#f18a96',
  warning: '#d6bc72',
  info: '#8bbfd7',
};

export const chartColors = ['#2dd4bf', '#70d6ca', '#8bbfd7', '#d6bc72', '#f18a96', '#7f9997', '#c4c7c5'];

export const agentGroupChartColors: Record<AgentGroup, string> = {
  ai_data_scraper_bot: '#a78bfa',
  ai_assistant_bot: palette.accent,
  ai_agent_bot: '#ff9f6e',
  ai_bot_search_crawler: '#38bdf8',
};
