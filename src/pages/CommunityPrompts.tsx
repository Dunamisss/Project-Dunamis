import React from "react";

// Community prompts removed — this app is now a single homepage with the chatbot.
export default function CommunityPrompts() {
  return null;
}

    setFilteredPrompts(filtered);
  }, [searchTerm, selectedCategory, loadedPrompts]);

  const handleCopyPrompt = (prompt: any) => {
    if (prompt?.isLocked) {
      toast.error("This prompt is locked and cannot be copied");
      return;
    }
    if (prompt?.isSecured && !user) {
      toast.error("Sign in to copy this secured prompt");
      return;
    }
    const contentToCopy = prompt?.content;
    if (!contentToCopy) {
      toast.error("No content to copy");
      return;
    }
    navigator.clipboard.writeText(contentToCopy);
    toast.success("Prompt copied to clipboard!");
  };

  const handleExportPrompt = (prompt: any) => {
    if (prompt?.isLocked) {
      toast.error("This prompt is locked and cannot be exported");
      return;
    }
    if (prompt?.isSecured && !user) {
      toast.error("Sign in to export this secured prompt");
      return;
    }
    const contentToExport = prompt?.content;
    if (!contentToExport) {
      toast.error("No content to export");
      return;
    }
    const element = document.createElement("a");
    const file = new Blob([contentToExport], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${prompt?.title || "prompt"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
    toast.success("Prompt exported!");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-32 px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">
              Community Prompts
            </h1>
            <p className="text-muted-foreground text-lg">
              Discover {loadedPrompts.length} amazing prompts shared by our community members.
            </p>
          </motion.div>

          {/* Search & Filter */}
          <div className="space-y-4 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                className="pl-10 bg-black/60 border-white/10 h-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className={
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "border-white/10 hover:border-primary/30"
                  }
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-black/40 border-white/10 p-4 rounded-md">
                  <div className="mb-3">
                    <Skeleton className="h-6 w-3/4" />
                  </div>
                  <div className="mb-4">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <Card className="bg-black/40 border-red-600/20">
              <CardContent className="pt-6 text-center">
                <p className="text-red-400 mb-4">Error: {error}</p>
                <div className="flex justify-center gap-2">
                  <Button onClick={() => loadPrompts(false)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Retry
                  </Button>
                  <Button onClick={() => setError(null)} variant="outline">Dismiss</Button>
                </div>
              </CardContent>
            </Card>
          ) : filteredPrompts.length === 0 ? (
            <Card className="bg-black/40 border-white/10">
              <CardContent className="pt-12 text-center">
                <p className="text-muted-foreground mb-4">No prompts found.</p>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Be the first to submit!
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrompts.map((prompt, idx) => (
                <motion.div
                  key={prompt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Dialog open={isDialogOpen && selectedPrompt?.id === prompt.id} onOpenChange={(open) => {
                    if (open) {
                      setSelectedPrompt(prompt);
                    }
                    setIsDialogOpen(open);
                  }}>
                    <DialogTrigger asChild>
                      <Card className={cn(
                        "bg-black/40 border-white/10 hover:border-primary/30 transition-all cursor-pointer h-full flex flex-col",
                        (prompt.isLocked || prompt.isSecured) && "border-yellow-500/30 hover:border-yellow-500/50"
                      )}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg line-clamp-2 flex-1">
                              {prompt.title}
                            </CardTitle>
                            {(prompt.isLocked || prompt.isSecured) && (
                              <Lock className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="secondary" className="bg-white/5 text-xs">
                              {prompt.category}
                            </Badge>
                            {(prompt.isLocked || prompt.isSecured) && (
                              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
                                Premium
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-between">
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                            {prompt.description}
                          </p>

                          {prompt.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap mb-4">
                              {prompt.tags.slice(0, 3).map((tag: string) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs border-white/10"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                              {prompt.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{prompt.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          <div className="border-t border-white/10 pt-3">
                            <p className="text-xs text-muted-foreground">
                              By <span className="text-primary font-medium">{prompt.displayName}</span>
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              {new Date(prompt.approvedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </DialogTrigger>

                    {/* Prompt Detail Dialog */}
                    <DialogContent className="sm:max-w-[700px] bg-card border-white/10 max-h-[85vh] flex flex-col p-0 gap-0">
                      <div className="p-6 pb-2">
                        <DialogHeader>
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-white/5">
                                {prompt.category}
                              </Badge>
                              {prompt.isLocked && (
                                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 gap-1">
                                  <Lock className="h-3 w-3" /> Premium
                                </Badge>
                              )}
                            </div>
                          </div>
                          <DialogTitle className="font-display text-2xl text-primary">
                            {prompt.title}
                          </DialogTitle>
                          <DialogDescription>
                            {prompt.description}
                          </DialogDescription>
                        </DialogHeader>
                      </div>

                      { prompt.isLocked ? (
                        <div className="flex-grow px-6 py-8 flex items-center justify-center">
                          <div className="text-center">
                            <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">Prompt Locked</h3>
                            <p className="text-muted-foreground mb-4 max-w-xs">
                              This prompt has been locked by an admin and is not available for viewing.
                            </p>
                            {!user && (
                              <p className="text-sm text-muted-foreground">
                                Sign in to verify your access level.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (prompt.isSecured && !user) ? (
                        <div className="flex-grow px-6 py-8 flex items-center justify-center">
                          <div className="text-center">
                            <Lock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">Premium Content</h3>
                            <p className="text-muted-foreground mb-4 max-w-xs">
                              This is a secured prompt. Sign in to access it.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Submit great prompts and get featured to unlock premium content.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-grow overflow-y-auto">
                          <ScrollArea className="h-full">
                            <div className="p-6">
                              <div className="rounded-md border border-white/10 bg-black/20 p-4 font-mono text-sm text-foreground whitespace-pre-wrap break-words">
                                {prompt.content}
                              </div>

                              {prompt.attachmentUrl && (
                                <div className="mt-3">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Attachment</p>
                                  <a href={prompt.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary underline text-sm">Download {prompt.attachmentName || 'file'}</a>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {!prompt.isLocked && (
                        <div className="p-6 pt-4 border-t border-white/5 bg-black/20 flex gap-2">
                          <Button onClick={() => handleCopyPrompt(prompt)} className="flex-1 gap-2">
                            <Copy className="h-4 w-4" /> Copy Prompt
                          </Button>
                          <Button onClick={() => handleExportPrompt(prompt)} variant="outline" className="flex-1 gap-2 border-white/10 hover:border-primary/30">
                            <Download className="h-4 w-4" /> Export TXT
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </motion.div>
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => loadPrompts(true)}
                  disabled={isLoadingMore}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border border-current border-t-transparent" />
                      Loading...
                    </div>
                  ) : (
                    "Load More Prompts"
                  )}
                </Button>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
