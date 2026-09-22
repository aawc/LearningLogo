export interface ClientMetadata {
  userAgent: string;
  viewport: { width: number; height: number };
  screen: { width: number; height: number };
  devicePixelRatio: number;
  touchSupport: boolean;
  online: boolean;
  pwaMode: boolean;
  url: string;
  appVersion: string;
}

export interface AppStateSnapshot {
  timestamp: string;
  editor: {
    code: string;
    lineCount: number;
    charCount: number;
  };
  turtle: {
    x: number;
    y: number;
    heading: number;
    penDown: boolean;
    penColor: string;
    penSize: number;
    visible: boolean;
    pathSegmentsCount: number;
  };
  debugger: {
    state: string;
    callStack: string[];
    variables: Record<string, string | number>;
  };
  replHistory: readonly string[];
  lastError: {
    message: string;
    timestamp: number;
  } | null;
  client: ClientMetadata;
}

export interface CaptureContext {
  editor: { getValue(): string };
  turtle: {
    getState(): {
      x: number;
      y: number;
      heading: number;
      isPenDown?: boolean;
      penDown?: boolean;
      isVisible?: boolean;
      visible?: boolean;
      penColor: string;
      penWidth?: number;
      penSize?: number;
    };
    getPathSegments(): readonly unknown[];
  };
  stepper: {
    getState(): string;
    getCurrentEnvironment?(): {
      getAllVariables?(): Record<string, unknown>;
    } | null;
    getCallStack?(): string[];
  };
  repl: {
    getHistory(): readonly string[];
  };
  lastError: {
    message: string;
    timestamp: number;
  } | null;
}

export function collectClientMetadata(): ClientMetadata {
  const isBrowser = typeof window !== 'undefined';
  const hasNav = typeof navigator !== 'undefined';
  const isTouch = isBrowser && ('ontouchstart' in window || (navigator?.maxTouchPoints ?? 0) > 0);
  const isPwa = isBrowser && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;

  return {
    userAgent: hasNav ? navigator.userAgent : 'Unknown',
    viewport: {
      width: isBrowser ? window.innerWidth : 0,
      height: isBrowser ? window.innerHeight : 0,
    },
    screen: {
      width: isBrowser && window.screen ? window.screen.width : 0,
      height: isBrowser && window.screen ? window.screen.height : 0,
    },
    devicePixelRatio: isBrowser ? (window.devicePixelRatio || 1) : 1,
    touchSupport: isTouch,
    online: hasNav ? navigator.onLine : true,
    pwaMode: !!isPwa,
    url: isBrowser && window.location ? `${window.location.origin}${window.location.pathname}` : '',
    appVersion: '1.0.0',
  };
}

export function captureAppState(context: CaptureContext): AppStateSnapshot {
  const code = context.editor ? context.editor.getValue() : '';
  const lineCount = code ? code.split('\n').length : 1;
  const charCount = code.length;

  const rawTurtleState = context.turtle ? context.turtle.getState() : {
    x: 0,
    y: 0,
    heading: 0,
    penDown: true,
    penColor: '#000000',
    penSize: 1,
    visible: true,
  };
  const paths = context.turtle ? context.turtle.getPathSegments() : [];

  const penDown = rawTurtleState.isPenDown ?? rawTurtleState.penDown ?? true;
  const visible = rawTurtleState.isVisible ?? rawTurtleState.visible ?? true;
  const penSize = rawTurtleState.penWidth ?? rawTurtleState.penSize ?? 1;

  const debuggerState = context.stepper ? context.stepper.getState() : 'IDLE';
  let callStack: string[] = [];
  if (context.stepper && typeof context.stepper.getCallStack === 'function') {
    callStack = context.stepper.getCallStack() || [];
  }

  const variables: Record<string, string | number> = {};
  if (context.stepper && typeof context.stepper.getCurrentEnvironment === 'function') {
    const env = context.stepper.getCurrentEnvironment();
    if (env && typeof env.getAllVariables === 'function') {
      const rawVars = env.getAllVariables() || {};
      for (const [k, v] of Object.entries(rawVars)) {
        if (typeof v === 'number' || typeof v === 'string') {
          variables[k] = v;
        } else if (v !== null && v !== undefined) {
          variables[k] = String(v);
        }
      }
    }
  }

  const replHistory = context.repl && typeof context.repl.getHistory === 'function'
    ? [...context.repl.getHistory()]
    : [];

  return {
    timestamp: new Date().toISOString(),
    editor: {
      code,
      lineCount,
      charCount,
    },
    turtle: {
      x: rawTurtleState.x,
      y: rawTurtleState.y,
      heading: rawTurtleState.heading,
      penDown,
      penColor: rawTurtleState.penColor,
      penSize,
      visible,
      pathSegmentsCount: paths.length,
    },
    debugger: {
      state: debuggerState,
      callStack,
      variables,
    },
    replHistory,
    lastError: context.lastError,
    client: collectClientMetadata(),
  };
}

export function formatMarkdownReport(snapshot: AppStateSnapshot, userNotes: string, category: string): string {
  const catLabel = category.toUpperCase();
  const cleanNotes = userNotes.trim() || 'No user description provided.';

  const lines: string[] = [
    `## [${catLabel} REPORT]`,
    '',
    '### Description',
    cleanNotes,
    '',
    '### Code in Editor',
    '```logo',
    snapshot.editor.code,
    '```',
    `*Lines: ${snapshot.editor.lineCount}, Characters: ${snapshot.editor.charCount}*`,
    '',
    '### Turtle Graphics State',
    `- Position: (${snapshot.turtle.x}, ${snapshot.turtle.y})`,
    `- Heading: ${snapshot.turtle.heading}°`,
    `- Pen Down: ${snapshot.turtle.penDown ? 'Yes' : 'No'}`,
    `- Pen Color: \`${snapshot.turtle.penColor}\``,
    `- Pen Size: ${snapshot.turtle.penSize}px`,
    `- Visible: ${snapshot.turtle.visible ? 'Yes' : 'No'}`,
    `- Drawn Segments: ${snapshot.turtle.pathSegmentsCount}`,
    '',
    '### Debugger & Execution State',
    `- Status: \`${snapshot.debugger.state}\``,
    `- Call Stack: ${snapshot.debugger.callStack.length > 0 ? snapshot.debugger.callStack.join(' -> ') : '*(empty)*'}`,
    `- Variables: ${Object.keys(snapshot.debugger.variables).length > 0 ? JSON.stringify(snapshot.debugger.variables) : '*(none)*'}`,
    '',
    '### Recent REPL Commands',
    snapshot.replHistory.length > 0
      ? snapshot.replHistory.map((cmd) => `- \`${cmd}\``).join('\n')
      : '*(no recent commands)*',
    '',
  ];

  if (snapshot.lastError) {
    lines.push(
      '### Last Runtime Error',
      `- Message: \`${snapshot.lastError.message}\``,
      `- Time: ${new Date(snapshot.lastError.timestamp).toISOString()}`,
      ''
    );
  }

  lines.push(
    '### Environment & Client Metadata',
    `- App Version: \`${snapshot.client.appVersion}\``,
    `- Viewport: ${snapshot.client.viewport.width}x${snapshot.client.viewport.height} (Screen: ${snapshot.client.screen.width}x${snapshot.client.screen.height})`,
    `- Device Pixel Ratio: ${snapshot.client.devicePixelRatio}`,
    `- Touch Device: ${snapshot.client.touchSupport ? 'Yes' : 'No'}`,
    `- PWA Standalone: ${snapshot.client.pwaMode ? 'Yes' : 'No'}`,
    `- User Agent: \`${snapshot.client.userAgent}\``,
    `- Timestamp: ${snapshot.timestamp}`,
    ''
  );

  return lines.join('\n');
}

export function formatJsonReport(snapshot: AppStateSnapshot, userNotes: string, category: string): string {
  return JSON.stringify(
    {
      category,
      userNotes: userNotes.trim(),
      createdAt: new Date().toISOString(),
      snapshot,
    },
    null,
    2
  );
}

export function generateGitHubIssueUrl(
  snapshot: AppStateSnapshot,
  userNotes: string,
  category: string,
  repoUrl = 'https://github.com/aawc/LearningLogo'
): string {
  const labelMap: Record<string, string> = {
    bug: 'bug',
    feature: 'enhancement',
    feedback: 'feedback',
  };
  const label = labelMap[category.toLowerCase()] ?? 'feedback';

  const shortSummary = userNotes.trim() ? userNotes.trim().split('\n')[0]!.slice(0, 60) : 'Feedback Report';
  const title = `[${category.toUpperCase()}] ${shortSummary}`;
  let body = formatMarkdownReport(snapshot, userNotes, category);

  const MAX_BODY_LENGTH = 5000;
  if (body.length > MAX_BODY_LENGTH) {
    const truncationNote =
      '\n\n*(Note: Code section truncated due to URL length limits. Please use the "Copy Report" button to paste full code.)*';
    const nonCodeLength = body.length - snapshot.editor.code.length;
    const availableCodeLength = Math.max(0, MAX_BODY_LENGTH - nonCodeLength - truncationNote.length);
    const truncatedCode = snapshot.editor.code.slice(0, availableCodeLength) + truncationNote;

    const truncatedSnapshot: AppStateSnapshot = {
      ...snapshot,
      editor: {
        ...snapshot.editor,
        code: truncatedCode,
      },
    };
    body = formatMarkdownReport(truncatedSnapshot, userNotes, category);
    if (body.length > MAX_BODY_LENGTH) {
      body = body.slice(0, MAX_BODY_LENGTH - truncationNote.length) + truncationNote;
    }
  }

  const params = new URLSearchParams();
  params.set('title', title);
  params.set('body', body);
  params.set('labels', label);

  return `${repoUrl}/issues/new?${params.toString()}`;
}
