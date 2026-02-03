import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bulk from '@/lib/bulk-upload';
import { submitPrompt as submitPromptFn } from '@/lib/firestore-access';

vi.mock('@/lib/firestore-access', () => ({
  submitPrompt: vi.fn(async () => 'mocked-id'),
  getUserProfile: vi.fn(async () => ({ uid: 'u1', accessTier: 'admin' }))
}));

describe('Bulk file processing (SubmitPrompt)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('processes files from folder and calls submitPrompt for each', async () => {
    const fakeFiles = [
      new File(['first content'], 'one.txt', { type: 'text/plain' }),
      new File(['second content'], 'two.md', { type: 'text/markdown' })
    ];

    const user = { uid: 'u1', email: 'u@t.com', displayName: 'U' };

    await bulk.processBulkFilesFromFolder(fakeFiles as any, user as any, 'Other');

    expect(submitPromptFn).toHaveBeenCalledTimes(2);

    expect(submitPromptFn).toHaveBeenCalledTimes(2);
    expect((submitPromptFn as any).mock.calls[0][3]).toBe('one');
    expect((submitPromptFn as any).mock.calls[1][3]).toBe('two');
  });

  it('processes files from zip and calls submitPrompt for each', async () => {
    const zipMock = {
      files: {
        'a/one.txt': { dir: false, async: async (t: any) => 'content one' },
        'b/two.md': { dir: false, async: async (t: any) => 'content two' },
        'c/skip.png': { dir: false, async: async (t: any) => 'ignored' }
      }
    } as any;

    // JSZip.loadAsync is used in the UI handler; here we already have a zip-like object
    const user = { uid: 'u1', email: 'u@t.com', displayName: 'U' };

    await bulk.processBulkFilesFromZip(zipMock, ['a/one.txt', 'b/two.md'], user as any, 'Other');

    expect(submitPromptFn).toHaveBeenCalledTimes(2);
    expect((submitPromptFn as any).mock.calls[0][3]).toBe('one');
    expect((submitPromptFn as any).mock.calls[1][3]).toBe('two');
  });

  it('throws when user is not admin for folder uploads', async () => {
    // make getUserProfile return free tier
    const getUserProfile = (await import('@/lib/firestore-access')) as any;
    (getUserProfile.getUserProfile as any).mockResolvedValueOnce({ uid: 'u1', accessTier: 'free' });

    const fakeFiles = [new File(['first'], 'one.txt', { type: 'text/plain' })];
    const user = { uid: 'u1', email: 'u@t.com', displayName: 'U' };

    await expect(bulk.processBulkFilesFromFolder(fakeFiles as any, user as any, 'Other')).rejects.toThrow('Admin-only operation');
  });

  it('throws when user is not admin for zip uploads', async () => {
    // make getUserProfile return free tier
    const getUserProfile = (await import('@/lib/firestore-access')) as any;
    (getUserProfile.getUserProfile as any).mockResolvedValueOnce({ uid: 'u1', accessTier: 'free' });

    const zipMock = {
      files: {
        'a/one.txt': { dir: false, async: async (t: any) => 'content one' }
      }
    } as any;

    const user = { uid: 'u1', email: 'u@t.com', displayName: 'U' };

    await expect(bulk.processBulkFilesFromZip(zipMock, ['a/one.txt'], user as any, 'Other')).rejects.toThrow('Admin-only operation');
  });
});
