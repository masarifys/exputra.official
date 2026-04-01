export type AffiliateSyncConfig = {
  syncedPackageIds: string[];
  syncedServicePackageIds: string[];
  packageCommissions: Record<string, number>;
  serviceCommissions: Record<string, number>;
};

function normalizePercentMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};

  const result: Record<string, number> = {};

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(key || '').trim();
    if (!id) continue;

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) continue;

    const normalized = Math.max(0, Math.min(100, Math.round(parsed)));
    result[id] = normalized;
  }

  return result;
}

function normalizeIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const unique = new Set<string>();
  for (const item of raw) {
    const id = String(item || '').trim();
    if (id) unique.add(id);
  }

  return Array.from(unique);
}

export function parseAffiliateSyncConfig(raw: string | null | undefined): AffiliateSyncConfig {
  if (!raw) {
    return {
      syncedPackageIds: [],
      syncedServicePackageIds: [],
      packageCommissions: {},
      serviceCommissions: {},
    };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      syncedPackageIds: [],
      syncedServicePackageIds: [],
      packageCommissions: {},
      serviceCommissions: {},
    };
  }

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      return {
        syncedPackageIds: normalizeIdList(parsed.syncedPackageIds),
        syncedServicePackageIds: normalizeIdList(parsed.syncedServicePackageIds),
        packageCommissions: normalizePercentMap(parsed.packageCommissions),
        serviceCommissions: normalizePercentMap(parsed.serviceCommissions),
      };
    } catch {
      return {
        syncedPackageIds: [],
        syncedServicePackageIds: [],
        packageCommissions: {},
        serviceCommissions: {},
      };
    }
  }

  const fallbackPackageIds = trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    syncedPackageIds: Array.from(new Set(fallbackPackageIds)),
    syncedServicePackageIds: [],
    packageCommissions: {},
    serviceCommissions: {},
  };
}

export function serializeAffiliateSyncConfig(config: AffiliateSyncConfig): string {
  const payload = {
    syncedPackageIds: normalizeIdList(config.syncedPackageIds),
    syncedServicePackageIds: normalizeIdList(config.syncedServicePackageIds),
    packageCommissions: normalizePercentMap(config.packageCommissions),
    serviceCommissions: normalizePercentMap(config.serviceCommissions),
  };

  return JSON.stringify(payload);
}

export function getCommissionPercentByTarget(params: {
  defaultPercent: number;
  config: AffiliateSyncConfig;
  packageId?: string | null;
  servicePackageId?: string | null;
}): number {
  const { defaultPercent, config, packageId, servicePackageId } = params;

  if (packageId) {
    const packageOverride = config.packageCommissions[packageId];
    if (typeof packageOverride === 'number' && Number.isFinite(packageOverride)) {
      return packageOverride;
    }
  }

  if (servicePackageId) {
    const serviceOverride = config.serviceCommissions[servicePackageId];
    if (typeof serviceOverride === 'number' && Number.isFinite(serviceOverride)) {
      return serviceOverride;
    }
  }

  return defaultPercent;
}
