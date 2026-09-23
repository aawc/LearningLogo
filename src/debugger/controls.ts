import { DebuggerState } from './state.ts';
import type { StepperController } from './stepper.ts';

export class DebuggerControls {
  private container: HTMLElement;
  private stepper: StepperController;
  private onClear?: () => void;
  private runBtn!: HTMLButtonElement;
  private pauseBtn!: HTMLButtonElement;
  private stepBtn!: HTMLButtonElement;
  private stepOverBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private clearBtn!: HTMLButtonElement;
  private speedInput!: HTMLInputElement;

  constructor(container: HTMLElement, stepper: StepperController, onClear?: () => void) {
    this.container = container;
    this.stepper = stepper;
    this.onClear = onClear;
    this.render();
    this.setupListeners();
    this.updateButtonStates(this.stepper.getState());
  }

  private render(): void {
    this.container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'debugger-controls-bar';
    wrapper.setAttribute('role', 'toolbar');
    wrapper.setAttribute('aria-label', 'Debugger Controls');

    this.runBtn = document.createElement('button');
    this.runBtn.type = 'button';
    this.runBtn.className = 'dbg-btn btn-run';
    this.runBtn.innerHTML = '<span class="dbg-label">[RUN]</span> ▶';
    this.runBtn.setAttribute('aria-label', 'Run or resume program execution');

    this.pauseBtn = document.createElement('button');
    this.pauseBtn.type = 'button';
    this.pauseBtn.className = 'dbg-btn btn-pause';
    this.pauseBtn.innerHTML = '<span class="dbg-label">[PAUSE]</span> ⏸';
    this.pauseBtn.setAttribute('aria-label', 'Pause program execution');

    this.stepBtn = document.createElement('button');
    this.stepBtn.type = 'button';
    this.stepBtn.className = 'dbg-btn btn-step';
    this.stepBtn.innerHTML = '<span class="dbg-label">[STEP]</span> ⏭';
    this.stepBtn.setAttribute('aria-label', 'Step into next command');

    this.stepOverBtn = document.createElement('button');
    this.stepOverBtn.type = 'button';
    this.stepOverBtn.className = 'dbg-btn btn-step-over';
    this.stepOverBtn.innerHTML = '<span class="dbg-label">[STEP OVER]</span> ↷';
    this.stepOverBtn.setAttribute('aria-label', 'Step over procedure call');

    this.stopBtn = document.createElement('button');
    this.stopBtn.type = 'button';
    this.stopBtn.className = 'dbg-btn btn-stop';
    this.stopBtn.innerHTML = '<span class="dbg-label">[STOP]</span> ⏹';
    this.stopBtn.setAttribute('aria-label', 'Stop program and reset turtle');

    this.clearBtn = document.createElement('button');
    this.clearBtn.type = 'button';
    this.clearBtn.className = 'dbg-btn btn-clear';
    this.clearBtn.innerHTML = '<span class="dbg-label">[CLEAR]</span> 🗑️';
    this.clearBtn.setAttribute('aria-label', 'Clear canvas');

    const speedWrapper = document.createElement('div');
    speedWrapper.className = 'speed-control';
    const speedLabel = document.createElement('label');
    speedLabel.textContent = 'Speed:';
    speedLabel.htmlFor = 'dbg-speed-slider';

    this.speedInput = document.createElement('input');
    this.speedInput.type = 'range';
    this.speedInput.id = 'dbg-speed-slider';
    this.speedInput.className = 'speed-slider';
    this.speedInput.min = '0';
    this.speedInput.max = '100';
    this.speedInput.value = String(this.stepper.getSpeed());
    this.speedInput.setAttribute('aria-label', 'Execution speed slider (0 to 100)');

    speedWrapper.appendChild(speedLabel);
    speedWrapper.appendChild(this.speedInput);

    wrapper.appendChild(this.runBtn);
    wrapper.appendChild(this.pauseBtn);
    wrapper.appendChild(this.stepBtn);
    wrapper.appendChild(this.stepOverBtn);
    wrapper.appendChild(this.stopBtn);
    wrapper.appendChild(this.clearBtn);
    wrapper.appendChild(speedWrapper);

    this.container.appendChild(wrapper);
  }

  private setupListeners(): void {
    this.runBtn.addEventListener('click', () => {
      this.stepper.run();
    });

    this.pauseBtn.addEventListener('click', () => {
      this.stepper.pause();
    });

    this.stepBtn.addEventListener('click', () => {
      this.stepper.stepInto();
    });

    this.stepOverBtn.addEventListener('click', () => {
      this.stepper.stepOver();
    });

    this.stopBtn.addEventListener('click', () => {
      this.stepper.stop();
    });

    this.clearBtn.addEventListener('click', () => {
      if (this.onClear) {
        this.onClear();
      }
    });

    this.speedInput.addEventListener('input', () => {
      this.stepper.setSpeed(Number(this.speedInput.value));
    });

    this.stepper.getStateMachine().subscribe((newState) => {
      this.updateButtonStates(newState);
    });
  }

  private updateButtonStates(state: DebuggerState): void {
    switch (state) {
      case DebuggerState.IDLE:
        this.runBtn.disabled = false;
        this.stepBtn.disabled = false;
        this.stepOverBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.stopBtn.disabled = true;
        this.clearBtn.disabled = false;
        this.runBtn.innerHTML = '<span class="dbg-label">[RUN]</span> ▶';
        break;

      case DebuggerState.RUNNING:
        this.runBtn.disabled = true;
        this.stepBtn.disabled = true;
        this.stepOverBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.stopBtn.disabled = false;
        this.clearBtn.disabled = true;
        break;

      case DebuggerState.PAUSED:
        this.runBtn.disabled = false;
        this.stepBtn.disabled = false;
        this.stepOverBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.clearBtn.disabled = false;
        this.runBtn.innerHTML = '<span class="dbg-label">[RESUME]</span> ▶';
        break;

      case DebuggerState.STEPPING:
        this.runBtn.disabled = true;
        this.stepBtn.disabled = true;
        this.stepOverBtn.disabled = true;
        this.pauseBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.clearBtn.disabled = true;
        break;
    }
  }
}
