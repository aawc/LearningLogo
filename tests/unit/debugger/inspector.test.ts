import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DebuggerControls } from '../../../src/debugger/controls.ts';
import { InspectorPanel } from '../../../src/debugger/inspector.ts';
import { StepperController } from '../../../src/debugger/stepper.ts';
import { DebuggerState } from '../../../src/debugger/state.ts';
import { Environment } from '../../../src/interpreter/environment.ts';

describe('Debugger Controls & Inspector UI Components', () => {
  let controlsContainer: HTMLElement;
  let inspectorContainer: HTMLElement;
  let stepper: StepperController;

  beforeEach(() => {
    document.body.innerHTML = '';
    controlsContainer = document.createElement('div');
    inspectorContainer = document.createElement('div');
    document.body.appendChild(controlsContainer);
    document.body.appendChild(inspectorContainer);
    stepper = new StepperController();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts control buttons with accessible labels', () => {
    new DebuggerControls(controlsContainer, stepper);

    const runBtn = controlsContainer.querySelector('.btn-run') as HTMLButtonElement;
    const pauseBtn = controlsContainer.querySelector('.btn-pause') as HTMLButtonElement;
    const stepBtn = controlsContainer.querySelector('.btn-step') as HTMLButtonElement;
    const stepOverBtn = controlsContainer.querySelector('.btn-step-over') as HTMLButtonElement;
    const stopBtn = controlsContainer.querySelector('.btn-stop') as HTMLButtonElement;

    expect(runBtn).not.toBeNull();
    expect(pauseBtn).not.toBeNull();
    expect(stepBtn).not.toBeNull();
    expect(stepOverBtn).not.toBeNull();
    expect(stopBtn).not.toBeNull();

    // In IDLE: Run, Step, and Step Over are enabled; Pause is disabled
    expect(runBtn.disabled).toBe(false);
    expect(stepBtn.disabled).toBe(false);
    expect(stepOverBtn.disabled).toBe(false);
    expect(pauseBtn.disabled).toBe(true);
  });

  it('updates control button disabled states on state transition', () => {
    new DebuggerControls(controlsContainer, stepper);
    const runBtn = controlsContainer.querySelector('.btn-run') as HTMLButtonElement;
    const pauseBtn = controlsContainer.querySelector('.btn-pause') as HTMLButtonElement;

    // Transition to RUNNING
    stepper.getStateMachine().transition(DebuggerState.RUNNING);

    expect(runBtn.disabled).toBe(true);
    expect(pauseBtn.disabled).toBe(false);
  });

  it('renders variables and call stack in inspector panel', () => {
    const inspector = new InspectorPanel(inspectorContainer);
    const env = new Environment();
    env.set('SIZE', 50);
    env.set('NAME', 'TURTLE');

    inspector.update(env, ['Global', 'SQUARE']);

    const vars = inspectorContainer.querySelectorAll('.var-row');
    expect(vars.length).toBe(2);

    const frames = inspectorContainer.querySelectorAll('.stack-frame');
    expect(frames.length).toBe(2);
    expect(frames[0]?.textContent).toContain('Global');
    expect(frames[1]?.textContent).toContain('SQUARE');
  });

  it('applies stack-frame-active to the top-most call stack frame and scrolls to it', () => {
    const inspector = new InspectorPanel(inspectorContainer);
    const env = new Environment();

    inspector.update(env, ['Global', 'SQUAREDSQUARE:L8', 'SQUARE:L2']);

    const frames = inspectorContainer.querySelectorAll('.stack-frame');
    expect(frames.length).toBe(3);
    expect(frames[0]?.classList.contains('stack-frame-active')).toBe(false);
    expect(frames[1]?.classList.contains('stack-frame-active')).toBe(false);
    expect(frames[2]?.classList.contains('stack-frame-active')).toBe(true);

    const stackList = inspectorContainer.querySelector('.stack-list') as HTMLElement;
    expect(stackList).not.toBeNull();
    // Simulate scrollHeight to test auto-scrolling
    Object.defineProperty(stackList, 'scrollHeight', { value: 240, configurable: true });
    inspector.update(env, ['Global', 'SQUAREDSQUARE:L8', 'SQUARE:L2', 'STEP:L3']);
    expect(stackList.scrollTop).toBe(240);
  });
});

