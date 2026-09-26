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
  try {
    await writable.write(content);
    await writable.close();
  } catch (err) {
    if (typeof (writable as any).abort === 'function') {
      try {
        await (writable as any).abort();
      } catch {
        // Suppress secondary abort errors
      }
    }
    throw err;
  }
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

export async function saveFileAsWithHandle(
  content: string | Blob,
  suggestedName: string = 'Untitled.logo',
  types: FilePickerFilter[] = LOGO_FILE_PICKER_TYPES
): Promise<{ handle: FileSystemFileHandle | null; name: string } | null> {
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
      return { handle, name: handle.name || suggestedName };
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
  return { handle: null, name: suggestedName };
}

export async function verifyHandlePermission(
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> {
  if (typeof (handle as any).queryPermission === 'function') {
    const opts = { mode };
    const status = await (handle as any).queryPermission(opts);
    if (status === 'granted') {
      return true;
    }
    if (typeof (handle as any).requestPermission === 'function') {
      const reqStatus = await (handle as any).requestPermission(opts);
      return reqStatus === 'granted';
    }
  }
  return true;
}

export async function readFileFromHandle(
  handle: FileSystemFileHandle
): Promise<{ file: File; text: string }> {
  const file = await handle.getFile();
  let text = '';
  if (typeof file.text === 'function') {
    text = await file.text();
  } else {
    text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
  return { file, text };
}
