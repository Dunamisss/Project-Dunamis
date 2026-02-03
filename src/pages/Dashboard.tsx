import React from "react";

export default function Dashboard() {
  return null;
}
      previewContent: submission.description, // Simple preview
      tags: submission.tags || ["community"],
      isSecured: false,
      isLocked: false,
      accessLevel: "member",
      rating: 5.0, // Start with high rating to encourage
      usageCount: 0,
      knowledgeAssets: []
    };

    // 2. Add to Community Prompts (LocalStorage for Profile.tsx)
    const existingCommunity = JSON.parse(localStorage.getItem("dunamis_community_prompts") || "[]");
    const updatedCommunity = [newPrompt, ...existingCommunity];
    localStorage.setItem("dunamis_community_prompts", JSON.stringify(updatedCommunity));

    // 3. Remove from Pending (LocalStorage)
    const updatedSubmissions = userSubmissions.filter(s => s.id !== submission.id);
    setUserSubmissions(updatedSubmissions);
    localStorage.setItem("dunamis_submissions", JSON.stringify(updatedSubmissions));

    // 4. Update local state (Optional, if we want admins to see it in "Library" too, but usually separated)
    // setPrompts([newPrompt, ...prompts]); 

    setReviewSubmission(null);
    toast.success("Prompt Approved & Published", { description: "It is now visible in the Community Feed." });
  };

  const handleReject = (id: string) => {
    const updated = userSubmissions.filter(s => s.id !== id);
    setUserSubmissions(updated);
    localStorage.setItem("dunamis_submissions", JSON.stringify(updated));
    setReviewSubmission(null);
    toast.error("Submission rejected");
  };

  return (
    <Layout>
      <AdminGuard>
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-primary">Prompt Dashboard</h1>
              <p className="text-muted-foreground">Manage your library and review submissions.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Import .txt
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".txt" multiple onChange={handleFileUpload} />
              <Button variant="secondary" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export JSON
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatsCard title="Total Prompts" value={totalPrompts} icon={<FileText className="h-4 w-4 text-primary" />} />
            <StatsCard title="Secured" value={securedPrompts} icon={<Lock className="h-4 w-4 text-green-400" />} />
            <StatsCard title="Pending Review" value={pendingCount} icon={<LayoutDashboard className="h-4 w-4 text-orange-400" />} />
            <StatsCard title="Total Views" value={totalUsage.toLocaleString()} icon={<Unlock className="h-4 w-4 text-blue-400" />} />
          </div>

          <Tabs defaultValue="library" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-8 bg-black/20">
              <TabsTrigger value="library">Library</TabsTrigger>
              <TabsTrigger value="community">Community Stats</TabsTrigger>
              <TabsTrigger value="moderation" className="relative">
                Moderation Queue
                {pendingCount > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library">
              <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Library</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search prompts..." 
                        className="pl-8 bg-background/50 border-white/10" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPrompts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No prompts found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPrompts.map((prompt) => (
                          <TableRow key={prompt.id} className="border-white/5 hover:bg-white/5">
                            <TableCell className="font-medium">
                              <div>{prompt.title}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">{prompt.description}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-white/5 hover:bg-white/10">{prompt.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {prompt.isLocked && (
                                  <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/5 gap-1">
                                    <Lock className="h-3 w-3" /> Locked
                                  </Badge>
                                )}
                                {prompt.isSecured && !prompt.isLocked && (
                                  <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/5 gap-1">
                                    <Lock className="h-3 w-3" /> Secured
                                  </Badge>
                                )}
                                {!prompt.isSecured && !prompt.isLocked && (
                                  <Badge variant="outline" className="border-white/10 text-muted-foreground gap-1">
                                    <Unlock className="h-3 w-3" /> Public
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{prompt.usageCount}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-card border-white/10">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => setIsEditing(prompt)}>
                                    <Edit3 className="mr-2 h-4 w-4" /> Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleSecure(prompt.id)}>
                                    {prompt.isSecured ? "Make Public" : "Make Secured"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleLock(prompt.id)}>
                                    {prompt.isLocked ? (
                                      <>
                                        <Unlock className="mr-2 h-4 w-4" /> Unlock Prompt
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="mr-2 h-4 w-4" /> Lock Prompt
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/10" />
                                  <DropdownMenuItem onClick={() => handleDelete(prompt.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="community">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Contributors Card */}
                <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-400" /> Top Contributors
                    </CardTitle>
                    <CardDescription>Highest ranking members by activity.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/5 hover:bg-white/5">
                          <TableHead>Rank</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Prompts</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {TOP_CONTRIBUTORS.map((contributor, index) => (
                          <TableRow key={contributor.id} className="border-white/5 hover:bg-white/5">
                            <TableCell className="font-medium text-muted-foreground">#{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary">
                                  {contributor.name[1].toUpperCase()}
                                </div>
                                {contributor.name}
                              </div>
                            </TableCell>
                            <TableCell>{contributor.prompts}</TableCell>
                            <TableCell>{contributor.points}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={
                                contributor.status === "Active" 
                                  ? "border-green-500/30 text-green-400" 
                                  : "border-yellow-500/30 text-yellow-400"
                              }>
                                {contributor.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Trending Content Card */}
                <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-400" /> Trending Content
                    </CardTitle>
                    <CardDescription>Most viewed prompts this week.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/5 hover:bg-white/5">
                          <TableHead>Prompt</TableHead>
                          <TableHead>Views</TableHead>
                          <TableHead>Saves</TableHead>
                          <TableHead className="text-right">Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {TRENDING_PROMPTS.map((prompt) => (
                          <TableRow key={prompt.id} className="border-white/5 hover:bg-white/5">
                            <TableCell>
                              <div className="font-medium line-clamp-1">{prompt.title}</div>
                              <div className="text-xs text-muted-foreground">{prompt.author}</div>
                            </TableCell>
                            <TableCell>{prompt.views}</TableCell>
                            <TableCell>{prompt.saves}</TableCell>
                            <TableCell className="text-right text-yellow-400 font-bold">{prompt.rating}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="moderation">
              <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Pending Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableHead>Title</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Content Preview</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userSubmissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No pending submissions.
                          </TableCell>
                        </TableRow>
                      ) : (
                        userSubmissions.map((sub) => (
                          <TableRow key={sub.id} className="border-white/5 hover:bg-white/5">
                            <TableCell className="font-medium">
                              <div>{sub.title}</div>
                              <div className="text-xs text-muted-foreground">{sub.category}</div>
                            </TableCell>
                            <TableCell>{sub.author}</TableCell>
                            <TableCell>
                              <div className="max-w-[300px] truncate text-xs font-mono text-muted-foreground bg-black/20 p-1 rounded">
                                {sub.content || sub.prompt}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" onClick={() => setReviewSubmission(sub)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-400/10" onClick={() => handleApprove(sub)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => handleReject(sub.id)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog open={!!isEditing} onOpenChange={(open) => !open && setIsEditing(null)}>
            <DialogContent className="sm:max-w-[600px] bg-card border-white/10">
              <DialogHeader>
                <DialogTitle>Edit Prompt</DialogTitle>
              </DialogHeader>
              {isEditing && (
                <form onSubmit={handleSaveEdit} className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" value={isEditing.title} onChange={(e) => setIsEditing({...isEditing, title: e.target.value})} className="bg-black/20" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="desc">Description</Label>
                    <Textarea id="desc" value={isEditing.description} onChange={(e) => setIsEditing({...isEditing, description: e.target.value})} className="bg-black/20 resize-none h-20" />
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* Submission Review Dialog */}
          <Dialog open={!!reviewSubmission} onOpenChange={(open) => !open && setReviewSubmission(null)}>
            <DialogContent className="sm:max-w-[600px] bg-card border-white/10 max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Review Submission</DialogTitle>
                <DialogDescription>
                  Review the details before approving or rejecting.
                </DialogDescription>
              </DialogHeader>
              {reviewSubmission && (
                <>
                  <ScrollArea className="flex-grow py-4 pr-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Title</Label>
                          <p className="font-medium">{reviewSubmission.title}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Category</Label>
                          <Badge variant="secondary" className="mt-1">{reviewSubmission.category}</Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Author</Label>
                        <p className="font-medium">{reviewSubmission.author}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <p className="text-sm text-muted-foreground bg-white/5 p-2 rounded-md mt-1">{reviewSubmission.description}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Prompt Content</Label>
                        <div className="text-sm font-mono bg-black/30 p-3 rounded-md mt-1 whitespace-pre-wrap">
                          {reviewSubmission.content || reviewSubmission.prompt}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                  <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setReviewSubmission(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => handleReject(reviewSubmission.id)}>Reject</Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(reviewSubmission)}>Approve & Publish</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </AdminGuard>
    </Layout>
  );
}

function StatsCard({ title, value, icon }: { title: string, value: number | string, icon: any }) {
  return (
    <Card className="bg-card/50 border-white/5">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-full">{icon}</div>
      </CardContent>
    </Card>
  );
}
