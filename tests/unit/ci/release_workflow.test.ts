import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('GitHub Actions Release Workflow (.github/workflows/release.yml)', () => {
  const workflowPath = resolve(process.cwd(), '.github/workflows/release.yml');

  it('verifies release.yml workflow exists and has correct trigger and concurrency settings', () => {
    expect(existsSync(workflowPath)).toBe(true);

    const content = readFileSync(workflowPath, 'utf-8');

    // Triggers
    expect(content).toMatch(/push:\s*[\s\S]*?branches:\s*[\s\S]*?main/);
    expect(content).toMatch(/tags:\s*[\s\S]*?v\*/);
    expect(content).toContain('workflow_dispatch:');

    // Concurrency locking (cancel-in-progress: false)
    expect(content).toContain('release-pipeline');
    expect(content).toMatch(/cancel-in-progress:\s*false/);

    // Permissions
    expect(content).toContain('contents: write');
  });

  it('verifies build setup, cross-platform compilation, and packaging tools', () => {
    const content = readFileSync(workflowPath, 'utf-8');

    // Full depth git checkout
    expect(content).toMatch(/fetch-depth:\s*0/);

    // Node 22 setup & build
    expect(content).toContain('actions/setup-node@v4');
    expect(content).toContain("node-version: '22'");
    expect(content).toContain('npm ci');
    expect(content).toContain('npm run build');

    // Go setup
    expect(content).toContain('actions/setup-go@v5');

    // Platform targets
    expect(content).toContain('windows');
    expect(content).toContain('darwin');
    expect(content).toContain('linux');
    expect(content).toContain('amd64');
    expect(content).toContain('arm64');

    // Trimpath and ldflags
    expect(content).toContain('-trimpath');
    expect(content).toContain('-s -w');
    expect(content).toContain('main.Version=');

    // Packaging scripts & NSIS
    expect(content).toContain('nsis');
    expect(content).toContain('scripts/installer.nsi');
    expect(content).toContain('scripts/package_windows.sh');
    expect(content).toContain('scripts/package_macos.sh');
    expect(content).toContain('scripts/package_linux.sh');
  });

  it('verifies VirusTotal analysis step and secure release publication', () => {
    const content = readFileSync(workflowPath, 'utf-8');

    // VirusTotal action integration
    expect(content).toContain('crazy-max/ghaction-virustotal@v5');
    expect(content).toContain('secrets.VIRUSTOTAL_API_KEY');
    expect(content).toMatch(/continue-on-error:\s*true/);

    // VirusTotal permanent report URL format
    expect(content).toContain('https://www.virustotal.com/gui/file/');

    // GitHub Release publication
    expect(content).toContain('softprops/action-gh-release@v2');
    expect(content).toContain('secrets.GITHUB_TOKEN');
  });
});
