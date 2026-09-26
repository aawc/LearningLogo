import './styles/base.css';
import './styles/tokens.css';
import './styles/layout.css';
import './styles/editor.css';
import './styles/highlighter.css';
import './styles/toolbar.css';
import './styles/repl.css';
import './styles/debugger.css';
import './styles/modal.css';
import './styles/export_menu.css';
import './styles/pwa.css';
import './styles/feedback.css';
import './styles/version_switcher.css';

import { LogoEditor } from './editor/editor.ts';
import { TouchRibbon } from './editor/toolbar.ts';
import { ReplConsole } from './editor/repl.ts';
import { Turtle } from './graphics/turtle.ts';
import { CanvasRenderer } from './graphics/renderer.ts';
import { StepperController } from './debugger/stepper.ts';
import { DebuggerControls } from './debugger/controls.ts';
import { InspectorPanel } from './debugger/inspector.ts';
import { LocalStore } from './storage/local_store.ts';
import { ProjectManager } from './storage/project_manager.ts';
import { ProjectModal } from './storage/project_modal.ts';
import { openFileWithPicker, PROJECT_FILE_PICKER_TYPES } from './storage/file_system.ts';
import {
  compressCodeToHash,
  extractCodeFromUrl,
  isHashSafeLength,
} from './storage/url_share.ts';
import { createProject } from './storage/project.ts';
import {
  exportLogoFile,
  exportCanvasPng,
  exportProjectJson,
  importFromFile,
} from './storage/file_io.ts';
import { UpdateBanner } from './pwa/update_banner.ts';
import { registerServiceWorker, type ServiceWorkerHandle } from './pwa/register_sw.ts';
import { SplitLayout, createFeedbackButton } from './ui/layout.ts';
import { VersionSwitcher } from './ui/version_switcher.ts';
import { SplitExportButton } from './ui/split_export_button.ts';
import { FeedbackModal } from './feedback/feedback_modal.ts';
import { tokenize } from './interpreter/lexer.ts';
import { parse } from './interpreter/parser.ts';
import { Environment } from './interpreter/environment.ts';
import { Runtime, CancellationToken } from './interpreter/runtime.ts';

export { DEFAULT_STARTER_CODE } from './editor/starter_code.ts';
import { DEFAULT_STARTER_CODE } from './editor/starter_code.ts';

export function initializeApp(): void {
  const editorContainer = document.getElementById('editor-container');
  const toolbarContainer = document.getElementById('toolbar-container');
  const replContainer = document.getElementById('repl-container');
  const canvasContainer = document.getElementById('canvas-container');
  const debuggerContainer = document.getElementById('debugger-container');
  const headerContainer = document.getElementById('header-container');
  const pwaBannerContainer = document.getElementById('pwa-banner');
  const workspaceContainer = document.getElementById('workspace-container');
  const editorPane = document.getElementById('editor-pane');
  const canvasPane = document.getElementById('canvas-pane');
  const paneSplitter = document.getElementById('pane-splitter');

  if (
    !editorContainer ||
    !toolbarContainer ||
    !replContainer ||
    !canvasContainer ||
    !debuggerContainer ||
    !headerContainer ||
    !pwaBannerContainer ||
    !workspaceContainer ||
    !editorPane ||
    !canvasPane
  ) {
    return;
  }

  // 1. Storage & State Setup
  const store = new LocalStore();
  const turtle = new Turtle();
  const stepper = new StepperController();
  let lastError: { message: string; timestamp: number } | null = null;

  window.addEventListener('error', (event) => {
    lastError = { message: event.message || 'Window error', timestamp: Date.now() };
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    lastError = { message: `Unhandled Promise: ${reason}`, timestamp: Date.now() };
  });

  // 2. Editor & Input Setup
  const editor = new LogoEditor(editorContainer);
  new TouchRibbon(toolbarContainer, editor);

  // 3. Canvas & Renderer Setup
  canvasContainer.innerHTML = '';
  const pathCanvas = document.createElement('canvas');
  const spriteCanvas = document.createElement('canvas');
  pathCanvas.className = 'layer-paths';
  spriteCanvas.className = 'layer-sprite';
  canvasContainer.appendChild(pathCanvas);
  canvasContainer.appendChild(spriteCanvas);

  const renderer = new CanvasRenderer(pathCanvas, spriteCanvas);

  const getViewport = () => {
    const rect = canvasContainer.getBoundingClientRect();
    return {
      width: rect.width || 800,
      height: rect.height || 600,
      zoom: 1,
      panX: 0,
      panY: 0,
    };
  };

  const renderCanvas = () => {
    const vp = getViewport();
    renderer.renderDrawElements(turtle.getDrawElements(), vp);
    renderer.renderTurtle(turtle.getState(), vp);
  };

  const resizeCanvas = () => {
    const rect = canvasContainer.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      renderer.resize(rect.width, rect.height);
      renderCanvas();
    }
  };

  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 50);

  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(canvasContainer);
  }

  // 4. Debugger Controls & Inspector Setup
  const controlsDiv = document.createElement('div');
  const inspectorDiv = document.createElement('div');
  debuggerContainer.appendChild(controlsDiv);
  debuggerContainer.appendChild(inspectorDiv);

  new DebuggerControls(controlsDiv, stepper, () => {
    turtle.clearScreen();
    renderCanvas();
  });
  const inspector = new InspectorPanel(inspectorDiv);

  // 5. Wire Stepper Callbacks
  stepper.setOnStep((step) => {
    renderCanvas();
    editor.highlightExecutionLine(step.location.line);
    inspector.update(step.env, step.callStack);
  });

  stepper.setOnFinish(() => {
    lastError = null;
    renderCanvas();
    editor.clearExecutionHighlight();
  });

  stepper.setOnStop(() => {
    editor.clearExecutionHighlight();
    inspector.clear();
    renderCanvas();
  });

  stepper.setOnError((err) => {
    editor.clearExecutionHighlight();
    const msg = err instanceof Error ? err.message : String(err);
    lastError = { message: msg, timestamp: Date.now() };
    alert(`Turtle Error: ${msg}`);
  });

  // When RUN/STEP is triggered on stepper, load fresh AST
  const loadEditorCodeIntoStepper = () => {
    try {
      const code = editor.getValue();
      const tokens = tokenize(code);
      const ast = parse(tokens);
      const env = new Environment();
      turtle.clearScreen();
      renderCanvas();
      stepper.load(ast, env, turtle, { renderer });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = { message: `Syntax Error: ${msg}`, timestamp: Date.now() };
      alert(`Syntax Error: ${msg}`);
      return false;
    }
  };

  // Intercept run/step to reload program if IDLE
  const origRun = stepper.run.bind(stepper);
  stepper.run = () => {
    if (stepper.getState() === 'IDLE') {
      if (!loadEditorCodeIntoStepper()) return;
    }
    origRun();
  };

  const origStepInto = stepper.stepInto.bind(stepper);
  stepper.stepInto = () => {
    if (stepper.getState() === 'IDLE') {
      if (!loadEditorCodeIntoStepper()) return;
    }
    origStepInto();
  };

  const origStepOver = stepper.stepOver.bind(stepper);
  stepper.stepOver = () => {
    if (stepper.getState() === 'IDLE') {
      if (!loadEditorCodeIntoStepper()) return;
    }
    origStepOver();
  };

  // 6. Immediate REPL Setup with Persistent Environment
  const replEnv = new Environment();
  const repl = new ReplConsole(replContainer);
  repl.setOnExecute((commandText) => {
    try {
      // Sync any procedure definitions currently in the editor
      try {
        const editorAst = parse(tokenize(editor.getValue()));
        for (const node of editorAst.body) {
          if (node.type === 'ProcedureDef') {
            replEnv.defineProcedure(node.name, node);
          }
        }
      } catch {
        // If editor has syntax errors, ignore and execute command in existing environment
      }

      const tokens = tokenize(commandText);
      const ast = parse(tokens);
      const cancel = new CancellationToken();
      const runtime = new Runtime();
      for (const _ of runtime.execute(ast, replEnv, turtle, cancel, { renderer })) {
        // execute immediate
      }
      renderCanvas();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = { message: `Command Error: ${msg}`, timestamp: Date.now() };
      alert(`Command Error: ${msg}`);
    }
  });

  // 7. Header Navigation & Actions Setup
  const projectManager = new ProjectManager({
    store,
    getCurrentCode: () => editor.getValue(),
    setCode: (code) => {
      editor.setValue(code);
      turtle.clearScreen();
      renderCanvas();
    },
    initialProjectName: 'Untitled Project',
  });

  const confirmDiscardUnsaved = (): boolean => {
    if (!projectManager.getIsDirty()) return true;
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') return true;
    try {
      const res = window.confirm('You have unsaved changes. Discard them?');
      if (res === undefined) return true;
      return Boolean(res);
    } catch {
      return true;
    }
  };

  const handleImport = async () => {
    if (!confirmDiscardUnsaved()) return;
    try {
      const res = await openFileWithPicker(PROJECT_FILE_PICKER_TYPES);
      if (!res) return;
      const importedCode = await importFromFile(res.file);
      editor.setValue(importedCode);
      turtle.clearScreen();
      renderCanvas();
      projectManager.loadFromFile(res.file, res.handle ?? null, importedCode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = { message: `Import Failed: ${msg}`, timestamp: Date.now() };
      alert(`Import Failed: ${msg}`);
    }
  };

  const handleNew = () => {
    if (!confirmDiscardUnsaved()) return;
    projectManager.newFile();
    turtle.clearScreen();
    renderCanvas();
  };

  const handleOpen = async () => {
    if (!confirmDiscardUnsaved()) return;
    try {
      const success = await projectManager.openFile();
      if (success) {
        turtle.clearScreen();
        renderCanvas();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = { message: `Open Failed: ${msg}`, timestamp: Date.now() };
      alert(`Open Failed: ${msg}`);
    }
  };

  const handleSave = async () => {
    try {
      await projectManager.save();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = { message: `Save Failed: ${msg}`, timestamp: Date.now() };
      alert(`Save Failed: ${msg}`);
    }
  };

  const handleSaveAs = async () => {
    try {
      await projectManager.saveAs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = { message: `Save As Failed: ${msg}`, timestamp: Date.now() };
      alert(`Save As Failed: ${msg}`);
    }
  };

  const modal = new ProjectModal(projectManager, () => editor.getValue(), {
    onImportFile: handleImport,
    onExportProject: (project) => {
      exportProjectJson(project.name, project);
    },
    onNewProject: () => {
      editor.setValue(DEFAULT_STARTER_CODE);
      turtle.clearScreen();
      renderCanvas();
    },
  });
  modal.setOnLoadProject((code) => {
    editor.setValue(code);
    turtle.clearScreen();
    renderCanvas();
  });

  const feedbackModal = new FeedbackModal(document.body, () => ({
    editor,
    turtle,
    stepper,
    repl,
    lastError,
  }));

  headerContainer.innerHTML = '';
  const brand = document.createElement('div');
  brand.className = 'brand-title';
  brand.innerHTML = '<span class="brand-turtle">🐢</span> LearningLogo';

  const titleBadge = document.createElement('div');
  titleBadge.className = 'project-title-badge';
  titleBadge.setAttribute('role', 'button');
  titleBadge.setAttribute('aria-haspopup', 'dialog');
  titleBadge.setAttribute('aria-label', 'Active project and save status: click to manage projects');
  titleBadge.tabIndex = 0;

  const updateDocumentTitle = (state: { activeFileName: string; isDirty: boolean }) => {
    document.title = `${state.isDirty ? '*' : ''}${state.activeFileName} - LearningLogo`;
  };

  const updateTitleBadge = (state: { activeProjectName: string; activeFileName: string; isDirty: boolean }) => {
    titleBadge.innerHTML = '';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'project-badge-name';
    nameSpan.textContent = state.activeFileName || `${state.activeProjectName}.logo`;

    const projectSpan = document.createElement('span');
    projectSpan.className = 'sr-only project-badge-project';
    projectSpan.style.display = 'none';
    projectSpan.textContent = state.activeProjectName;

    const statusSpan = document.createElement('span');
    statusSpan.className = `project-badge-status ${state.isDirty ? 'status-dirty' : 'status-saved'}`;
    statusSpan.textContent = state.isDirty ? '[Unsaved]' : '[Saved]';

    titleBadge.appendChild(nameSpan);
    titleBadge.appendChild(projectSpan);
    titleBadge.appendChild(statusSpan);
  };

  updateTitleBadge(projectManager.getState());
  updateDocumentTitle(projectManager.getState());

  projectManager.onStateChange((state) => {
    updateTitleBadge(state);
    updateDocumentTitle(state);
  });

  titleBadge.addEventListener('click', () => {
    modal.open();
  });
  titleBadge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      modal.open();
    }
  });

  const brandGroup = document.createElement('div');
  brandGroup.className = 'brand-group';
  brandGroup.style.display = 'flex';
  brandGroup.style.alignItems = 'center';
  brandGroup.style.gap = '14px';
  brandGroup.appendChild(brand);
  brandGroup.appendChild(titleBadge);

  const actions = document.createElement('div');
  actions.className = 'header-actions';

  const newBtn = document.createElement('button');
  newBtn.type = 'button';
  newBtn.className = 'dbg-btn btn-new';
  newBtn.textContent = '📄 New';
  newBtn.addEventListener('click', handleNew);

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'dbg-btn btn-open';
  openBtn.textContent = '📂 Open...';
  openBtn.addEventListener('click', handleOpen);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'dbg-btn btn-save';
  saveBtn.textContent = '💾 Save';
  saveBtn.addEventListener('click', handleSave);

  const saveAsBtn = document.createElement('button');
  saveAsBtn.type = 'button';
  saveAsBtn.className = 'dbg-btn btn-save-as';
  saveAsBtn.textContent = '💾 Save As...';
  saveAsBtn.addEventListener('click', handleSaveAs);

  const projectsBtn = document.createElement('button');
  projectsBtn.type = 'button';
  projectsBtn.className = 'dbg-btn';
  projectsBtn.textContent = 'Projects';
  projectsBtn.addEventListener('click', () => modal.open());

  const shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.className = 'dbg-btn';
  shareBtn.textContent = 'Share Link';
  shareBtn.addEventListener('click', () => {
    const code = editor.getValue();
    const hash = compressCodeToHash(code);
    if (!isHashSafeLength(hash)) {
      alert('Program is too large for URL sharing (exceeds 2000 characters). Please use Export to save as a file instead.');
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}#code=${hash}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Shareable link copied to clipboard!');
    }).catch(() => {
      prompt('Copy this shareable link:', shareUrl);
    });
  });

  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'dbg-btn';
  importBtn.textContent = 'Import';
  importBtn.addEventListener('click', handleImport);

  const feedbackBtn = createFeedbackButton(() => feedbackModal.open());

  actions.appendChild(newBtn);
  actions.appendChild(openBtn);
  actions.appendChild(saveBtn);
  actions.appendChild(saveAsBtn);
  actions.appendChild(projectsBtn);
  actions.appendChild(shareBtn);

  new SplitExportButton(actions, {
    onExportLogo: () => {
      exportLogoFile(projectManager.getActiveProjectName(), editor.getValue());
    },
    onExportPng: () => {
      exportCanvasPng(pathCanvas, projectManager.getActiveProjectName());
    },
    onExportJson: () => {
      const p = createProject(projectManager.getActiveProjectName(), editor.getValue());
      const activeId = projectManager.getActiveProjectId();
      if (activeId) {
        p.id = activeId;
      }
      exportProjectJson(projectManager.getActiveProjectName(), p);
    },
  });

  actions.appendChild(importBtn);

  // 10. PWA Offline Setup & Auto-Update Banner
  const updateBanner = new UpdateBanner(pwaBannerContainer);

  let swHandle: ServiceWorkerHandle | void;

  const showUpdateBanner = (waitingWorker?: ServiceWorker) => {
    updateBanner.show(
      () => {
        let fallbackTimer: number | null = null;
        const handleReload = () => {
          if (fallbackTimer !== null) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
          }
          window.location.reload();
        };

        const targetWorker = waitingWorker || swHandle?.getRegistration()?.waiting;
        if (targetWorker) {
          targetWorker.postMessage({ action: 'SKIP_WAITING' });
        }
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener(
            'controllerchange',
            () => {
              handleReload();
            },
            { once: true }
          );
        }
        fallbackTimer = window.setTimeout(() => handleReload(), 250);
      },
      () => {
        updateBanner.hide();
      }
    );
  };

  swHandle = registerServiceWorker((waitingWorker) => {
    showUpdateBanner(waitingWorker);
  });

  new VersionSwitcher(actions, {
    onBeforeSwitch: () => {
      const currentCode = editor.getValue();
      store.saveDraft(currentCode);
      const hash = compressCodeToHash(currentCode);
      if (isHashSafeLength(hash)) {
        window.location.hash = 'code=' + hash;
      }
    },
    onUpdateAvailable: () => {
      if (swHandle && typeof swHandle.update === 'function') {
        swHandle.update();
      } else if (
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator &&
        typeof navigator.serviceWorker.getRegistration === 'function'
      ) {
        navigator.serviceWorker
          .getRegistration()
          .then((reg) => reg?.update?.())
          .catch(() => {});
      }
      showUpdateBanner();
    },
  });

  actions.appendChild(feedbackBtn);
  headerContainer.appendChild(brandGroup);
  headerContainer.appendChild(actions);

  // 8. Responsive Layout
  new SplitLayout(editorPane, canvasPane, workspaceContainer, paneSplitter, {
    onResize: () => {
      resizeCanvas();
    },
  });

  // 9. Initial Code Loading (URL Hash -> LocalStorage Draft -> Default Starter)
  const sharedCode = extractCodeFromUrl(window.location.href);
  if (sharedCode) {
    editor.setValue(sharedCode);
  } else {
    const draft = store.getDraft();
    if (draft) {
      editor.setValue(draft);
    } else {
      editor.setValue(DEFAULT_STARTER_CODE);
    }

    // Check if running within local Go desktop embed server
    if (
      typeof window !== 'undefined' &&
      (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
      typeof fetch === 'function'
    ) {
      fetch('/api/status', {
        headers: { 'X-LearningLogo-Client': '1' },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then(async (status) => {
          if (status && status.activeFile) {
            const fileRes = await fetch(`/api/file?path=${encodeURIComponent(status.activeFile)}`, {
              headers: { 'X-LearningLogo-Client': '1' },
            });
            if (fileRes.ok) {
              const code = await fileRes.text();
              editor.setValue(code);
              turtle.clearScreen();
              renderCanvas();
              const fileName = status.activeFile.split(/[/\\]/).pop() || 'Untitled.logo';
              projectManager.setActiveFileName(fileName);
              projectManager.markDirty(false);
            }
          }
        })
        .catch(() => {
          // Running in standard browser or dev server without active Go desktop API
        });
    }
  }

  // Autosave draft on edit (debounced)
  let draftTimeout: number | null = null;
  editor.setOnChange((val) => {
    projectManager.markDirty(true);
    if (draftTimeout !== null) clearTimeout(draftTimeout);
    draftTimeout = window.setTimeout(() => {
      store.saveDraft(val);
    }, 1000);
  });

  // Keyboard shortcuts: Ctrl+S / Cmd+S (Save), Ctrl+Shift+S (Save As), Ctrl+O (Open), Ctrl+N (New)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveAs();
        } else {
          handleSave();
        }
      } else if (key === 'o' && !e.shiftKey) {
        e.preventDefault();
        handleOpen();
      } else if (key === 'n' && !e.shiftKey) {
        e.preventDefault();
        handleNew();
      }
    }
  });

  // Drag-and-drop file loading onto window / editor
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    document.body.classList.add('drag-active');
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    document.body.classList.remove('drag-active');
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.classList.remove('drag-active');

    if (!confirmDiscardUnsaved()) return;

    const dt = e.dataTransfer;
    if (!dt) return;

    let handle: FileSystemFileHandle | null = null;
    let file: File | null = null;

    if (dt.items && dt.items.length > 0) {
      const item = dt.items[0];
      if (item) {
        if (typeof (item as any).getAsFileSystemHandle === 'function') {
          try {
            const h = await (item as any).getAsFileSystemHandle();
            if (h && (h.kind === 'file' || !h.kind)) {
              handle = h as FileSystemFileHandle;
              file = await handle.getFile();
            }
          } catch {
            // Fallback to getAsFile
          }
        }
        if (!file && item.kind === 'file') {
          file = item.getAsFile();
        }
      }
    } else if (dt.files && dt.files.length > 0) {
      file = dt.files[0] ?? null;
    }

    if (file) {
      let code = '';
      if (typeof file.text === 'function') {
        code = await file.text();
      } else {
        code = await importFromFile(file);
      }
      editor.setValue(code);
      turtle.clearScreen();
      renderCanvas();
      projectManager.loadFromFile(file, handle, code);
    }
  };

  window.addEventListener('dragover', handleDragOver);
  window.addEventListener('dragleave', handleDragLeave);
  window.addEventListener('drop', handleDrop);

  // Warn before closing or navigating if unsaved changes exist
  window.addEventListener('beforeunload', (e) => {
    if (projectManager.getIsDirty()) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });

  renderCanvas();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
  });
}

