import type { LogRow } from '../types/domain';

export function compactLogRows(rows: LogRow[]): LogRow[] {
  const map = new Map<string, LogRow>();

  rows.forEach((row) => {
    const key = [
      row.sid,
      row.datetimeRaw,
      row.dateRaw,
      row.path,
      row.httpUserAgent,
      row.botType,
      row.uaGroup,
      row.requestStatus,
      row.country,
      row.asn,
      row.subnet,
      row.netname,
      row.host,
      row.sslsignName,
    ].join('\u001f');
    const count = row.requestCount ?? 1;
    const existing = map.get(key);
    if (existing) {
      existing.requestCount = (existing.requestCount ?? 1) + count;
    } else {
      map.set(key, { ...row, requestCount: count });
    }
  });

  return Array.from(map.values());
}
