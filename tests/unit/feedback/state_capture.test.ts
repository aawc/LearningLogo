import { describe, it, expect, beforeEach } from 'vitest';
import {
  collectClientMetadata,
  captureAppState,
  formatMarkdownReport,
  formatJsonReport,
  generateGitHubIssueUrl,
  type CaptureContext,
} from '../../../src/feedback/state_capture.ts';

describe('Application State Capture & Reporting Engine', () => {
  let mockContext: CaptureContext;

  beforeEach(() => {
    mockContext = {
      editor: {
        getValue: () => 'TO SQUARE :SIZE\n  REPEAT 4 [ FD :SIZE RT 90 ]\nEND\nSQUARE 50',
      },
      turtle: {
        getState: () => ({
          x: 25,
          y: -50,
          heading: 90,
          penDown: true,
          penColor: '#0072B2',
          penSize: 3,
          visible: true,
        }),
        getPathSegments: () => [
          {
            start: { x: 0, y: 0 },
            end: { x: 25, y: -50 },
            color: '#0072B2',
            width: 3,
          },
        ],
      },
      stepper: {
        getState: () => 'PAUSED',
        getCurrentEnvironment: () => {
          const map = new Map<string, unknown>();
          map.set(':SIZE', 50);
          return {
            getAllVariables: () => Object.fromEntries(map.entries()),
          };
        },
        getCallStack: () => ['TOPLEVEL', 'SQUARE'],
      },
      repl: {
        getHistory: () => ['CS', 'SQUARE 50'],
      },
      lastError: {
        message: 'Turtle exceeded boundary limits',
        timestamp: 1720000000000,
      },
    };
  });

  it('collects client metadata accurately', () => {
    const meta = collectClientMetadata();
    expect(meta).toHaveProperty('userAgent');
    expect(meta).toHaveProperty('viewport');
    expect(meta.viewport).toHaveProperty('width');
    expect(meta.viewport).toHaveProperty('height');
    expect(meta).toHaveProperty('devicePixelRatio');
    expect(meta).toHaveProperty('touchSupport');
    expect(meta).toHaveProperty('online');
    expect(meta).toHaveProperty('pwaMode');
    expect(meta).toHaveProperty('url');
    expect(meta).toHaveProperty('appVersion');
  });

  it('captures full application state snapshot', () => {
    const snapshot = captureAppState(mockContext);

    expect(snapshot.editor.code).toContain('TO SQUARE');
    expect(snapshot.editor.lineCount).toBe(4);
    expect(snapshot.editor.charCount).toBe(mockContext.editor.getValue().length);

    expect(snapshot.turtle.x).toBe(25);
    expect(snapshot.turtle.y).toBe(-50);
    expect(snapshot.turtle.heading).toBe(90);
    expect(snapshot.turtle.penDown).toBe(true);
    expect(snapshot.turtle.pathSegmentsCount).toBe(1);

    expect(snapshot.debugger.state).toBe('PAUSED');
    expect(snapshot.debugger.callStack).toEqual(['TOPLEVEL', 'SQUARE']);
    expect(snapshot.debugger.variables).toEqual({ ':SIZE': 50 });

    expect(snapshot.replHistory).toEqual(['CS', 'SQUARE 50']);
    expect(snapshot.lastError).toEqual({
      message: 'Turtle exceeded boundary limits',
      timestamp: 1720000000000,
    });
  });

  it('handles null/missing optional contexts safely without exceptions', () => {
    const sparseContext: CaptureContext = {
      editor: { getValue: () => '' },
      turtle: {
        getState: () => ({
          x: 0,
          y: 0,
          heading: 0,
          penDown: true,
          penColor: '#000000',
          penSize: 1,
          visible: true,
        }),
        getPathSegments: () => [],
      },
      stepper: {
        getState: () => 'IDLE',
      },
      repl: {
        getHistory: () => [],
      },
      lastError: null,
    };

    const snapshot = captureAppState(sparseContext);
    expect(snapshot.editor.code).toBe('');
    expect(snapshot.editor.lineCount).toBe(1);
    expect(snapshot.debugger.callStack).toEqual([]);
    expect(snapshot.debugger.variables).toEqual({});
    expect(snapshot.lastError).toBeNull();
  });

  it('formats comprehensive Markdown report with diagnostic details', () => {
    const snapshot = captureAppState(mockContext);
    const report = formatMarkdownReport(snapshot, 'Turtle jumped unexpectedly', 'bug');

    expect(report).toContain('## [BUG REPORT]');
    expect(report).toContain('Turtle jumped unexpectedly');
    expect(report).toContain('### Code in Editor');
    expect(report).toContain('```logo');
    expect(report).toContain('TO SQUARE :SIZE');
    expect(report).toContain('### Turtle Graphics State');
    expect(report).toContain('Heading: 90°');
    expect(report).toContain('### Debugger & Execution State');
    expect(report).toContain('Status: `PAUSED`');
    expect(report).toContain('### Recent REPL Commands');
    expect(report).toContain('CS');
    expect(report).toContain('### Last Runtime Error');
    expect(report).toContain('Turtle exceeded boundary limits');
    expect(report).toContain('### Environment & Client Metadata');
  });

  it('formats valid, parseable JSON report', () => {
    const snapshot = captureAppState(mockContext);
    const jsonStr = formatJsonReport(snapshot, 'Feature suggestion notes', 'feature');

    const parsed = JSON.parse(jsonStr);
    expect(parsed.category).toBe('feature');
    expect(parsed.userNotes).toBe('Feature suggestion notes');
    expect(parsed.snapshot.turtle.x).toBe(25);
    expect(parsed.snapshot.editor.code).toContain('TO SQUARE');
  });

  it('generates GitHub issue URL with encoded title, body, and appropriate labels', () => {
    const snapshot = captureAppState(mockContext);
    const urlStr = generateGitHubIssueUrl(snapshot, 'Broken loop syntax', 'bug');
    const url = new URL(urlStr);

    expect(url.origin).toBe('https://github.com');
    expect(url.pathname).toBe('/aawc/LearningLogo/issues/new');
    expect(url.searchParams.get('title')).toContain('[BUG]');
    expect(url.searchParams.get('title')).toContain('Broken loop syntax');
    expect(url.searchParams.get('labels')).toBe('bug');
    expect(url.searchParams.get('body')).toContain('## [BUG REPORT]');
  });

  it('assigns correct GitHub issue labels according to category', () => {
    const snapshot = captureAppState(mockContext);
    const featureUrl = new URL(generateGitHubIssueUrl(snapshot, 'Add sound primitives', 'feature'));
    expect(featureUrl.searchParams.get('labels')).toBe('enhancement');

    const feedbackUrl = new URL(generateGitHubIssueUrl(snapshot, 'Great turtle app', 'feedback'));
    expect(feedbackUrl.searchParams.get('labels')).toBe('feedback');
  });

  it('sanitizes client URL by omitting query parameters and hash fragments (F3)', () => {
    window.history.pushState({}, '', '/app/index.html?sensitiveParam=123#code=LARGE_CODE_HASH');
    const meta = collectClientMetadata();

    expect(meta.url).toBe(`${window.location.origin}/app/index.html`);
    expect(meta.url).not.toContain('sensitiveParam');
    expect(meta.url).not.toContain('#code');
  });

  it('truncates code section and appends note when body exceeds 5000 characters (F2)', () => {
    const largeContext: CaptureContext = {
      ...mockContext,
      editor: {
        getValue: () => 'FD 100\n'.repeat(1000), // ~7,000 characters
      },
    };
    const snapshot = captureAppState(largeContext);
    const urlStr = generateGitHubIssueUrl(snapshot, 'Testing large code report', 'bug');
    const url = new URL(urlStr);
    const body = url.searchParams.get('body');

    expect(body).not.toBeNull();
    expect(body!.length).toBeLessThanOrEqual(5000);
    expect(body).toContain('*(Note: Code section truncated due to URL length limits. Please use the "Copy Report" button to paste full code.)*');
  });
});
