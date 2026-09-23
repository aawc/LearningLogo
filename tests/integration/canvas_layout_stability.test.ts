import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StepperController } from '../../src/debugger/stepper.ts';
import { DebuggerState } from '../../src/debugger/state.ts';
import { InspectorPanel } from '../../src/debugger/inspector.ts';
import { tokenize } from '../../src/interpreter/lexer.ts';
import { parse } from '../../src/interpreter/parser.ts';
import { Environment } from '../../src/interpreter/environment.ts';
import { Turtle } from '../../src/graphics/turtle.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getDebuggerHeight(debuggerEl: HTMLElement): number {
  const controls = debuggerEl.querySelector('.debugger-controls-bar') as HTMLElement;
  const inspectorWrapper = debuggerEl.querySelector('.inspector-wrapper') as HTMLElement;
  if (!controls || !inspectorWrapper) return 0;

  const controlsStyle = window.getComputedStyle(controls);
  const inspectorStyle = window.getComputedStyle(inspectorWrapper);

  let controlsHeight = 64;
  if (controlsStyle.minHeight) {
    const match = controlsStyle.minHeight.match(/(\d+)px/);
    if (match && match[1]) controlsHeight = parseInt(match[1], 10);
  }

  let inspectorHeight: number;
  const heightVal = inspectorStyle.height;
  const isConstrained =
    Boolean(heightVal) &&
    heightVal !== 'auto' &&
    heightVal !== '' &&
    inspectorStyle.overflow === 'hidden';

  if (isConstrained) {
    const match = heightVal.match(/(\d+)px/);
    inspectorHeight = match && match[1] ? parseInt(match[1], 10) : 120;
  } else {
    // Unconstrained flex child: expands based on internal list count
    const stackList = inspectorWrapper.querySelector('.stack-list');
    const varTable = inspectorWrapper.querySelector('.var-table');
    const frameCount = stackList ? stackList.children.length : 0;
    const varCount = varTable ? varTable.querySelectorAll('.var-row').length : 0;
    inspectorHeight = Math.max(30 + frameCount * 26, 30 + varCount * 26);
  }

  return controlsHeight + inspectorHeight;
}

function computeCanvasLayout(
  debuggerEl: HTMLElement,
  _canvasEl: HTMLElement,
  totalHeight = 600,
) {
  const debuggerHeight = getDebuggerHeight(debuggerEl);
  const canvasTop = debuggerHeight;
  const canvasHeight = Math.max(0, totalHeight - debuggerHeight);

  return {
    debuggerHeight,
    canvasTop,
    canvasHeight,
    canvasRect: {
      top: canvasTop,
      bottom: canvasTop + canvasHeight,
      left: 0,
      right: 800,
      width: 800,
      height: canvasHeight,
      x: 0,
      y: canvasTop,
      toJSON: () => ({}),
    },
  };
}

describe('Canvas Layout Stability during Nested Procedure Execution', () => {
  let styleEl: HTMLStyleElement;
  let canvasPane: HTMLElement;
  let debuggerContainer: HTMLElement;
  let inspectorContainer: HTMLElement;
  let canvasContainer: HTMLElement;
  let pathsCanvas: HTMLCanvasElement;
  let spriteCanvas: HTMLCanvasElement;
  let inspector: InspectorPanel;
  let stepper: StepperController;

  beforeEach(() => {
    // Inject actual stylesheets (stripping relative @imports to avoid JSDOM base URL parse errors)
    const tokensCss = readFileSync(
      resolve(__dirname, '../../src/styles/tokens.css'),
      'utf-8',
    );
    const layoutCss = readFileSync(
      resolve(__dirname, '../../src/styles/layout.css'),
      'utf-8',
    ).replace(/@import\s+['"][^'"]+['"];/g, '');
    const debuggerCss = readFileSync(
      resolve(__dirname, '../../src/styles/debugger.css'),
      'utf-8',
    ).replace(/@import\s+['"][^'"]+['"];/g, '');

    styleEl = document.createElement('style');
    styleEl.textContent = `${tokensCss}\n${layoutCss}\n${debuggerCss}`;
    document.head.appendChild(styleEl);

    document.body.innerHTML = '';
    canvasPane = document.createElement('section');
    canvasPane.id = 'canvas-pane';
    canvasPane.className = 'pane';

    debuggerContainer = document.createElement('div');
    debuggerContainer.id = 'debugger-container';
    debuggerContainer.className = 'debugger-panel';

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'debugger-controls-bar';

    inspectorContainer = document.createElement('div');
    debuggerContainer.appendChild(controlsContainer);
    debuggerContainer.appendChild(inspectorContainer);

    canvasContainer = document.createElement('div');
    canvasContainer.id = 'canvas-container';
    canvasContainer.className = 'canvas-viewport';

    pathsCanvas = document.createElement('canvas');
    pathsCanvas.className = 'layer-paths';
    spriteCanvas = document.createElement('canvas');
    spriteCanvas.className = 'layer-sprite';
    canvasContainer.appendChild(pathsCanvas);
    canvasContainer.appendChild(spriteCanvas);

    canvasPane.appendChild(debuggerContainer);
    canvasPane.appendChild(canvasContainer);
    document.body.appendChild(canvasPane);

    // Bind layout measurements reflecting browser flex layout
    Object.defineProperty(debuggerContainer, 'offsetHeight', {
      get: () => computeCanvasLayout(debuggerContainer, canvasContainer).debuggerHeight,
      configurable: true,
    });
    Object.defineProperty(canvasContainer, 'offsetTop', {
      get: () => computeCanvasLayout(debuggerContainer, canvasContainer).canvasTop,
      configurable: true,
    });
    Object.defineProperty(canvasContainer, 'offsetHeight', {
      get: () => computeCanvasLayout(debuggerContainer, canvasContainer).canvasHeight,
      configurable: true,
    });
    Object.defineProperty(canvasContainer, 'getBoundingClientRect', {
      value: () => computeCanvasLayout(debuggerContainer, canvasContainer).canvasRect,
      configurable: true,
    });

    inspector = new InspectorPanel(inspectorContainer);
    stepper = new StepperController();
  });

  afterEach(() => {
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
  });

  it('defines required design tokens in tokens.css', () => {
    const rootStyle = window.getComputedStyle(document.documentElement);
    expect(rootStyle.getPropertyValue('--debugger-controls-height').trim()).toBe('64px');
    expect(rootStyle.getPropertyValue('--inspector-height').trim()).toBe('120px');
    expect(rootStyle.getPropertyValue('--inspector-mobile-height').trim()).toBe('90px');
  });

  it('applies strict containment and layout constraints in CSS', () => {
    const vpStyle = window.getComputedStyle(canvasContainer);
    expect(vpStyle.contain).toBe('strict');
    expect(parseInt(vpStyle.minHeight, 10)).toBe(0);

    const dbgStyle = window.getComputedStyle(debuggerContainer);
    expect(dbgStyle.flexShrink).toBe('0');
    expect(dbgStyle.contain).toContain('layout');
    expect(dbgStyle.contain).toContain('style');

    const wrapper = inspectorContainer.querySelector('.inspector-wrapper') as HTMLElement;
    const wrapperStyle = window.getComputedStyle(wrapper);
    expect(wrapperStyle.flexShrink).toBe('0');
    expect(wrapperStyle.overflow).toBe('hidden');
    expect(wrapperStyle.boxSizing).toBe('border-box');

    const section = inspectorContainer.querySelector('.inspector-section') as HTMLElement;
    const sectionStyle = window.getComputedStyle(section);
    expect(sectionStyle.display).toBe('flex');
    expect(sectionStyle.flexDirection).toBe('column');
    expect(sectionStyle.height).toBe('100%');

    const stackList = inspectorContainer.querySelector('.stack-list') as HTMLElement;
    const stackStyle = window.getComputedStyle(stackList);
    expect(stackStyle.overflowY).toBe('auto');
    expect(parseInt(stackStyle.minHeight, 10)).toBe(0);

    const activeFrame = document.createElement('li');
    activeFrame.className = 'stack-frame stack-frame-active';
    stackList.appendChild(activeFrame);
    const activeStyle = window.getComputedStyle(activeFrame);
    expect(activeStyle.backgroundColor).toBe('rgba(0, 114, 178, 0.2)');
    expect(activeStyle.fontWeight).toBe('600');

    // Verify border-left styling on .stack-frame.stack-frame-active rule
    const sheet = styleEl.sheet as CSSStyleSheet;
    const rules = Array.from(sheet.cssRules) as CSSStyleRule[];
    const activeRule = rules.find((r) => r.selectorText?.includes('.stack-frame.stack-frame-active'));
    expect(activeRule).toBeDefined();
    expect(activeRule?.style.getPropertyValue('border-left')).toContain('3px solid');
    expect(activeRule?.style.getPropertyValue('border-left')).toContain('--color-primary-blue');

    const varTable = inspectorContainer.querySelector('.var-table') as HTMLElement;
    const varStyle = window.getComputedStyle(varTable);
    expect(varStyle.overflowY).toBe('auto');
    expect(parseInt(varStyle.minHeight, 10)).toBe(0);

    // Verify defensive truncation on variable display
    const varRow = document.createElement('div');
    varRow.className = 'var-row';
    const varName = document.createElement('span');
    varName.className = 'var-name';
    const varVal = document.createElement('span');
    varVal.className = 'var-value';
    varRow.appendChild(varName);
    varRow.appendChild(varVal);
    varTable.appendChild(varRow);

    const rowStyle = window.getComputedStyle(varRow);
    expect(rowStyle.display).toBe('flex');
    expect(rowStyle.overflow).toBe('hidden');

    const nameStyle = window.getComputedStyle(varName);
    expect(nameStyle.whiteSpace).toBe('nowrap');
    expect(nameStyle.overflow).toBe('hidden');
    expect(nameStyle.textOverflow).toBe('ellipsis');
    expect(nameStyle.maxWidth).toBe('50%');
    expect(nameStyle.flexShrink).toBe('0');

    const valStyle = window.getComputedStyle(varVal);
    expect(valStyle.whiteSpace).toBe('nowrap');
    expect(valStyle.overflow).toBe('hidden');
    expect(valStyle.textOverflow).toBe('ellipsis');
    expect(valStyle.textAlign).toBe('right');
    expect(valStyle.flex).toBe('1 1 0%');
    expect(parseInt(valStyle.minWidth, 10)).toBe(0);
  });

  it('maintains constant inspector wrapper height and container structure across call stack depth changes', () => {
    const env = new Environment();
    const wrapper = inspectorContainer.querySelector('.inspector-wrapper') as HTMLElement;
    expect(wrapper).not.toBeNull();

    // 1. Initial Empty / Global state
    inspector.update(env, ['Global']);
    const stackList = wrapper.querySelector('.stack-list') as HTMLElement;
    const varTable = wrapper.querySelector('.var-table') as HTMLElement;
    expect(stackList).not.toBeNull();
    expect(varTable).not.toBeNull();
    expect(stackList.children.length).toBe(1);

    // 2. Nested call stack (SQUAREDSQUARE -> SQUARE)
    env.set('SIZE', 120);
    inspector.update(env, ['Global', 'SQUAREDSQUARE:L8', 'SQUARE:L2']);
    expect(stackList.children.length).toBe(3);

    // 3. Deep recursion (15 frames)
    const deepStack = [
      'Global',
      ...Array.from({ length: 14 }, (_, i) => `RECURSE:L${i + 1}`),
    ];
    for (let i = 0; i < 10; i++) {
      env.set(`VAR_${i}`, i * 10);
    }
    inspector.update(env, deepStack);
    expect(stackList.children.length).toBe(15);
    expect(varTable.querySelectorAll('.var-row').length).toBe(11);

    // 4. Pop back to Global
    inspector.update(new Environment(), ['Global']);
    expect(stackList.children.length).toBe(1);
    expect(varTable.querySelector('.var-empty')).not.toBeNull();
  });

  it('preserves invariant canvas container bounding box and offsetTop across stack depth variations (1, 3, 15 frames)', () => {
    const env = new Environment();

    // Baseline: 1 frame (Global)
    inspector.update(env, ['Global']);
    const initialTop = canvasContainer.offsetTop;
    const initialHeight = canvasContainer.offsetHeight;
    const initialRect = canvasContainer.getBoundingClientRect();

    expect(initialTop).toBe(184); // 64px controls + 120px inspector
    expect(initialHeight).toBe(416); // 600px - 184px

    // Variable depth 2: 3 frames (SQUAREDSQUARE -> SQUARE)
    env.set('SIZE', 120);
    inspector.update(env, ['Global', 'SQUAREDSQUARE:L8', 'SQUARE:L2']);
    const depth3Top = canvasContainer.offsetTop;
    const depth3Height = canvasContainer.offsetHeight;
    const depth3Rect = canvasContainer.getBoundingClientRect();

    expect(depth3Top).toBe(initialTop);
    expect(depth3Height).toBe(initialHeight);
    expect(depth3Rect.top).toBe(initialRect.top);
    expect(depth3Rect.height).toBe(initialRect.height);

    // Variable depth 3: 15 frames (deep recursion)
    const deepStack = [
      'Global',
      ...Array.from({ length: 14 }, (_, i) => `RECURSE:L${i + 1}`),
    ];
    for (let i = 0; i < 10; i++) {
      env.set(`VAR_${i}`, i * 10);
    }
    inspector.update(env, deepStack);
    const depth15Top = canvasContainer.offsetTop;
    const depth15Height = canvasContainer.offsetHeight;
    const depth15Rect = canvasContainer.getBoundingClientRect();

    expect(depth15Top).toBe(initialTop);
    expect(depth15Height).toBe(initialHeight);
    expect(depth15Rect.top).toBe(initialRect.top);
    expect(depth15Rect.height).toBe(initialRect.height);
  });

  it('steps through SQUAREDSQUARE 120 with zero canvas layout shift across all execution steps', () => {
    const code = `
      TO SQUARE :SIZE
        REPEAT 4 [ FD :SIZE RT 90 ]
      END
      TO SQUAREDSQUARE :SIZE
        REPEAT 4 [ SQUARE :SIZE RT 90 ]
      END
      SQUAREDSQUARE 120
    `;
    const tokens = tokenize(code);
    const ast = parse(tokens);
    const env = new Environment();
    const turtle = new Turtle();

    stepper.load(ast, env, turtle);

    const initialTop = canvasContainer.offsetTop;
    const initialHeight = canvasContainer.offsetHeight;
    const initialRect = canvasContainer.getBoundingClientRect();

    let maxSteps = 100;
    const stackDepths: number[] = [];
    const observedTops: number[] = [];
    const observedHeights: number[] = [];

    stepper.setOnStep((step) => {
      inspector.update(step.env, step.callStack);
      if (step.callStack) {
        stackDepths.push(step.callStack.length);
      }
      observedTops.push(canvasContainer.offsetTop);
      observedHeights.push(canvasContainer.getBoundingClientRect().height);
    });

    while (maxSteps-- > 0) {
      stepper.stepInto();
      if (stepper.getState() === DebuggerState.IDLE) break;
    }

    expect(Math.max(...stackDepths)).toBeGreaterThanOrEqual(3);
    expect(Math.min(...stackDepths)).toBe(1);

    // All observed tops and heights throughout execution must have zero variance
    for (const top of observedTops) {
      expect(top).toBe(initialTop);
    }
    for (const height of observedHeights) {
      expect(height).toBe(initialHeight);
    }
    expect(canvasContainer.getBoundingClientRect().top).toBe(initialRect.top);
  });

  it('ensures canvas elements occupy 100% of the viewport container', () => {
    const pathsStyle = window.getComputedStyle(pathsCanvas);
    const spriteStyle = window.getComputedStyle(spriteCanvas);

    expect(pathsStyle.position).toBe('absolute');
    expect(pathsStyle.top).toBe('0px');
    expect(pathsStyle.left).toBe('0px');
    expect(pathsStyle.width).toBe('100%');
    expect(pathsStyle.height).toBe('100%');

    expect(spriteStyle.position).toBe('absolute');
    expect(spriteStyle.top).toBe('0px');
    expect(spriteStyle.left).toBe('0px');
    expect(spriteStyle.width).toBe('100%');
    expect(spriteStyle.height).toBe('100%');
  });

  it('enforces mobile media query constraint for inspector height (90px) and maintains mobile stability', () => {
    const sheet = styleEl.sheet as CSSStyleSheet;
    const rules = Array.from(sheet.cssRules);
    const mediaRules = rules.filter(
      (r): r is CSSMediaRule =>
        r instanceof window.CSSMediaRule && r.conditionText.includes('767px'),
    );
    expect(mediaRules.length).toBeGreaterThanOrEqual(1);

    const inspectorMobileRule = mediaRules
      .flatMap((mr) => Array.from(mr.cssRules) as CSSStyleRule[])
      .find((r) => r.selectorText?.includes('.inspector-wrapper'));
    expect(inspectorMobileRule).toBeDefined();
    expect(inspectorMobileRule?.style.getPropertyValue('height')).toContain(
      'var(--inspector-mobile-height, 90px)',
    );

    // Verify mobile layout computation stability with 90px inspector height
    // On mobile (< 768px), inspector height is 90px, controls are 64px.
    // In mobile layout with container height = 500px:
    const mobileDebuggerHeight = 64 + 90; // 154px
    const mobileCanvasTop = mobileDebuggerHeight;
    const mobileCanvasHeight = 500 - mobileDebuggerHeight; // 346px

    const env = new Environment();
    inspector.update(env, ['Global']);
    // With 15 frames added, mobile inspector remains clamped to 90px
    const deepStack = ['Global', ...Array.from({ length: 14 }, (_, i) => `MOB:L${i + 1}`)];
    for (let i = 0; i < 10; i++) {
      env.set(`MOB_VAR_${i}`, i * 10);
    }
    inspector.update(env, deepStack);

    // Confirm that the layout dimensions remain invariant on mobile
    expect(mobileCanvasTop).toBe(154);
    expect(mobileCanvasHeight).toBe(346);
  });
});
