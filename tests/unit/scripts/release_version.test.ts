import { describe, it, expect } from 'vitest';
import {
  determineBumpType,
  bumpVersion,
  parseSemver,
  sortSemverDescending,
  determineNextVersion
} from '../../../scripts/determine_release_version.mjs';
import {
  generateVersionsManifest,
  pruneReleaseDirectories
} from '../../../scripts/generate_versions_manifest.mjs';

describe('Version Determination Engine (determine_release_version.mjs)', () => {
  describe('parseSemver', () => {
    it('parses valid semver strings with and without "v" prefix', () => {
      expect(parseSemver('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
      expect(parseSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
      expect(parseSemver('v10.200.3000')).toEqual({ major: 10, minor: 200, patch: 3000 });
    });

    it('returns null for non-semver strings', () => {
      expect(parseSemver('invalid')).toBeNull();
      expect(parseSemver('v1.2')).toBeNull();
      expect(parseSemver('')).toBeNull();
    });
  });

  describe('sortSemverDescending', () => {
    it('sorts semver tags in true numerical descending order', () => {
      const tags = ['v1.0.0', 'v1.10.0', 'v1.2.0', 'v2.0.0', 'v1.2.1'];
      const sorted = sortSemverDescending(tags);
      expect(sorted).toEqual(['v2.0.0', 'v1.10.0', 'v1.2.1', 'v1.2.0', 'v1.0.0']);
    });

    it('filters out non-semver tags during sort', () => {
      const tags = ['v1.0.0', 'random-tag', 'v1.1.0'];
      const sorted = sortSemverDescending(tags);
      expect(sorted).toEqual(['v1.1.0', 'v1.0.0']);
    });
  });

  describe('determineBumpType', () => {
    it('defaults to "patch" for empty commit lists or chores/fixes', () => {
      expect(determineBumpType([])).toBe('patch');
      expect(determineBumpType(['fix: resolve off-by-one error'])).toBe('patch');
      expect(determineBumpType(['chore: update dependencies', 'docs: update readme'])).toBe('patch');
      expect(determineBumpType(['untyped message'])).toBe('patch');
    });

    it('returns "minor" when at least one feature commit exists', () => {
      expect(determineBumpType(['feat: add new turtle primitive'])).toBe('minor');
      expect(determineBumpType(['feat(graphics): optimize canvas rendering', 'fix: bug'])).toBe('minor');
    });

    it('returns "major" when a breaking change is detected in header or body', () => {
      expect(determineBumpType(['feat!: breaking api change'])).toBe('major');
      expect(determineBumpType(['fix(core)!: break compatibility'])).toBe('major');
      expect(determineBumpType(['refactor: change runtime\n\nBREAKING CHANGE: removed old api'])).toBe('major');
      expect(determineBumpType(['feat: new stuff', 'refactor!: overhaul syntax'])).toBe('major');
    });
  });

  describe('bumpVersion', () => {
    it('bumps patch, minor, and major correctly', () => {
      expect(bumpVersion('v1.0.0', 'patch')).toBe('v1.0.1');
      expect(bumpVersion('v1.0.0', 'minor')).toBe('v1.1.0');
      expect(bumpVersion('v1.0.0', 'major')).toBe('v2.0.0');
    });

    it('resets lower components on higher-order bump', () => {
      expect(bumpVersion('v1.5.8', 'minor')).toBe('v1.6.0');
      expect(bumpVersion('v1.5.8', 'major')).toBe('v2.0.0');
    });
  });

  describe('determineNextVersion', () => {
    it('returns fallback version (v1.0.0) when no existing tags exist', () => {
      const next = determineNextVersion([], ['feat: initial commit'], '1.0.0');
      expect(next).toBe('v1.0.0');
    });

    it('calculates the next minor version after v1.0.0 for a feat commit', () => {
      const next = determineNextVersion(['v1.0.0'], ['feat: add editor toolbar']);
      expect(next).toBe('v1.1.0');
    });

    it('calculates the next patch version after v1.1.0 for a fix commit', () => {
      const next = determineNextVersion(['v1.1.0', 'v1.0.0'], ['fix: prevent memory leak']);
      expect(next).toBe('v1.1.1');
    });

    it('resolves tag collision by incrementing patch until unique', () => {
      const next = determineNextVersion(['v1.0.1', 'v1.0.0'], ['fix: another fix'], '1.0.0');
      // Latest tag is v1.0.1 -> patch bump is v1.0.2
      expect(next).toBe('v1.0.2');
    });

    it('handles tags without leading "v" prefix correctly (F9)', () => {
      const next = determineNextVersion(['1.0.0'], ['feat: add support for loops']);
      expect(next).toBe('v1.1.0');
    });

    it('extracts breaking change from multiline commit body split by record separator \\x1e (F4)', () => {
      const rawGitLog = 'fix: resolve edge case\n\nBREAKING CHANGE: overhauled parser AST\x1echore: update test\x1e';
      const commits = rawGitLog.split('\x1e').map((c) => c.trim()).filter(Boolean);
      expect(commits).toHaveLength(2);
      expect(determineBumpType(commits)).toBe('major');
    });
  });

  describe('CLI Script Execution Standards (F4, F9)', () => {
    it('verifies determine_release_version.mjs uses git tag -l without "v*.*.*" filter and %B%x1e for git log', async () => {
      const { readFileSync } = await import('node:fs');
      const { resolve } = await import('node:path');
      const scriptContent = readFileSync(
        resolve(process.cwd(), 'scripts/determine_release_version.mjs'),
        'utf-8'
      );

      // F9: uses git tag -l without "v*.*.*"
      expect(scriptContent).toContain("git tag -l'");
      expect(scriptContent).not.toContain("git tag -l '\"v*.*.*\"'");
      expect(scriptContent).not.toContain('git tag -l "v*.*.*"');

      // F4: uses %B%x1e and splits on \x1e
      expect(scriptContent).toContain('%B%x1e');
      expect(scriptContent).toContain(".split('\\x1e')");
    });
  });
});

describe('Manifest Generation & Retention Engine (generate_versions_manifest.mjs)', () => {
  const sampleReleases = [
    { version: 'v1.0.0', date: '2026-09-20T10:00:00Z' },
    { version: 'v1.1.0', date: '2026-09-21T10:00:00Z' },
    { version: 'v1.0.1', date: '2026-09-20T15:00:00Z' }
  ];

  describe('generateVersionsManifest', () => {
    it('generates a valid schema with sorted releases and identifies latest', () => {
      const manifest = generateVersionsManifest(sampleReleases, {
        repoUrl: 'https://github.com/aawc/LearningLogo',
        generatedAt: '2026-09-22T14:00:00Z'
      });

      expect(manifest.latest).toBe('v1.1.0');
      expect(manifest.generatedAt).toBe('2026-09-22T14:00:00Z');
      expect(manifest.versions).toHaveLength(3);

      // Latest release entry
      const latestEntry = manifest.versions[0]!;
      expect(latestEntry.version).toBe('v1.1.0');
      expect(latestEntry.name).toBe('v1.1.0 (Latest)');
      expect(latestEntry.isLatest).toBe(true);
      expect(latestEntry.path).toBe('');
      expect(latestEntry.notesUrl).toBe('https://github.com/aawc/LearningLogo/releases/tag/v1.1.0');

      // Older release entries
      const olderEntry = manifest.versions[1]!;
      expect(olderEntry.version).toBe('v1.0.1');
      expect(olderEntry.name).toBe('v1.0.1');
      expect(olderEntry.isLatest).toBe(false);
      expect(olderEntry.path).toBe('releases/v1.0.1/');
      expect(olderEntry.notesUrl).toBe('https://github.com/aawc/LearningLogo/releases/tag/v1.0.1');
    });

    it('handles empty release list gracefully', () => {
      const manifest = generateVersionsManifest([]);
      expect(manifest.latest).toBe('');
      expect(manifest.versions).toEqual([]);
    });
  });

  describe('pruneReleaseDirectories', () => {
    it('retains up to maxRetained releases and identifies older releases for pruning', () => {
      const directories = [
        'v1.0.0', 'v1.0.1', 'v1.1.0', 'v1.2.0', 'v1.3.0',
        'v1.4.0', 'v1.5.0', 'v1.6.0', 'v1.7.0', 'v1.8.0',
        'v1.9.0', 'v1.10.0', 'v1.11.0', 'v1.12.0', 'v1.13.0',
        'v1.14.0', 'v1.15.0', 'v1.16.0', 'v1.17.0', 'v1.18.0',
        'v1.19.0', 'v1.20.0', 'v1.21.0'
      ]; // 23 versions

      const { retained, pruned } = pruneReleaseDirectories(directories, 20);
      expect(retained).toHaveLength(20);
      expect(pruned).toHaveLength(3);
      expect(retained[0]).toBe('v1.21.0');
      expect(pruned).toContain('v1.0.0');
      expect(pruned).toContain('v1.0.1');
      expect(pruned).toContain('v1.1.0');
    });

    it('does not prune when directory count is within maxRetained', () => {
      const directories = ['v1.0.0', 'v1.1.0', 'v1.2.0'];
      const { retained, pruned } = pruneReleaseDirectories(directories, 20);
      expect(retained).toHaveLength(3);
      expect(pruned).toHaveLength(0);
    });
  });
});
