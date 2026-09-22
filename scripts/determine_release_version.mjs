#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Parses a semantic version tag (e.g. 'v1.2.3' or '1.2.3').
 * Returns { major, minor, patch } or null if invalid.
 * @param {string} tag
 * @returns {{ major: number, minor: number, patch: number } | null}
 */
export function parseSemver(tag) {
  if (typeof tag !== 'string') return null;
  const match = tag.trim().match(/^v?([0-9]+)\.([0-9]+)\.([0-9]+)$/);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10)
  };
}

/**
 * Sorts an array of semver tags in descending numerical order.
 * @param {string[]} tags
 * @returns {string[]}
 */
export function sortSemverDescending(tags) {
  const valid = [];
  for (const tag of tags) {
    const parsed = parseSemver(tag);
    if (parsed) {
      valid.push({ tag, ...parsed });
    }
  }

  valid.sort((a, b) => {
    if (a.major !== b.major) return b.major - a.major;
    if (a.minor !== b.minor) return b.minor - a.minor;
    return b.patch - a.patch;
  });

  return valid.map((item) => item.tag);
}

/**
 * Analyzes conventional commits to determine the bump type: 'major', 'minor', or 'patch'.
 * @param {string[]} commits
 * @returns {'major' | 'minor' | 'patch'}
 */
export function determineBumpType(commits) {
  if (!Array.isArray(commits) || commits.length === 0) {
    return 'patch';
  }

  let hasMinor = false;

  for (const commit of commits) {
    // Check for breaking changes
    if (
      commit.includes('BREAKING CHANGE:') ||
      commit.includes('BREAKING-CHANGE:') ||
      /^[a-z]+(\([a-z0-9_-]+\))?!:/i.test(commit)
    ) {
      return 'major';
    }

    // Check for features
    if (/^feat(\([a-z0-9_-]+\))?:/i.test(commit)) {
      hasMinor = true;
    }
  }

  return hasMinor ? 'minor' : 'patch';
}

/**
 * Computes the bumped version given a base version and bump type.
 * @param {string} currentVersion
 * @param {'major' | 'minor' | 'patch'} bumpType
 * @returns {string}
 */
export function bumpVersion(currentVersion, bumpType) {
  const parsed = parseSemver(currentVersion);
  if (!parsed) {
    throw new Error(`Cannot bump invalid semver: ${currentVersion}`);
  }

  let { major, minor, patch } = parsed;

  if (bumpType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bumpType === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `v${major}.${minor}.${patch}`;
}

/**
 * Determines the next release version from git tags and commit history.
 * @param {string[]} existingTags
 * @param {string[]} commitMessages
 * @param {string} [fallbackVersion='1.0.0']
 * @returns {string}
 */
export function determineNextVersion(existingTags, commitMessages, fallbackVersion = '1.0.0') {
  const sorted = sortSemverDescending(existingTags);

  if (sorted.length === 0) {
    const cleanFallback = fallbackVersion.replace(/^v/, '');
    return `v${cleanFallback}`;
  }

  const latestTag = sorted[0];
  const bumpType = determineBumpType(commitMessages);
  let next = bumpVersion(latestTag, bumpType);

  // Collision avoidance loop
  while (existingTags.includes(next)) {
    next = bumpVersion(next, 'patch');
  }

  return next;
}

/**
 * Main CLI execution entry point.
 */
function run() {
  const __filename = fileURLToPath(import.meta.url);
  const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === resolve(__filename);
  if (!isDirectExecution) return;

  try {
    const projectRoot = resolve(dirname(__filename), '..');

    // 1. Read existing tags (F9: git tag -l and filter valid semver tags)
    let rawTags = '';
    try {
      rawTags = execSync('git tag -l', { cwd: projectRoot, encoding: 'utf-8' });
    } catch {
      rawTags = '';
    }
    const allTags = rawTags.split('\n').map((t) => t.trim()).filter(Boolean);
    const tags = allTags.filter((t) => parseSemver(t) !== null);

    // 2. Read package.json for fallback version
    const pkgPath = resolve(projectRoot, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const fallback = pkg.version || '1.0.0';

    // 3. Inspect commit messages since latest tag (F4: %B%x1e captures bodies and footers)
    const sorted = sortSemverDescending(tags);
    let commits = [];
    if (sorted.length > 0) {
      const latestTag = sorted[0];
      try {
        const rawCommits = execSync(`git log ${latestTag}..HEAD --format=%B%x1e`, {
          cwd: projectRoot,
          encoding: 'utf-8'
        });
        commits = rawCommits.split('\x1e').map((c) => c.trim()).filter(Boolean);
      } catch {
        commits = [];
      }
    } else {
      try {
        const rawCommits = execSync('git log -n 10 --format=%B%x1e', {
          cwd: projectRoot,
          encoding: 'utf-8'
        });
        commits = rawCommits.split('\x1e').map((c) => c.trim()).filter(Boolean);
      } catch {
        commits = [];
      }
    }

    const nextVersion = determineNextVersion(tags, commits, fallback);
    console.log(`[PASS] Determined release version: ${nextVersion}`);

    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `version=${nextVersion}\n`);
      console.log(`[PASS] Written version=${nextVersion} to GITHUB_OUTPUT`);
    }
  } catch (error) {
    console.error(`[FAIL] Error determining release version: ${error.message}`);
    process.exit(1);
  }
}

run();
