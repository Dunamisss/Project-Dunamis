import { submitPrompt, getUserProfile } from './firestore-access';

export async function processBulkFilesFromZip(zip: any, fileNames: string[], user: any, category: string) {
  if (!user) throw new Error('Not authenticated');

  const profile = await getUserProfile(user.uid);
  if (!profile || profile.accessTier !== 'admin') throw new Error('Admin-only operation');

  const results: { ok: number; failed: number; failures: any[] } = { ok: 0, failed: 0, failures: [] };

  for (let i = 0; i < fileNames.length; i++) {
    try {
      const name = fileNames[i];
      const entry = zip.files[name];
      const text = await entry.async('string');
      const filename = name.split('/').pop() || name;
      const title = filename.replace(/\.[^.]+$/, '') || filename;

      // Create a File blob for attachment upload
      const blob = new Blob([text], { type: 'text/plain' });
      const fileObj = new File([blob], filename, { type: 'text/plain' });

      await submitPrompt(user.uid, user.email || '', user.displayName || undefined, title, `Imported from ${filename}`, text, category, [], fileObj, 'bulk');
      results.ok++;
    } catch (err) {
      results.failed++;
      results.failures.push({ file: fileNames[i], error: String(err) });
    }
  }

  return results;
}

export async function processBulkFilesFromFolder(files: File[], user: any, category: string) {
  if (!user) throw new Error('Not authenticated');

  const profile = await getUserProfile(user.uid);
  if (!profile || profile.accessTier !== 'admin') throw new Error('Admin-only operation');

  const results: { ok: number; failed: number; failures: any[] } = { ok: 0, failed: 0, failures: [] };

  for (const f of files) {
    try {
      const text = await f.text();
      const title = f.name.replace(/\.[^.]+$/, '') || f.name;
      await submitPrompt(user.uid, user.email || '', user.displayName || undefined, title, `Imported from ${f.name}`, text, category, [], f, 'bulk');
      results.ok++;
    } catch (err) {
      results.failed++;
      results.failures.push({ file: f.name, error: String(err) });
    }
  }

  return results;
}
