import { describe, it, expect, vi } from 'vitest';
import { DebuggerControls } from '../../../src/debugger/controls.ts';
import { StepperController } from '../../../src/debugger/stepper.ts';
import { DebuggerState } from '../../../src/debugger/state.ts';

describe('DebuggerControls UI', () => {
  it('invokes explicitly attached clear mechanism upon action [EXPECTED TO FAIL INITIALLY]', () => {
    const container = document.createElement('div');
    const stepper = new StepperController();
    const mockClear = vi.fn();

    new DebuggerControls(container, stepper, mockClear);

    const clearBtn = container.querySelector('.btn-clear') as HTMLButtonElement | null;
    expect(clearBtn).not.toBeNull();

    clearBtn!.click();
    expect(mockClear).toHaveBeenCalledOnce();
  });

  it('disables the clear button when RUNNING and enables it when IDLE or PAUSED', () => {
    const container = document.createElement('div');
    const stepper = new StepperController();
    new DebuggerControls(container, stepper);
    const clearBtn = container.querySelector('.btn-clear') as HTMLButtonElement;

    // Default is IDLE
    expect(stepper.getState()).toBe(DebuggerState.IDLE);
    expect(clearBtn.disabled).toBe(false);

    // Transition to RUNNING
    stepper.getStateMachine().transition(DebuggerState.RUNNING);
    expect(clearBtn.disabled).toBe(true);

    // Transition to PAUSED
    stepper.getStateMachine().transition(DebuggerState.PAUSED);
    expect(clearBtn.disabled).toBe(false);
  });
});
