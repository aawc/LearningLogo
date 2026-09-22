import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('GitHub Actions Deployment Workflow (.github/workflows/deploy.yml)', () => {
  const workflowPath = resolve(process.cwd(), '.github/workflows/deploy.yml');

  it('verifies deploy.yml workflow exists and is configured correctly', () => {
    expect(existsSync(workflowPath)).toBe(true);

    const content = readFileSync(workflowPath, 'utf-8');

    // Concurrency locking (cancel-in-progress: false)
    expect(content).toContain('github-pages-deploy');
    expect(content).toMatch(/cancel-in-progress:\s*false/);

    // Permissions
    expect(content).toContain('contents: write');
    expect(content).toContain('pages: write');
    expect(content).toContain('id-token: write');

    // Full git history checkout
    expect(content).toMatch(/fetch-depth:\s*0/);

    // Quality gates
    expect(content).toContain('npm run audit');
    expect(content).toContain('npm run typecheck');
    expect(content).toContain('npm run test');
    expect(content).toContain('npm run build');

    // Version determination & release creation
    expect(content).toContain('scripts/determine_release_version.mjs');
    expect(content).toContain('gh release create');

    // Multi-version manifest & gh-pages branch sync
    expect(content).toContain('scripts/generate_versions_manifest.mjs');
    expect(content).toContain('gh-pages');

    // Official Pages actions
    expect(content).toContain('actions/upload-pages-artifact@v3');
    expect(content).toContain('actions/deploy-pages@v4');
  });

  it('verifies GITHUB_TOKEN is mapped via env and not directly interpolated in script bodies (F3)', () => {
    const content = readFileSync(workflowPath, 'utf-8');

    // Find the Assemble Multi-Version Staging Tree step
    const stagingStepMatch = content.match(/- name: Assemble Multi-Version Staging Tree([\s\S]*?)(?=- name:|$)/);
    expect(stagingStepMatch).not.toBeNull();
    const stagingStep = stagingStepMatch![1]!;

    // Must map GITHUB_TOKEN in env
    expect(stagingStep).toMatch(/env:\s*[\s\S]*?GITHUB_TOKEN:\s*\${{\s*secrets\.GITHUB_TOKEN\s*}}/);

    // Must use shell variable ${GITHUB_TOKEN}, not inline ${{ secrets.GITHUB_TOKEN }} in run:
    const runBlockMatch = stagingStep.match(/run:\s*\|([\s\S]*)/);
    expect(runBlockMatch).not.toBeNull();
    const runBlock = runBlockMatch![1]!;
    expect(runBlock).toContain('${GITHUB_TOKEN}');
    expect(runBlock).not.toContain('${{ secrets.GITHUB_TOKEN }}');
  });

  it('verifies staging tree restoration copies only releases directory to prevent orphaned root chunks (F5)', () => {
    const content = readFileSync(workflowPath, 'utf-8');

    // Staging tree restoration should copy releases subdirectories, not entire root
    expect(content).toContain('site_deploy_git/releases');
    expect(content).not.toContain('cp -rn site_deploy_git/* site_deploy/');
  });
});
