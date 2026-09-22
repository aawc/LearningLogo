#!/usr/bin/env node

import { readdirSync, rmSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSemver, sortSemverDescending } from './determine_release_version.mjs';

const DEFAULT_REPO_URL = 'https://github.com/aawc/LearningLogo';
const DEFAULT_MAX_RETAINED = 20;

/**
 * Generates a versions manifest object adhering to the schema.
 * @param {Array<{ version: string; date?: string; notesUrl?: string }>} releases
 * @param {Object} [options]
 * @param {string} [options.latestVersion]
 * @param {string} [options.repoUrl]
 * @param {string} [options.generatedAt]
 * @returns {{
 *   latest: string;
 *   generatedAt: string;
 *   versions: Array<{
 *     version: string;
 *     name: string;
 *     date: string;
 *     path: string;
 *     notesUrl: string;
 *     isLatest: boolean;
 *   }>;
 * }}
 */
export function generateVersionsManifest(releases, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const repoUrl = options.repoUrl || DEFAULT_REPO_URL;

  if (!Array.isArray(releases) || releases.length === 0) {
    return {
      latest: '',
      generatedAt,
      versions: []
    };
  }

  // Deduplicate and filter valid semver releases
  const validReleases = [];
  const seen = new Set();
  for (const r of releases) {
    if (r && r.version && parseSemver(r.version) && !seen.has(r.version)) {
      seen.add(r.version);
      validReleases.push(r);
    }
  }

  // Sort descending by semver
  const sortedVersions = sortSemverDescending(validReleases.map((r) => r.version));
  const latestVersion = options.latestVersion || sortedVersions[0] || '';

  const versions = sortedVersions.map((version) => {
    const original = validReleases.find((r) => r.version === version);
    const isLatest = version === latestVersion;
    const path = isLatest ? '' : `releases/${version}/`;
    const name = isLatest ? `${version} (Latest)` : version;
    const date = (original && original.date) ? original.date : generatedAt;
    const notesUrl = (original && original.notesUrl)
      ? original.notesUrl
      : `${repoUrl}/releases/tag/${version}`;

    return {
      version,
      name,
      date,
      path,
      notesUrl,
      isLatest
    };
  });

  return {
    latest: latestVersion,
    generatedAt,
    versions
  };
}

/**
 * Divides an array of version directory names into retained and pruned sets based on retention limit.
 * @param {string[]} directories
 * @param {number} [maxRetained=20]
 * @returns {{ retained: string[]; pruned: string[] }}
 */
export function pruneReleaseDirectories(directories, maxRetained = DEFAULT_MAX_RETAINED) {
  const sorted = sortSemverDescending(directories);
  return {
    retained: sorted.slice(0, maxRetained),
    pruned: sorted.slice(maxRetained)
  };
}

/**
 * CLI execution entry point for staging environment.
 */
function run() {
  const __filename = fileURLToPath(import.meta.url);
  const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === resolve(__filename);
  if (!isDirectExecution) return;

  try {
    const siteDeployDir = process.env.SITE_DEPLOY_DIR
      ? resolve(process.env.SITE_DEPLOY_DIR)
      : resolve(dirname(__filename), '../site_deploy');

    const releasesDir = join(siteDeployDir, 'releases');
    let releaseDirs = [];

    if (existsSync(releasesDir)) {
      releaseDirs = readdirSync(releasesDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory() && parseSemver(dirent.name))
        .map((dirent) => dirent.name);
    }

    // Include current release if specified in env
    const currentVersion = process.env.CURRENT_VERSION;
    if (currentVersion && parseSemver(currentVersion) && !releaseDirs.includes(currentVersion)) {
      releaseDirs.push(currentVersion);
    }

    // Prune older releases on disk if requested
    const { retained, pruned } = pruneReleaseDirectories(releaseDirs, DEFAULT_MAX_RETAINED);
    if (existsSync(releasesDir)) {
      for (const oldVersion of pruned) {
        const oldDirPath = join(releasesDir, oldVersion);
        console.log(`[REMOVED] Pruning retained release directory: ${oldDirPath}`);
        rmSync(oldDirPath, { recursive: true, force: true });
      }
    }

    // Assemble releases list
    const releasesList = retained.map((version) => ({
      version,
      date: new Date().toISOString()
    }));

    const manifest = generateVersionsManifest(releasesList, {
      latestVersion: currentVersion || retained[0] || '',
      repoUrl: process.env.REPO_URL || DEFAULT_REPO_URL
    });

    // Write to site root
    const manifestPath = join(siteDeployDir, 'versions.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
    console.log(`[PASS] Generated site manifest at: ${manifestPath}`);

    // Distribute into each release subdirectory
    if (existsSync(releasesDir)) {
      for (const version of retained) {
        const subReleaseDir = join(releasesDir, version);
        if (existsSync(subReleaseDir)) {
          const subManifestPath = join(subReleaseDir, 'versions.json');
          copyFileSync(manifestPath, subManifestPath);
          console.log(`[PASS] Distributed manifest to: ${subManifestPath}`);
        }
      }
    }
  } catch (error) {
    console.error(`[FAIL] Error generating versions manifest: ${error.message}`);
    process.exit(1);
  }
}

run();
