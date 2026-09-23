import type { Environment } from '../interpreter/environment.ts';

export class InspectorPanel {
  private container: HTMLElement;
  private stackListEl!: HTMLElement;
  private varTableEl!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildDOM();
  }

  private buildDOM(): void {
    this.container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'inspector-wrapper';

    // Call Stack Section
    const stackSection = document.createElement('div');
    stackSection.className = 'inspector-section';
    const stackHeader = document.createElement('h3');
    stackHeader.textContent = 'Call Stack';
    this.stackListEl = document.createElement('ul');
    this.stackListEl.className = 'stack-list';
    stackSection.appendChild(stackHeader);
    stackSection.appendChild(this.stackListEl);

    // Variables Section
    const varSection = document.createElement('div');
    varSection.className = 'inspector-section';
    const varHeader = document.createElement('h3');
    varHeader.textContent = 'Variables';
    this.varTableEl = document.createElement('div');
    this.varTableEl.className = 'var-table';
    varSection.appendChild(varHeader);
    varSection.appendChild(this.varTableEl);

    wrapper.appendChild(stackSection);
    wrapper.appendChild(varSection);
    this.container.appendChild(wrapper);
  }

  update(env: Environment, callStack: string[] = ['Global']): void {
    // Render Call Stack
    this.stackListEl.innerHTML = '';
    const lastIndex = callStack.length - 1;
    for (let i = 0; i < callStack.length; i++) {
      const frame = callStack[i];
      if (frame === undefined) continue;
      const li = document.createElement('li');
      li.className = 'stack-frame';
      if (i === lastIndex) {
        li.classList.add('stack-frame-active');
      }
      li.textContent = frame;
      this.stackListEl.appendChild(li);
    }
    this.stackListEl.scrollTop = this.stackListEl.scrollHeight;

    // Render Variables
    this.varTableEl.innerHTML = '';
    const vars = env.getAllVariables();
    const entries = Object.entries(vars);

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'var-empty';
      empty.textContent = 'No variables defined';
      this.varTableEl.appendChild(empty);
      return;
    }

    for (const [name, val] of entries) {
      const row = document.createElement('div');
      row.className = 'var-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'var-name';
      nameSpan.textContent = `:${name}`;

      const valSpan = document.createElement('span');
      valSpan.className = 'var-value';
      valSpan.textContent = JSON.stringify(val);

      row.appendChild(nameSpan);
      row.appendChild(valSpan);
      this.varTableEl.appendChild(row);
    }
  }

  clear(): void {
    this.stackListEl.innerHTML = '';
    this.varTableEl.innerHTML = '';
  }
}
