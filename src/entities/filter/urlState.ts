import LZString from 'lz-string';
import { emptyFilters, normalizeFilters, type FiltersState } from '../../shared/types/domain';

const compressedKey = 's';
const activeKeys = [compressedKey, 'screen', 'dateFrom', 'dateTo', 'pathQuery', 'agentGroups', 'agentDetails', 'requestStatuses', 'sections', 'excludedSections', 'countries'];

export function readUrlState(): { screen: string | null; filters: Partial<FiltersState> } {
  const params = new URLSearchParams(window.location.search);
  const compressed = params.get(compressedKey);
  if (compressed) {
    try {
      const json = LZString.decompressFromEncodedURIComponent(compressed);
      if (json) {
        const parsed = JSON.parse(json);
        return { screen: parsed?.screen ?? null, filters: normalizeFilters(parsed?.filters) };
      }
    } catch (error) {
      console.error('Failed to parse compressed URL state', error);
    }
  }
  const list = (key: string) => params.get(key)?.split(',').filter(Boolean) ?? [];
  const filters: Partial<FiltersState> = {
    dateFrom: params.get('dateFrom') || undefined,
    dateTo: params.get('dateTo') || undefined,
    pathQuery: params.get('pathQuery') || undefined,
    agentGroups: list('agentGroups') as FiltersState['agentGroups'],
    agentDetails: list('agentDetails'),
    requestStatuses: list('requestStatuses'),
    sections: list('sections'),
    excludedSections: list('excludedSections'),
    countries: list('countries'),
  };
  return { screen: params.get('screen'), filters };
}

export function writeUrlState(screen: string, filters: FiltersState): void {
  const safeFilters = normalizeFilters(filters);
  const params = new URLSearchParams(window.location.search);
  activeKeys.forEach((key) => params.delete(key));
  const changed: Partial<FiltersState> = {};
  for (const key of Object.keys(emptyFilters) as Array<keyof FiltersState>) {
    const value = safeFilters[key];
    const base = emptyFilters[key];
    if (Array.isArray(value) ? value.length > 0 : value && value !== base) {
      (changed as any)[key] = value;
    }
  }
  const inline = new URLSearchParams();
  if (screen !== 'overview') inline.set('screen', screen);
  Object.entries(changed).forEach(([key, value]) => {
    inline.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  if (inline.toString().length > 400) {
    params.set(compressedKey, LZString.compressToEncodedURIComponent(JSON.stringify({ screen, filters: changed })));
  } else {
    inline.forEach((value, key) => params.set(key, value));
  }
  const query = params.toString().replace(/%2C/g, ',');
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}
