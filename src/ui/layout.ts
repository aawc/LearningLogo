export class SplitLayout {
  private editorPane: HTMLElement;
  private canvasPane: HTMLElement;
  private workspace: HTMLElement;

  constructor(editorPane: HTMLElement, canvasPane: HTMLElement, workspace: HTMLElement) {
    this.editorPane = editorPane;
    this.canvasPane = canvasPane;
    this.workspace = workspace;
    this.init();
  }

  private init(): void {
    this.updateOrientation();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.updateOrientation());
    }
  }

  public getEditorPane(): HTMLElement {
    return this.editorPane;
  }

  public getCanvasPane(): HTMLElement {
    return this.canvasPane;
  }

  public updateOrientation(): void {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      this.workspace.classList.add('workspace-stacked');
      this.workspace.classList.remove('workspace-side-by-side');
    } else {
      this.workspace.classList.add('workspace-side-by-side');
      this.workspace.classList.remove('workspace-stacked');
    }
  }

  public isStacked(): boolean {
    return window.innerWidth < 768;
  }
}
