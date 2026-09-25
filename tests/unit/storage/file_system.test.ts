import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hasFileSystemAccess,
  writeToFileHandle,
  saveFileWithPicker,
  openFileWithPicker,
} from '../../../src/storage/file_system.ts';

describe('File System Access API Utilities (Requirement 1 - Core)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (window as any).showSaveFilePicker;
    delete (window as any).showOpenFilePicker;
  });

  describe('hasFileSystemAccess', () => {
    it('returns true when both showOpenFilePicker and showSaveFilePicker are supported', () => {
      (window as any).showSaveFilePicker = vi.fn();
      (window as any).showOpenFilePicker = vi.fn();
      expect(hasFileSystemAccess()).toBe(true);
    });

    it('returns false when either API is absent', () => {
      (window as any).showSaveFilePicker = vi.fn();
      delete (window as any).showOpenFilePicker;
      expect(hasFileSystemAccess()).toBe(false);

      delete (window as any).showSaveFilePicker;
      expect(hasFileSystemAccess()).toBe(false);
    });
  });

  describe('writeToFileHandle', () => {
    it('writes content to the handle writable stream and closes it', async () => {
      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockHandle = {
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      } as unknown as FileSystemFileHandle;

      await writeToFileHandle(mockHandle, 'FD 100 RT 90');

      expect(mockHandle.createWritable).toHaveBeenCalled();
      expect(mockWritable.write).toHaveBeenCalledWith('FD 100 RT 90');
      expect(mockWritable.close).toHaveBeenCalled();
    });
  });

  describe('saveFileWithPicker', () => {
    it('saves file via showSaveFilePicker when API is supported', async () => {
      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockHandle = {
        name: 'star.logo',
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      } as unknown as FileSystemFileHandle;

      (window as any).showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);
      (window as any).showOpenFilePicker = vi.fn();

      const result = await saveFileWithPicker('REPEAT 5 [ FD 50 RT 144 ]', 'star.logo');

      expect((window as any).showSaveFilePicker).toHaveBeenCalledWith(
        expect.objectContaining({ suggestedName: 'star.logo' })
      );
      expect(mockWritable.write).toHaveBeenCalled();
      expect(result).toBe(mockHandle);
    });

    it('gracefully handles AbortError (user cancel) and returns null without error', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      (window as any).showSaveFilePicker = vi.fn().mockRejectedValue(abortError);
      (window as any).showOpenFilePicker = vi.fn();

      const result = await saveFileWithPicker('FD 100', 'drawing.logo');
      expect(result).toBeNull();
    });

    it('falls back to downloadBlob when File System Access API is unsupported', async () => {
      delete (window as any).showSaveFilePicker;
      delete (window as any).showOpenFilePicker;

      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const result = await saveFileWithPicker('CS FD 100', 'fallback.logo');

      expect(result).toBeNull();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });
  });

  describe('openFileWithPicker', () => {
    it('opens file via showOpenFilePicker when API is supported', async () => {
      const mockFile = new File(['FD 50'], 'turtle.logo', { type: 'text/plain' });
      const mockHandle = {
        name: 'turtle.logo',
        getFile: vi.fn().mockResolvedValue(mockFile),
      } as unknown as FileSystemFileHandle;

      (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([mockHandle]);
      (window as any).showSaveFilePicker = vi.fn();

      const result = await openFileWithPicker();

      expect(result).not.toBeNull();
      expect(result?.file).toBe(mockFile);
      expect(result?.handle).toBe(mockHandle);
    });

    it('gracefully handles AbortError when opening and returns null', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      (window as any).showOpenFilePicker = vi.fn().mockRejectedValue(abortError);
      (window as any).showSaveFilePicker = vi.fn();

      const result = await openFileWithPicker();
      expect(result).toBeNull();
    });
  });
});
