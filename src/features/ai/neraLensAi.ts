import type { IndustryRow } from '../../shared/types/domain';

export interface NeraLensAiConfig {
  apiKey: string;
  model: string;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const neraLensAiEndpoint = '/api/neurly/chat/completions';
export const neraLensAiUpstreamEndpoint = 'https://neurly.ru/v1/chat/completions';
export const defaultNeraLensAiModel = 'openai/gpt-5.6-luna-pro';
export const neraLensAiConfigKey = 'neralens-ai-config';

export const industryFieldDescriptions = {
  industry: 'Отрасль компании',
  date: 'Дата наблюдения',
  all_trafic: 'Общее количество трафика',
  bad_bots_percent: 'Доля вредоносных ботов от общего объёма трафика',
  good_bots_percent: 'Доля обеленных ботов (Яндекс, Гугл...) от общего объёма трафика',
  humans_percent: 'Доля человеческого трафика от общего объёма трафика',
  bots_percent: 'Доля обычных ботов среди всего бот-трафика',
  strong_bots_percent: 'Доля продвинутых ботов среди всего бот-трафика',
  mobile_bots_percent: 'Доля мобильных ботов среди всего бот-трафика',
  desktop_bots_percent: 'Доля десктопных ботов среди всего бот-трафика',
  unknown_bots_percent: 'Доля ботов с неизвестным типом устройства среди всего бот-трафика',
  data_centers_percent: 'Доля трафика, исходящего из дата-центров от общего объёма трафика',
  api_percent: 'Доля API-атак от общего объёма трафика',
  ru_percent: 'Доля трафика из России от общего объёма трафика',
  foreign_percent: 'Доля иностранного трафика от общего объёма трафика',
  parsers_percent: 'Доля активности парсеров от общего объёма трафика',
  creds_percent: 'Доля атак, связанных с подбором учётных данных от общего объёма трафика',
  scaner_percent: 'Доля сканеров от общего объёма трафика',
  payments_crack_percent: 'Доля атак, связанных с подбором платёжных данных от общего объёма трафика',
  sms_push_bomber_percent: 'Доля SMS/Push-бомберов от общего объёма трафика',
};

export function loadNeraLensAiConfig(): NeraLensAiConfig {
  try {
    const parsed = JSON.parse(localStorage.getItem(neraLensAiConfigKey) || '{}') as Partial<NeraLensAiConfig>;
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model : defaultNeraLensAiModel,
    };
  } catch {
    return { apiKey: '', model: defaultNeraLensAiModel };
  }
}

export function saveNeraLensAiConfig(config: NeraLensAiConfig) {
  try {
    localStorage.setItem(neraLensAiConfigKey, JSON.stringify({
      apiKey: config.apiKey,
      model: config.model.trim() || defaultNeraLensAiModel,
    }));
  } catch {
    // The in-memory state still works for the current session if browser storage is blocked.
  }
}

function resolveNeraLensAiEndpoint() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return neraLensAiEndpoint;
  return neraLensAiUpstreamEndpoint;
}

export function buildIndustryAiContext(rows: IndustryRow[]) {
  return {
    source: 'NeraLens industry report',
    field_descriptions: industryFieldDescriptions,
    rows: rows.map((row) => ({
      industry: row.industry,
      date: row.date,
      all_trafic: row.allTrafic,
      bad_bots_percent: row.badBotsPercent,
      good_bots_percent: row.goodBotsPercent,
      humans_percent: row.humansPercent,
      bots_percent: row.botsPercent,
      strong_bots_percent: row.strongBotsPercent,
      mobile_bots_percent: row.mobileBotsPercent,
      desktop_bots_percent: row.desktopBotsPercent,
      unknown_bots_percent: row.unknownBotsPercent,
      data_centers_percent: row.dataCentersPercent,
      api_percent: row.apiPercent,
      ru_percent: row.ruPercent,
      foreign_percent: row.foreignPercent,
      parsers_percent: row.parsersPercent,
      creds_percent: row.credsPercent,
      scaner_percent: row.scanerPercent,
      payments_crack_percent: row.paymentsCrackPercent,
      sms_push_bomber_percent: row.smsPushBomberPercent,
    })),
  };
}

export function buildIndustryAiUserPayload(userRequest: string, rows: IndustryRow[]) {
  return {
    user_request: userRequest,
    context: buildIndustryAiContext(rows),
  };
}

export async function sendNeraLensAiMessage(config: NeraLensAiConfig, messages: AiChatMessage[], rows: IndustryRow[]) {
  const prompt = messages.at(-1)?.content.trim();
  if (!prompt) throw new Error('Введите запрос.');
  if (!config.apiKey.trim()) throw new Error('Добавьте API-ключ в настройках.');

  let response: Response;
  try {
    response = await fetch(resolveNeraLensAiEndpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model.trim() || defaultNeraLensAiModel,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(buildIndustryAiUserPayload(prompt, rows)),
          },
        ],
      }),
    });
  } catch {
    throw new Error('Браузер не смог отправить запрос в Neurly. Для сайта neralens.ru нужно, чтобы Neurly разрешил CORS для этого домена.');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text ? `Neurly вернул ошибку ${response.status}: ${text}` : `Neurly вернул ошибку ${response.status}.`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('Neurly не вернул текст ответа.');
  return content.trim();
}
