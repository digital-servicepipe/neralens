export const columnAliases: Record<string, string> = {
  ua: 'http_user_agent',
  'user agent': 'http_user_agent',
  user_agent: 'http_user_agent',
  useragent: 'http_user_agent',
  http_ua: 'http_user_agent',
  agent: 'http_user_agent',
  datetime_utc: 'datetime',
  timestamp: 'datetime',
  time: 'datetime',
  date_time: 'datetime',
  request_time: 'datetime',
  request_datetime: 'datetime',
  id: 'uniq_id',
  request_id: 'uniq_id',
  hit_id: 'uniq_id',
  event_id: 'uniq_id',
  url: 'path',
  uri: 'path',
  request_uri: 'path',
  request_path: 'path',
  page: 'path',
  country: 'cresp_country',
  country_code: 'cresp_country',
  geo_country: 'cresp_country',
  asn: 'cresp_asn',
  subnet: 'cresp_subnet',
  netname: 'cresp_netname',
  provider: 'cresp_netname',
  isp: 'cresp_netname',
  network: 'cresp_subnet',
  status: 'action',
  request_status: 'action',
  response_status: 'action',
  bot: 'bot_type',
  crawler: 'bot_type',
  agent_type: 'bot_type',
  uaGroup: 'ua_group',
  'ua group': 'ua_group',
  group: 'ua_group',
  count: 'count',
};

export const requiredColumns = [
  'datetime',
  'http_user_agent',
  'path',
];

export function normalizeColumnName(column: string): string {
  const normalized = column.trim().replace(/^\uFEFF/, '').toLowerCase();
  return columnAliases[normalized] ?? normalized;
}

export function normalizeRecord(record: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [normalizeColumnName(key), value == null ? '' : String(value)]),
  );
}
