import { downloadBlob } from './file_io.ts';

export interface FilePickerFilter {
  description?: string;
  accept: Record<string, string[]>;
}

export const LOGO_FILE_PICKER_TYPES: FilePickerFilter[] = [
  {
    description: 'Logo Program (*.logo)',
    accept: {
      'text/plain': ['.logo', '.txt'],
    },
  },
];

export const PROJECT_FILE_PICKER_TYPES: FilePickerFilter[] = [
  {
    description: 'Logo Program or Project (*.logo, *.json)',
    accept: {
      'text/plain': ['.logo', '.txt'],
      'application/json': ['.json'],
    },
  },
];

export function hasFileSystemAccess(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window
  );
}

export async function writeToFileHandle(
  handle: FileSystemFileHandle,
  content: string | Blob
): Promise<void> {
  const writable = await (handle as any).createWritable();
  await writable.write(content);
  await writable.close();
}

export async function saveFileWithPicker(
  content: string | Blob,
  suggestedName: string,
  types?: FilePickerFilter[]
): Promise<FileSystemFileHandle | null> {
  if (hasFileSystemAccess()) {
    try {
      const options: Record<string, unknown> = {
        suggestedName,
      };
      if (types && types.length > 0) {
        options.types = types;
      }
      const handle = await (window as any).showSaveFilePicker(options);
      await writeToFileHandle(handle, content);
      return handle;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      throw err;
    }
  }

  // Fallback to traditional browser download
  const blob =
    typeof content === 'string'
      ? new Blob([content], { type: 'text/plain;charset=utf-8' })
      : content;
  downloadBlob(blob, suggestedName);
  return null;
}

export async function openFileWithPicker(
  types?: FilePickerFilter[]
): Promise<{ file: File; handle?: FileSystemFileHandle } | null> {
  if (hasFileSystemAccess()) {
    try {
      const options: Record<string, unknown> = {
        multiple: false,
      };
      if (types && types.length > 0) {
        options.types = types;
      }
      const handles = await (window as any).showOpenFilePicker(options);
      if (!handles || handles.length === 0) return null;
      const handle = handles[0];
      const file = await handle.getFile();
      return { file, handle };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      throw err;
    }
  }

  // Fallback using temporary hidden file input
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    if (types && types.length > 0 && types[0]?.accept) {
      const exts = Object.values(types[0].accept).flat().join(',');
      input.accept = exts;
    }
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => {
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];
        cleanup();
        if (file) {
          resolve({ file });
        } else {
          resolve(null);
        }
      },
      { once: true }
    );

    input.addEventListener(
      'cancel',
      () => {
        cleanup();
        resolve(null);
      },
      { once: true }
    );

    input.click();
  });
}
