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

    // Deployment environment (required for OIDC token verification & Pages API deployment creation)
    expect(content).toMatch(/environment:\s*\n\s*name:\s*github-pages/);
    expect(content).toContain('url: ${{ steps.deployment.outputs.page_url }}');

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

  it('verifies git user identity is configured inside gh_pages_work before git commit is invoked', () => {
    const content = readFileSync(workflowPath, 'utf-8');

    // Find the Sync and Commit to gh-pages Branch step
    const syncStepMatch = content.match(/- name: Sync and Commit to gh-pages Branch([\s\S]*?)(?=- name:|$)/);
    expect(syncStepMatch).not.toBeNull();
    const syncStep = syncStepMatch![1]!;

    // Must configure git user.name and user.email
    expect(syncStep).toContain('git config user.name "github-actions[bot]"');
    expect(syncStep).toContain('git config user.email "github-actions[bot]@users.noreply.github.com"');

    // Defect mechanism verification: git config must be executed inside gh_pages_work after git init
    // to avoid "fatal: empty ident name" in fresh runner environments where identity is unconfigured.
    const cdIndex = syncStep.indexOf('cd gh_pages_work');
    const initIndex = syncStep.indexOf('git init');
    const nameIndex = syncStep.indexOf('git config user.name "github-actions[bot]"');
    const emailIndex = syncStep.indexOf('git config user.email "github-actions[bot]@users.noreply.github.com"');
    const commitIndex = syncStep.indexOf('git commit');

    expect(cdIndex).toBeGreaterThan(-1);
    expect(initIndex).toBeGreaterThan(-1);
    expect(nameIndex).toBeGreaterThan(-1);
    expect(emailIndex).toBeGreaterThan(-1);
    expect(commitIndex).toBeGreaterThan(-1);

    // Identity must be configured inside gh_pages_work repository (after cd and git init), before committing
    expect(nameIndex).toBeGreaterThan(cdIndex);
    expect(nameIndex).toBeGreaterThan(initIndex);
    expect(nameIndex).toBeLessThan(commitIndex);

    expect(emailIndex).toBeGreaterThan(cdIndex);
    expect(emailIndex).toBeGreaterThan(initIndex);
    expect(emailIndex).toBeLessThan(commitIndex);
  });

  it('verifies deployment job specifies github-pages environment and page_url for OIDC verification', () => {
    const content = readFileSync(workflowPath, 'utf-8');

    // Find the build-and-deploy job declaration
    const jobMatch = content.match(/build-and-deploy:[\s\S]*?(?=\n\s*steps:)/);
    expect(jobMatch).not.toBeNull();
    const jobHeader = jobMatch![0]!;

    // Must declare github-pages environment to enable OIDC authentication for actions/deploy-pages
    expect(jobHeader).toMatch(/environment:\s*\n\s*name:\s*github-pages/);
    expect(jobHeader).toMatch(/url:\s*\${{\s*steps\.deployment\.outputs\.page_url\s*}}/);

    // Verify actions/deploy-pages step has id: deployment so page_url matches
    const deployStepMatch = content.match(/- name: Deploy to GitHub Pages[\s\S]*?(?=- name:|$)/);
    expect(deployStepMatch).not.toBeNull();
    const deployStep = deployStepMatch![0]!;
    expect(deployStep).toContain('id: deployment');
    expect(deployStep).toContain('uses: actions/deploy-pages@v4');
  });
});

