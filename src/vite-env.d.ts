/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module '*scripts/determine_release_version.mjs' {
  export function parseSemver(tag: string): { major: number; minor: number; patch: number } | null;
  export function sortSemverDescending(tags: string[]): string[];
  export function determineBumpType(commits: string[]): 'major' | 'minor' | 'patch';
  export function bumpVersion(currentVersion: string, bumpType: 'major' | 'minor' | 'patch'): string;
  export function determineNextVersion(
    existingTags: string[],
    commitMessages: string[],
    fallbackVersion?: string
  ): string;
}

declare module '*scripts/generate_versions_manifest.mjs' {
  export interface ReleaseEntry {
    version: string;
    date?: string;
    notesUrl?: string;
  }
  export interface VersionsManifestItem {
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
    versions: VersionsManifestItem[];
  }
  export function generateVersionsManifest(
    releases: ReleaseEntry[],
    options?: { latestVersion?: string; repoUrl?: string; generatedAt?: string }
  ): VersionsManifest;
  export function pruneReleaseDirectories(
    directories: string[],
    maxRetained?: number
  ): { retained: string[]; pruned: string[] };
}
