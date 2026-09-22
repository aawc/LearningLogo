/**
 * Version Switcher Types and Pure Utility Functions.
 */

export interface VersionItem {
  version: string;
  name: string;
  date: string;
  path: string;
  notesUrl: string;
  isLatest: boolean;
}

export interface VersionsManifest {
  latest: string;
  generatedAt: string;
  versions: VersionItem[];
}

export interface VersionSwitcherOptions {
  currentVersion?: string;
  manifestUrl?: string;
  onBeforeSwitch?: () => void;
  navigate?: (url: string) => void;
}

/**
 * Validates untrusted manifest data against the VersionsManifest schema.
 * Returns the typed manifest if valid, or null if malformed.
 * @param data Untrusted manifest JSON object.
 */
export function validateVersionsManifest(data: unknown): VersionsManifest | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  if (typeof obj.latest !== 'string') return null;
  if (typeof obj.generatedAt !== 'string') return null;
  if (!Array.isArray(obj.versions)) return null;

  const validVersions: VersionItem[] = [];
  for (const item of obj.versions) {
    if (!item || typeof item !== 'object') return null;
    const v = item as Record<string, unknown>;

    if (
      typeof v.version !== 'string' ||
      typeof v.name !== 'string' ||
      typeof v.date !== 'string' ||
      typeof v.path !== 'string' ||
      typeof v.notesUrl !== 'string' ||
      typeof v.isLatest !== 'boolean'
    ) {
      return null;
    }

    validVersions.push({
      version: v.version,
      name: v.name,
      date: v.date,
      path: v.path,
      notesUrl: v.notesUrl,
      isLatest: v.isLatest
    });
  }

  return {
    latest: obj.latest,
    generatedAt: obj.generatedAt,
    versions: validVersions
  };
}

/**
 * Resolves the relative URL for switching to a target version, preserving hash fragments.
 * Handles navigation from site root or nested /releases/<ver>/ paths with trailing slash safety.
 *
 * @param targetItem The destination release entry.
 * @param currentPathname The current window location pathname.
 * @param currentHash Optional hash fragment to preserve (e.g. #code=...).
 */
export function resolveVersionUrl(
  targetItem: VersionItem,
  currentPathname: string,
  currentHash: string = ''
): string {
  const isInsideSubRelease = /\/releases\/[^/]+/.test(currentPathname);
  let resolvedBase: string;

  if (isInsideSubRelease) {
    // Currently inside /releases/<version>/
    if (targetItem.isLatest) {
      // Go to site root
      resolvedBase = '../../';
    } else {
      // Go to peer release
      resolvedBase = `../${targetItem.version}/`;
    }
  } else {
    // Currently at site root
    if (targetItem.isLatest) {
      resolvedBase = './';
    } else {
      resolvedBase = `./releases/${targetItem.version}/`;
    }
  }

  // Enforce trailing slash on base URL to avoid 404 relative resolution issues
  if (!resolvedBase.endsWith('/')) {
    resolvedBase += '/';
  }

  if (currentHash) {
    const cleanHash = currentHash.startsWith('#') ? currentHash : `#${currentHash}`;
    return `${resolvedBase}${cleanHash}`;
  }

  return resolvedBase;
}
