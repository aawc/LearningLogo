import type { Project } from './project.ts';
import { serializeProject, deserializeProject } from './project.ts';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportLogoFile(filename: string, code: string): void {
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const safeName = filename.endsWith('.logo') ? filename : `${filename}.logo`;
  downloadBlob(blob, safeName);
}

export function exportProjectJson(filename: string, project: Project): void {
  const jsonStr = serializeProject(project);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const safeName = filename.endsWith('.json') ? filename : `${filename}.json`;
  downloadBlob(blob, safeName);
}

export function exportCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (blob) {
      const safeName = filename.endsWith('.png') ? filename : `${filename}.png`;
      downloadBlob(blob, safeName);
    }
  }, 'image/png');
}

export function importFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      if (file.name.endsWith('.json')) {
        const proj = deserializeProject(text);
        if (proj) {
          resolve(proj.code);
          return;
        }
      }
      resolve(text);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
