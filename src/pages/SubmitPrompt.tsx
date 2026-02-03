import React from "react";

export default function SubmitPrompt() {
  return null;
}
      const JSZipModule: any = await new Function("return import('jszip')")();
      const jszip = new (JSZipModule.default ?? JSZipModule)();
      const zip = await jszip.loadAsync(file);
      const entries = Object.keys(zip.files)
        .filter((name) => !zip.files[name].dir && /\.(txt|md|json)$/i.test(name))
        .slice(0, MAX_BULK_FILES);

      if (entries.length === 0) {
        toast.error('No valid text files found in ZIP');
        return;
      }

      const queue: Array<{ file: File; name: string; size: number; preview: string; selected: boolean }> = [];
      for (const name of entries) {
        const entry = zip.files[name];
        const text = await entry.async('string');
        const filename = name.split('/').pop() || name;
        const preview = text.slice(0, 200);
        const blob = new Blob([text], { type: 'text/plain' });
        const fileObj = new File([blob], filename, { type: 'text/plain' });
        queue.push({ file: fileObj, name: filename, size: fileObj.size, preview, selected: true });
      }

      setBulkQueue(queue);
      setBulkFilesCount(queue.length);
      setIsBulkPreviewOpen(true);
    } catch (err) {
      console.error('Error reading zip:', err);
      toast.error('Failed to process ZIP');
    }
  }

  async function processBulkFilesFromZip(zip: any, fileNames: string[]) {
    if (!user) { toast.error('Sign in to bulk upload'); return; }
    setIsProcessingBulk(true);
    setBulkProgress({ processed: 0, total: fileNames.length });

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

        await submitPrompt(user.uid, user.email || '', user.displayName || undefined, title, `Imported from ${filename}`, text, category, [], fileObj);
        results.ok++;
      } catch (err) {
        results.failed++;
        results.failures.push({ file: fileNames[i], error: String(err) });
      } finally {
        setBulkProgress((p) => p ? { processed: p.processed + 1, total: p.total } : null);
      }
    }

    setIsProcessingBulk(false);
    setBulkFilesCount(0);
    setBulkProgress(null);

    toast.success(`Bulk upload complete — ${results.ok} succeeded, ${results.failed} failed`);
    if (results.failed > 0) console.error('Bulk failures', results.failures);
  }

  async function handleFolderInput(fileList: FileList | null) {
    if (!fileList) return;
    const filesArr = Array.from(fileList).filter((f) => /\.(txt|md|json)$/i.test(f.name));
    if (filesArr.length === 0) { toast.error('No valid text files found in folder'); return; }
    if (filesArr.length > MAX_BULK_FILES) { toast.error(`Too many files. Max ${MAX_BULK_FILES}`); return; }

    const queue: Array<{ file: File; name: string; size: number; preview: string; selected: boolean }> = [];

    for (const f of filesArr) {
      try {
        const text = await f.text();
        const preview = text.slice(0, 200);
        queue.push({ file: f, name: f.name, size: f.size, preview, selected: true });
      } catch (err) {
        console.warn('Failed reading file for preview', f.name, err);
      }
    }

    setBulkQueue(queue);
    setBulkFilesCount(queue.length);
    setIsBulkPreviewOpen(true);
  }

  async function processBulkFilesFromFolder(files: File[]) {
    if (!user) { toast.error('Sign in to bulk upload'); return; }
    setIsProcessingBulk(true);
    setBulkProgress({ processed: 0, total: files.length });

    const results: { ok: number; failed: number; failures: any[] } = { ok: 0, failed: 0, failures: [] };

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        if (f.size > MAX_ATTACHMENT_SIZE) throw new Error('File too large');
        const text = await f.text();
        const title = f.name.replace(/\.[^.]+$/, '') || f.name;
        await submitPrompt(user.uid, user.email || '', user.displayName || undefined, title, `Imported from ${f.name}`, text, category, [], f);
        results.ok++;
      } catch (err) {
        results.failed++;
        results.failures.push({ file: f.name, error: String(err) });
      } finally {
        setBulkProgress((p) => p ? { processed: p.processed + 1, total: p.total } : null);
      }
    }

    setIsProcessingBulk(false);
    setBulkFilesCount(0);
    setBulkProgress(null);

    toast.success(`Bulk upload complete — ${results.ok} succeeded, ${results.failed} failed`);
    if (results.failed > 0) console.error('Bulk failures', results.failures);
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-background pt-32 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">Sign in with Google to submit a prompt to our community.</p>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Sign In</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-32 px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">Submit Your Prompt</h1>
            <p className="text-muted-foreground text-lg">
              Share your best AI prompts with the DUNAMIS community. Your submission will be reviewed before going live.
            </p>
          </motion.div>

          <Card className="bg-black/40 border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                New Prompt
              </CardTitle>
              <CardDescription>Fill in the details about your prompt below.</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <Label htmlFor="title" className="text-sm uppercase tracking-wide">
                    Prompt Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Marketing Copy Generator"
                    className="mt-2 bg-black/60 border-white/10"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-sm uppercase tracking-wide">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="What does this prompt do? Who would use it?"
                    className="mt-2 min-h-20 bg-black/60 border-white/10"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="category" className="text-sm uppercase tracking-wide">
                    Category
                  </Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 w-full bg-black/60 border border-white/10 rounded-md px-3 py-2 text-foreground"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="tags" className="text-sm uppercase tracking-wide">
                    Tags (comma-separated)
                  </Label>
                  <Input
                    id="tags"
                    placeholder="e.g., marketing, copywriting, sales"
                    className="mt-2 bg-black/60 border-white/10"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Optional but helps with discovery</p>
                </div>

                {/* Prompt Content */}
                <div>
                  <Label htmlFor="content" className="text-sm uppercase tracking-wide">
                    Prompt Content
                  </Label>
                  <Textarea
                    id="content"
                    placeholder="Paste your full prompt here..."
                    className="mt-2 min-h-40 bg-black/60 border-white/10 font-mono text-xs"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{content.length} characters</p>

                  {/* File upload for text prompts */}
                  <div className="mt-4">
                    <Label className="text-sm uppercase tracking-wide">Attach Text File (optional)</Label>
                    <input
                      type="file"
                      accept=".txt,.md,.json"
                      className="mt-2"
                      onChange={async (e) => {
                        const f = e.target.files?.[0] || null;
                        if (!f) return;
                        if (f.size > 1024 * 1024) { toast.error('Attachment must be <= 1MB'); return; }
                        setAttachmentFile(f);

                        // read text and auto-fill content
                        const text = await f.text();
                        setContent(text);
                        toast.success('File content loaded into prompt');
                      }}
                    />
                    {attachmentFile && (
                      <div className="text-xs text-muted-foreground mt-2">Attached: {attachmentFile.name} ({Math.round(attachmentFile.size/1024)} KB) <button className="ml-2 underline" onClick={() => setAttachmentFile(null)}>Remove</button></div>
                    )}
                  </div>

                  {userProfile?.accessTier === 'admin' ? (
                    /* Bulk upload: ZIP or folder */
                    <div className="mt-6 border-t border-white/6 pt-4">
                      <Label className="text-sm uppercase tracking-wide">Bulk Upload (admin only)</Label>
                      <p className="text-xs text-muted-foreground mt-1">Upload a ZIP of text files or select a folder (Chrome/Edge). Each file must be a .txt/.md/.json and ≤1MB. Max {MAX_BULK_FILES} files per upload.</p>

                      <div className="mt-3 flex gap-4 items-center">
                        <div>
                          {/* Hidden inputs: single visible chooser below triggers these */}
                          <input ref={zipInputRef} id="zipInput" type="file" accept=".zip" className="hidden" onChange={(e) => handleZipInput(e.target.files?.[0] || null)} />
                          <label htmlFor="zipInput" className="inline-flex items-center px-4 py-2 rounded-md bg-white/6 border border-white/10 cursor-pointer">Choose ZIP file</label>

                          <input ref={folderInputRef} id="folderInput" type="file" className="hidden" {...({ webkitdirectory: true, directory: true, mozdirectory: true } as any)} onChange={(e) => handleFolderInput((e.target as HTMLInputElement).files)} />
                          <button type="button" className="ml-4 text-xs text-muted-foreground underline" onClick={() => folderInputRef.current?.click()}>Select folder (Chrome/Edge)</button>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {isProcessingBulk ? (
                            <div>Processing {bulkProgress?.processed}/{bulkProgress?.total}</div>
                          ) : (
                            <div>{bulkFilesCount} files queued</div>
                          )}
                        </div>
                      </div>

                      {/* Bulk preview dialog */}
                      <Dialog open={isBulkPreviewOpen} onOpenChange={setIsBulkPreviewOpen}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Bulk Upload Preview</DialogTitle>
                            <DialogDescription>Review files before submitting. Uncheck any files you do not want to submit.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {bulkQueue.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-2 rounded bg-black/20">
                                <div className="flex-shrink-0">
                                  <Checkbox checked={item.selected} onChange={(e) => {
                                    const q = [...bulkQueue];
                                    q[idx] = { ...q[idx], selected: (e.target as HTMLInputElement).checked };
                                    setBulkQueue(q);
                                  }} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-xs text-muted-foreground">{Math.round(item.size/1024)} KB</div>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 max-h-20 overflow-hidden whitespace-pre-wrap">{item.preview}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <DialogFooter>
                            <div className="flex gap-2 justify-end w-full">
                              <Button variant="outline" onClick={() => setIsBulkPreviewOpen(false)}>Cancel</Button>
                              <Button onClick={async () => {
                                if (userProfile?.accessTier !== 'admin') { toast.error('Bulk upload is admin-only'); return; }

                                // start bulk upload for selected
                                const selected = bulkQueue.filter((b) => b.selected).map((b) => b.file);
                                if (selected.length === 0) { toast.error('No files selected'); return; }
                                setIsProcessingBulk(true);
                                setBulkProgress({ processed: 0, total: selected.length });
                                try {
                                  // delegate to helper
                                  const result = await import('@/lib/bulk-upload').then((m) => m.processBulkFilesFromFolder(selected, user, category));
                                  toast.success(`Bulk upload complete — ${result.ok} succeeded, ${result.failed} failed`);
                                  if (result.failed > 0) console.error('Bulk failures', result.failures);
                                  setIsBulkPreviewOpen(false);
                                } catch (err) {
                                  console.error('Bulk upload error', err);
                                  toast.error('Bulk upload failed');
                                } finally {
                                  setIsProcessingBulk(false);
                                  setBulkFilesCount(0);
                                  setBulkQueue([]);
                                  setBulkProgress(null);
                                }
                              }} className="bg-primary text-primary-foreground">Start Upload</Button>
                            </div>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : (
                    <div className="mt-6 border-t border-white/6 pt-4">
                      <p className="text-sm text-muted-foreground">Bulk upload is restricted to administrators. If you'd like to contribute prompts, please use the form above; submissions will be reviewed by our moderation team.</p>
                    </div>
                  )}
                </div>

                {/* Info Alert */}
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your prompt will be reviewed by our moderation team. We'll notify you once it's approved!
                  </AlertDescription>
                </Alert>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-base"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border border-current border-t-transparent mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Prompt
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
