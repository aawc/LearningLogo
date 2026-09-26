import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hasFileSystemAccess,
  writeToFileHandle,
  saveFileWithPicker,
  openFileWithPicker,
  saveFileAsWithHandle,
  verifyHandlePermission,
  readFileFromHandle,
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

    it('aborts writable stream and rethrows when write operation fails', async () => {
      const writeError = new Error('Disk full or quota exceeded');
      const mockWritable = {
        write: vi.fn().mockRejectedValue(writeError),
        close: vi.fn(),
        abort: vi.fn().mockResolvedValue(undefined),
      };
      const mockHandle = {
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      } as unknown as FileSystemFileHandle;

      await expect(writeToFileHandle(mockHandle, 'FD 50')).rejects.toThrow('Disk full or quota exceeded');
      expect(mockWritable.abort).toHaveBeenCalled();
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

  describe('saveFileAsWithHandle', () => {
    it('saves file via showSaveFilePicker and returns handle and filename', async () => {
      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockHandle = {
        name: 'star_burst.logo',
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      } as unknown as FileSystemFileHandle;

      (window as any).showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);
      (window as any).showOpenFilePicker = vi.fn();

      const result = await saveFileAsWithHandle('FD 100 RT 144', 'star_burst.logo');

      expect((window as any).showSaveFilePicker).toHaveBeenCalledWith(
        expect.objectContaining({ suggestedName: 'star_burst.logo' })
      );
      expect(mockWritable.write).toHaveBeenCalledWith('FD 100 RT 144');
      expect(mockWritable.close).toHaveBeenCalled();
      expect(result).toEqual({ handle: mockHandle, name: 'star_burst.logo' });
    });

    it('returns null when user cancels save dialog with AbortError', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      (window as any).showSaveFilePicker = vi.fn().mockRejectedValue(abortError);
      (window as any).showOpenFilePicker = vi.fn();

      const result = await saveFileAsWithHandle('FD 100', 'cancel.logo');
      expect(result).toBeNull();
    });

    it('falls back to downloadBlob and returns suggestedName when File System Access API is absent', async () => {
      delete (window as any).showSaveFilePicker;
      delete (window as any).showOpenFilePicker;

      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const result = await saveFileAsWithHandle('FD 50', 'fallback_draw.logo');

      expect(result).toEqual({ handle: null, name: 'fallback_draw.logo' });
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });
  });

  describe('verifyHandlePermission', () => {
    it('returns true if permission is already granted', async () => {
      const mockHandle = {
        queryPermission: vi.fn().mockResolvedValue('granted'),
      } as unknown as FileSystemFileHandle;

      const granted = await verifyHandlePermission(mockHandle, 'readwrite');
      expect(granted).toBe(true);
      expect((mockHandle as any).queryPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    });

    it('requests permission if prompt is needed and returns true when granted', async () => {
      const mockHandle = {
        queryPermission: vi.fn().mockResolvedValue('prompt'),
        requestPermission: vi.fn().mockResolvedValue('granted'),
      } as unknown as FileSystemFileHandle;

      const granted = await verifyHandlePermission(mockHandle, 'readwrite');
      expect(granted).toBe(true);
      expect((mockHandle as any).requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    });

    it('returns false when permission is denied', async () => {
      const mockHandle = {
        queryPermission: vi.fn().mockResolvedValue('prompt'),
        requestPermission: vi.fn().mockResolvedValue('denied'),
      } as unknown as FileSystemFileHandle;

      const granted = await verifyHandlePermission(mockHandle, 'readwrite');
      expect(granted).toBe(false);
    });
  });

  describe('readFileFromHandle', () => {
    it('reads file content and metadata from FileSystemFileHandle', async () => {
      const mockFile = new File(['TO BOX FD 20 END'], 'box.logo', { type: 'text/plain' });
      const mockHandle = {
        name: 'box.logo',
        getFile: vi.fn().mockResolvedValue(mockFile),
      } as unknown as FileSystemFileHandle;

      const result = await readFileFromHandle(mockHandle);
      expect(mockHandle.getFile).toHaveBeenCalled();
      expect(result.file).toBe(mockFile);
      expect(result.text).toBe('TO BOX FD 20 END');
    });
  });
});
