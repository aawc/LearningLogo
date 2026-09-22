import type { LogoEditor } from './editor.ts';

export interface RibbonItem {
  label: string;
  text: string;
  cursorOffset?: number;
  ariaLabel: string;
}

const DEFAULT_RIBBON_ITEMS: RibbonItem[] = [
  { label: '[ ]', text: '[  ]', cursorOffset: 2, ariaLabel: 'Insert bracket pair' },
  { label: '[', text: '[', ariaLabel: 'Insert opening bracket' },
  { label: ']', text: ']', ariaLabel: 'Insert closing bracket' },
  { label: '"', text: '"', ariaLabel: 'Insert quote symbol' },
  { label: ':', text: ':', ariaLabel: 'Insert variable colon' },
  { label: '(', text: '(', ariaLabel: 'Insert opening parenthesis' },
  { label: ')', text: ')', ariaLabel: 'Insert closing parenthesis' },
  { label: 'FD', text: 'FD 50 ', ariaLabel: 'Insert forward command' },
  { label: 'BK', text: 'BK 50 ', ariaLabel: 'Insert back command' },
  { label: 'RT', text: 'RT 90 ', ariaLabel: 'Insert right turn command' },
  { label: 'LT', text: 'LT 90 ', ariaLabel: 'Insert left turn command' },
  { label: 'REPEAT', text: 'REPEAT 4 [  ]', cursorOffset: 11, ariaLabel: 'Insert repeat loop' },
  { label: 'CS', text: 'CS ', ariaLabel: 'Insert clearscreen command' },
  { label: 'PU', text: 'PU ', ariaLabel: 'Insert penup command' },
  { label: 'PD', text: 'PD ', ariaLabel: 'Insert pendown command' },
];

export class TouchRibbon {
  private container: HTMLElement;
  private editor: LogoEditor;
  private buttons: HTMLButtonElement[] = [];

  constructor(container: HTMLElement, editor: LogoEditor, items: RibbonItem[] = DEFAULT_RIBBON_ITEMS) {
    this.container = container;
    this.editor = editor;
    this.render(items);
  }

  private render(items: RibbonItem[]): void {
    this.container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'ribbon-scroll-container';
    wrapper.setAttribute('role', 'toolbar');
    wrapper.setAttribute('aria-label', 'Logo shortcut ribbon');

    this.buttons = [];

    items.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ribbon-btn';
      btn.textContent = item.label;
      btn.setAttribute('aria-label', item.ariaLabel);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (item.cursorOffset !== undefined) {
          this.editor.insertAtCursor(item.text, item.cursorOffset);
        } else {
          this.editor.insertAtCursor(item.text);
        }
      });

      btn.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const next = this.buttons[idx + 1] ?? this.buttons[0];
          next?.focus();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = this.buttons[idx - 1] ?? this.buttons[this.buttons.length - 1];
          prev?.focus();
        }
      });

      this.buttons.push(btn);
      wrapper.appendChild(btn);
    });

    this.container.appendChild(wrapper);
  }
}
