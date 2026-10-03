type WhoisDates = {
  registeredAt: Date;
  expiredAt: Date;
  provider: string;
};

type JsonRecord = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 15_000;
let whoisFreaksUnavailableUntil = 0;

class WhoisHttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'WhoisHttpError';
  }
}

export class DomainNotRegisteredError extends Error {
  constructor(readonly provider: string) {
    super('Domain tidak ditemukan di registri dan ditandai berakhir');
    this.name = 'DomainNotRegisteredError';
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pickDate(source: JsonRecord | null, keys: string[]): Date | null {
  if (!source) return null;

  for (const key of keys) {
    const date = parseDate(source[key]);
    if (date) return date;
  }

  for (const value of Object.values(source)) {
    const child = asRecord(value);
    if (!child) continue;
    const date = pickDate(child, keys);
    if (date) return date;
  }

  return null;
}

function parseRdapDates(payload: unknown, provider: string): WhoisDates {
  const data = asRecord(payload);
  const events = Array.isArray(data?.events) ? data.events : [];

  const findEvent = (actions: string[]) => {
    const event = events.find((item) => {
      const record = asRecord(item);
      return typeof record?.eventAction === 'string'
        && actions.includes(record.eventAction.toLowerCase());
    });
    return parseDate(asRecord(event)?.eventDate);
  };

  const registeredAt = findEvent(['registration', 'registered']);
  const expiredAt = findEvent(['expiration', 'expiry', 'expires']);

  if (!registeredAt || !expiredAt) {
    throw new Error(`${provider} tidak mengembalikan tanggal registrasi dan kedaluwarsa lengkap`);
  }

  return { registeredAt, expiredAt, provider };
}

async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const data = asRecord(payload);
    const message = typeof data?.message === 'string'
      ? data.message
      : typeof data?.error === 'string'
        ? data.error
        : `HTTP ${response.status}`;
    throw new WhoisHttpError(message, response.status);
  }

  return payload;
}

function normalizeDomain(domainName: string) {
  return domainName
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/\.$/, '');
}

async function lookupWhoisFreaks(domainName: string): Promise<WhoisDates> {
  if (Date.now() < whoisFreaksUnavailableUntil) {
    throw new Error('WhoisFreaks sedang tidak tersedia; menggunakan RDAP registri');
  }
  const apiKey = process.env.WHOISFREAKS_API_KEY;
  if (!apiKey) throw new Error('WHOISFREAKS_API_KEY belum dikonfigurasi');

  const url = new URL('https://api.whoisfreaks.com/v2.0/whois/live');
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('domainName', domainName);
  url.searchParams.set('format', 'json');

  let payload: unknown;
  try {
    payload = await requestJson(url.toString());
  } catch (error) {
    if (error instanceof WhoisHttpError && [401, 429].includes(error.status)) {
      whoisFreaksUnavailableUntil = Date.now() + 5 * 60 * 1000;
    }
    throw error;
  }
  const data = asRecord(payload);
  const registryData = asRecord(data?.registry_data);
  const registeredAt = pickDate(data, ['create_date']) ?? pickDate(registryData, ['create_date']);
  const expiredAt = pickDate(data, ['expiry_date']) ?? pickDate(registryData, ['expiry_date']);

  if (!registeredAt || !expiredAt) {
    throw new Error('WhoisFreaks tidak mengembalikan tanggal registrasi dan kedaluwarsa lengkap');
  }

  return { registeredAt, expiredAt, provider: 'WhoisFreaks' };
}

async function lookupApiCoId(domainName: string): Promise<WhoisDates> {
  const endpoint = process.env.API_CO_ID_WHOIS_URL;
  const apiKey = process.env.API_CO_ID_KEY;
  if (!endpoint || !apiKey) {
    throw new Error('Endpoint WHOIS API.CO.ID belum dikonfigurasi');
  }

  const url = new URL(endpoint);
  url.searchParams.set('domain', domainName);
  const payload = await requestJson(url.toString(), {
    headers: { 'x-api-co-id': apiKey },
  });
  const data = asRecord(payload);
  const registeredAt = pickDate(data, [
    'registered_at', 'registration_date', 'registeredAt', 'created_at', 'create_date',
  ]);
  const expiredAt = pickDate(data, [
    'expired_at', 'expiration_date', 'expiry_date', 'expires_at', 'expiredAt',
  ]);

  if (!registeredAt || !expiredAt) {
    throw new Error('API.CO.ID tidak mengembalikan tanggal registrasi dan kedaluwarsa lengkap');
  }

  return { registeredAt, expiredAt, provider: 'API.CO.ID' };
}

async function lookupPandiRdap(domainName: string) {
  try {
    const payload = await requestJson(
      `https://rdap.pandi.id/rdap/domain/${encodeURIComponent(domainName)}`,
    );
    return parseRdapDates(payload, 'PANDI RDAP');
  } catch (error) {
    if (error instanceof WhoisHttpError && error.status === 404) {
      throw new DomainNotRegisteredError('PANDI RDAP');
    }
    throw error;
  }
}

async function lookupVerisignRdap(domainName: string) {
  try {
    const payload = await requestJson(
      `https://rdap.verisign.com/com/v1/domain/${encodeURIComponent(domainName)}`,
    );
    return parseRdapDates(payload, 'Verisign RDAP');
  } catch (error) {
    if (error instanceof WhoisHttpError && error.status === 404) {
      throw new DomainNotRegisteredError('Verisign RDAP');
    }
    throw error;
  }
}

async function lookupRegistryRdap(domainName: string) {
  const topLevelDomain = domainName.split('.').pop();
  if (!topLevelDomain) throw new Error('Ekstensi domain tidak valid');

  const bootstrap = asRecord(await requestJson('https://data.iana.org/rdap/dns.json'));
  const services = Array.isArray(bootstrap?.services) ? bootstrap.services : [];
  const service = services.find((entry) => {
    if (!Array.isArray(entry) || !Array.isArray(entry[0])) return false;
    return entry[0].some((value) => String(value).toLowerCase() === topLevelDomain);
  });
  const baseUrls = Array.isArray(service) && Array.isArray(service[1]) ? service[1] : [];
  const baseUrl = baseUrls.find((value) => typeof value === 'string' && value.startsWith('https://'));
  if (typeof baseUrl !== 'string') {
    throw new Error(`Server RDAP untuk .${topLevelDomain} tidak ditemukan`);
  }

  const endpoint = new URL(`domain/${encodeURIComponent(domainName)}`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  const provider = `Registry RDAP (.${topLevelDomain})`;
  try {
    const payload = await requestJson(endpoint.toString());
    return parseRdapDates(payload, provider);
  } catch (error) {
    if (error instanceof WhoisHttpError && error.status === 404) {
      throw new DomainNotRegisteredError(provider);
    }
    throw error;
  }
}

export async function lookupDomainDates(rawDomainName: string): Promise<WhoisDates> {
  const domainName = normalizeDomain(rawDomainName);
  if (!domainName || !domainName.includes('.')) {
    throw new Error('Nama domain tidak valid');
  }

  if (domainName.endsWith('.id')) {
    if (process.env.API_CO_ID_WHOIS_URL && process.env.API_CO_ID_KEY) {
      try {
        return await lookupApiCoId(domainName);
      } catch (error) {
        console.warn(
          `API.CO.ID WHOIS gagal untuk ${domainName}, menggunakan PANDI RDAP: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }
    return lookupPandiRdap(domainName);
  }

  try {
    return await lookupWhoisFreaks(domainName);
  } catch (error) {
    if (domainName.endsWith('.com')) {
      console.warn(
        `WhoisFreaks gagal untuk ${domainName}, menggunakan Verisign RDAP: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return lookupVerisignRdap(domainName);
    }
    console.warn(
      `WhoisFreaks gagal untuk ${domainName}, menggunakan registry RDAP: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return lookupRegistryRdap(domainName);
  }
}
