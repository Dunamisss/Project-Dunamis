import React from "react";

export default function Profile() {
  return null;
}
  },
  {
    id: "comm-2",
    title: "Python Code Optimizer",
    category: "Development",
    description: "Refactors Python code for better performance and readability. Submitted by @dev_master.",
    content: "Act as a senior Python developer. Analyze the following code...",
    previewContent: "Act as a senior Python developer. Analyze the following code...",
    tags: ["community", "coding"],
    isSecured: false,
    isLocked: false,
    accessLevel: "member",
    rating: 4.5,
    usageCount: 128,
    knowledgeAssets: []
  },
   {
    id: "comm-3",
    title: "LinkedIn Post Viral Hook",
    category: "Marketing",
    description: "Writes engaging LinkedIn hooks based on viral trends. Submitted by @growth_guru.",
    content: "Write 5 viral hooks for a LinkedIn post about...",
    previewContent: "Write 5 viral hooks for a LinkedIn post about...",
    tags: ["community", "marketing"],
    isSecured: false,
    isLocked: false,
    accessLevel: "member",
    rating: 4.2,
    usageCount: 315,
    knowledgeAssets: []
  }
];

// Mock Leaderboard Data
const TOP_CONTRIBUTORS = [
  { rank: 1, name: "@neon_dreamer", points: 1250, prompts: 15, badge: "Grandmaster" },
  { rank: 2, name: "@dev_master", points: 980, prompts: 8, badge: "Expert" },
  { rank: 3, name: "@growth_guru", points: 750, prompts: 12, badge: "Contributor" },
  { rank: 4, name: "@prompt_wizard", points: 620, prompts: 5, badge: "Contributor" },
  { rank: 5, name: "@ai_artist", points: 540, prompts: 7, badge: "Contributor" },
];

const TOP_RATED_PROMPTS = [
  { rank: 1, title: "Cyberpunk City Generator", author: "@neon_dreamer", rating: 4.9, usage: 420 },
  { rank: 2, title: "Full Stack React Architect", author: "@dev_master", rating: 4.8, usage: 350 },
  { rank: 3, title: "Midjourney Photorealism V6", author: "@ai_artist", rating: 4.7, usage: 290 },
];

export default function Profile() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [savedPromptIds, setSavedPromptIds] = useState<string[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [communityPrompts, setCommunityPrompts] = useState<Prompt[]>(INITIAL_COMMUNITY_PROMPTS);
  
  // New Request Form State
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({ title: "", description: "" });

  // Submission form moved to standalone page (/submit-prompt). Use the link below to open the full submission form.

  // Edit profile state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [displayNameEdit, setDisplayNameEdit] = useState<string>(user?.displayName || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL || null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
      toast.error("Access Denied", { description: "Please sign in to view your profile." });
    }
  }, [user, isLoading, setLocation]);

  // Keep edit defaults in sync with the current user
  useEffect(() => {
    setDisplayNameEdit(user?.displayName || "");
    setAvatarPreview(user?.photoURL || null);
  }, [user]);

  // Load Data from LocalStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("dunamis_saved_prompts") || "[]");
    const savedRequests = JSON.parse(localStorage.getItem("dunamis_requests") || "[]");
    const localCommunity = JSON.parse(localStorage.getItem("dunamis_community_prompts") || "[]");
    
    setSavedPromptIds(saved);
    
    if (localCommunity.length > 0) {
      setCommunityPrompts([...localCommunity, ...INITIAL_COMMUNITY_PROMPTS]);
    }

    if (savedRequests.length === 0) {
      // Add dummy data for demonstration if empty
      const demoRequests: Request[] = [
        { id: "1", title: "SEO Blog Post Generator", status: "completed", date: "2024-03-15", notes: "Delivered via email." },
        { id: "2", title: "Midjourney V6 Photorealism", status: "in-progress", date: "2024-03-20", notes: "Refining style parameters." }
      ];
      setRequests(demoRequests);
      localStorage.setItem("dunamis_requests", JSON.stringify(demoRequests));
    } else {
      setRequests(savedRequests);
    }
  }, []);

  // Filter Saved Prompts
  const savedPrompts = allPrompts.filter(p => savedPromptIds.includes(p.id));
  
  // Check Admin Status
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  const handleCreateRequest = () => {
    if (!newRequest.title || !newRequest.description) return;

    const req: Request = {
      id: nanoid(),
      title: newRequest.title,
      status: "pending",
      date: new Date().toISOString().split('T')[0],
      notes: "Waiting for review."
    };

    const updatedRequests = [req, ...requests];
    setRequests(updatedRequests);
    localStorage.setItem("dunamis_requests", JSON.stringify(updatedRequests));
    
    setNewRequest({ title: "", description: "" });
    setIsRequestOpen(false);
    toast.success("Request Submitted", { description: "We will review your request shortly." });
  };

  // Submissions are now handled on the dedicated Submit Prompt page. The Profile no longer contains an inline submission form.


  if (!user) return null;

  // helper to resize and crop an image file to a square webp blob
  async function resizeImage(file: File, size = 256): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Blob generation failed')); return; }
          resolve(blob);
        }, 'image/webp', 0.8);
        URL.revokeObjectURL(url);
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-12 min-h-screen">
        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12"
        >
          <div>
            {/* Use the shared Avatar component for consistent, cropped circular avatars */}
            <Avatar className="h-24 w-24">
              {user.photoURL ? (
                <AvatarImage src={user.photoURL} alt="Profile" />
              ) : (
                <AvatarFallback>
                  <User className="h-10 w-10 text-primary" />
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <div className="flex-grow">
            <h1 className="font-display text-4xl font-bold text-foreground">{user.displayName || "Member"}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              {user.email} 
              <Badge variant="outline" className="ml-2 border-primary/30 text-primary bg-primary/5">Premium Member</Badge>
              {isAdmin && <Badge variant="default" className="bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30">Admin</Badge>}
            </p>
          </div>
          <div className="flex gap-3">
             <Button onClick={() => setIsRequestOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
               <Plus className="mr-2 h-4 w-4" /> New Request
             </Button>

             <Dialog open={isEditOpen} onOpenChange={(open) => setIsEditOpen(open)}>
               <DialogTrigger asChild>
                 <Button variant="outline" className="border-white/10 hover:border-primary/30">
                   <User className="mr-2 h-4 w-4" /> Edit Profile
                 </Button>
               </DialogTrigger>
               <DialogContent>
                 <DialogHeader>
                   <DialogTitle>Edit Profile</DialogTitle>
                   <DialogDescription>Update your display name and avatar</DialogDescription>
                 </DialogHeader>
                 <div className="space-y-4 pb-4">
                   <div>
                     <Label className="text-sm uppercase tracking-wide">Display Name</Label>
                     <Input value={displayNameEdit} onChange={(e) => setDisplayNameEdit(e.target.value)} className="mt-2 bg-black/60 border-white/10" />
                   </div>

                   <div>
                     <Label className="text-sm uppercase tracking-wide">Avatar</Label>
                     <div className="mt-2 flex items-center gap-3">
                       <div className="h-16 w-16 rounded-full overflow-hidden bg-black/20">
                         {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" /> : <User className="h-6 w-6 text-primary m-4" />}
                       </div>
                       <div>
                         <input
                           id="avatar-upload"
                           type="file"
                           accept="image/*"
                           onChange={async (e) => {
                             const f = e.target.files?.[0] || null;
                             if (!f) return;
                             if (f.size > 2 * 1024 * 1024) { toast.error("Avatar must be <= 2MB"); return; }
                             setAvatarFile(f);
                             const url = URL.createObjectURL(f);
                             setAvatarPreview(url);
                           }}
                         />
                         <p className="text-xs text-muted-foreground mt-1">Max 2MB. Will be cropped to a circle.</p>
                       </div>
                     </div>
                   </div>

                   <div className="flex gap-2 justify-end">
                     <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                     <Button onClick={async () => {
                       // Save handler
                       if (!user) return;
                       try {
                         setIsSavingProfile(true);
                         let photoURL: string | undefined = undefined;

                         // If avatar selected, resize and upload as webp
                         if (avatarFile) {
                           const blob = await (await resizeImage(avatarFile, 256)).arrayBuffer();
                           const u8 = new Uint8Array(blob);
                           const storageReference = storageRef(storage, `avatars/${user.uid}/avatar.webp`);
                           const uploadTask = uploadBytesResumable(storageReference, u8, { contentType: 'image/webp' });
                           uploadTask.on('state_changed', (snapshot) => {
                             const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                             setUploadProgress(pct);
                           });
                           await uploadTask;
                           photoURL = await getDownloadURL(storageReference);
                         }

                         // Update auth profile
                         await updateProfile(user, {
                           displayName: displayNameEdit || undefined,
                           ...(photoURL ? { photoURL } : {}),
                         });

                         // Update Firestore user doc
                         await updateDoc(doc(db, 'users', user.uid), {
                           displayName: displayNameEdit || null,
                           ...(photoURL ? { photoURL } : {}),
                         });

                         toast.success('Profile updated');
                         setIsEditOpen(false);
                       } catch (err) {
                         console.error('Error saving profile:', err);
                         toast.error('Failed to update profile');
                       } finally {
                         setIsSavingProfile(false);
                         setUploadProgress(null);
                       }
                     }} className="bg-primary text-primary-foreground">{isSavingProfile ? 'Saving...' : 'Save'}</Button>
                   </div>
                 </div>
               </DialogContent>
             </Dialog>

          </div>
        </motion.div>

        {/* Admin Section (Only for Admins) */}
        {isAdmin && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-8"
          >
            <Card className="bg-red-950/10 border-red-500/20 overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
               <CardHeader className="flex flex-row items-center justify-between pb-2">
                 <div className="space-y-1">
                   <CardTitle className="text-red-400 flex items-center gap-2">
                     <Shield className="h-5 w-5" /> Administration
                   </CardTitle>
                   <CardDescription>Manage prompts, review submissions, and moderate content.</CardDescription>
                 </div>
                 <Button variant="outline" className="border-red-500/20 hover:bg-red-500/10 hover:text-red-400" asChild>
                   <Link href="/dashboard">Access Dashboard</Link>
                 </Button>
               </CardHeader>
            </Card>
          </motion.div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="saved" className="w-full">
          <TabsList className="grid w-full md:w-[800px] grid-cols-4 bg-black/20 mb-8">
            <TabsTrigger value="saved" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Bookmark className="mr-2 h-4 w-4" /> Saved Prompts
            </TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Users className="mr-2 h-4 w-4" /> Community
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Trophy className="mr-2 h-4 w-4" /> Leaderboard
            </TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <FileText className="mr-2 h-4 w-4" /> Custom Requests
            </TabsTrigger>
          </TabsList>

          {/* Saved Prompts Tab */}
          <TabsContent value="saved" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-display font-bold">Your Collection</h2>
              <span className="text-sm text-muted-foreground">{savedPrompts.length} items</span>
            </div>
            
            {savedPrompts.length === 0 ? (
              <Card className="bg-card/30 border-dashed border-white/10 py-12">
                <div className="flex flex-col items-center text-center">
                  <Bookmark className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">No saved prompts yet</h3>
                  <p className="text-muted-foreground max-w-sm mt-2">
                    Browse the library and click the bookmark icon to save your favorite prompts here.
                  </p>
                  <Button variant="link" className="mt-4 text-primary" onClick={() => setLocation("/")}>
                    Browse Library
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedPrompts.map(prompt => (
                  <PromptCard key={prompt.id} prompt={prompt} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Community/Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-display font-bold">Community Feed</h2>
                <p className="text-sm text-muted-foreground">Prompts submitted by other members</p>
              </div>
              <Badge variant="secondary" className="bg-white/5">{communityPrompts.length} Items</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communityPrompts.map(prompt => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
            
            <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-lg text-center flex flex-col items-center">
              <Sparkles className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-lg font-medium text-primary mb-2">Want to contribute?</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Share your best prompts with the community. Earn badges and reputation for high-quality submissions.
              </p>
              <Button 
                variant="outline" 
                className="border-primary/30 hover:bg-primary/10 text-primary" 
                asChild
              >
                <Link href="/submit-prompt">Submit a Prompt</Link>
              </Button>
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild className="gap-2 border-primary/20 hover:bg-primary/10">
                <Link href="/community-guide">
                  <Info className="h-4 w-4" /> How to earn points
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Contributors Card */}
              <Card className="bg-card/30 border-white/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" /> Top Contributors
                  </CardTitle>
                  <CardDescription>Members with the highest reputation points.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {TOP_CONTRIBUTORS.map((user) => (
                      <div key={user.rank} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            user.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                            user.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                            user.rank === 3 ? 'bg-amber-600/20 text-amber-600' :
                            'bg-primary/10 text-primary'
                          }`}>
                            {user.rank}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.prompts} prompts shared</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{user.points} pts</p>
                          <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-muted-foreground">
                            {user.badge}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Rated Prompts Card */}
              <Card className="bg-card/30 border-white/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-400" /> Trending Prompts
                  </CardTitle>
                  <CardDescription>Most popular prompts this week.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {TOP_RATED_PROMPTS.map((prompt) => (
                      <div key={prompt.rank} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                            #{prompt.rank}
                          </div>
                          <div>
                            <p className="font-medium text-foreground line-clamp-1">{prompt.title}</p>
                            <p className="text-xs text-muted-foreground">by {prompt.author}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                            <Star className="h-3 w-3 fill-current" /> {prompt.rating}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{prompt.usage} uses</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Custom Requests Tab */}
          <TabsContent value="requests">
            <Card className="bg-card/30 border-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Request History</CardTitle>
                <CardDescription>
                  Track the status of your tailored prompt requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requests.map((req) => (
                    <div key={req.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-start gap-4 mb-4 md:mb-0">
                        <div className={`p-2 rounded-full mt-1 ${
                          req.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                          req.status === 'in-progress' ? 'bg-blue-500/10 text-blue-400' :
                          req.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                          'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {req.status === 'completed' ? <Star className="h-4 w-4" /> :
                           req.status === 'in-progress' ? <Clock className="h-4 w-4" /> :
                           req.status === 'rejected' ? <Clock className="h-4 w-4" /> : // icon fallback
                           <Clock className="h-4 w-4" />
                          }
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{req.title}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                            <span>Requested on {req.date}</span>
                            {req.notes && <span>• {req.notes}</span>}
                          </p>
                        </div>
                      </div>
                      
                      <Badge variant="outline" className={`capitalize ${
                        req.status === 'completed' ? 'border-green-500/30 text-green-400' :
                        req.status === 'in-progress' ? 'border-blue-500/30 text-blue-400' :
                        req.status === 'rejected' ? 'border-red-500/30 text-red-400' :
                        'border-yellow-500/30 text-yellow-400'
                      }`}>
                        {req.status.replace("-", " ")}
                      </Badge>
                    </div>
                  ))}
                  
                  {requests.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No requests found. Start a new request to get a tailored prompt.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Request Modal */}
        <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
          <DialogContent className="sm:max-w-[500px] bg-card border-white/10">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-primary">Request Custom Prompt</DialogTitle>
              <DialogDescription>
                Describe what you need. Small donations help us prioritize your request!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="req-title">Title / Topic</Label>
                <Input 
                  id="req-title" 
                  placeholder="e.g., SEO Article Writer for Tech Blog" 
                  className="bg-black/20 border-white/10"
                  value={newRequest.title}
                  onChange={(e) => setNewRequest({...newRequest, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-desc">Detailed Requirements</Label>
                <Textarea 
                  id="req-desc" 
                  placeholder="Explain the specific goal, tone, and format you need..." 
                  className="bg-black/20 border-white/10 min-h-[100px]"
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                />
              </div>
              
              <div className="bg-primary/5 border border-primary/20 rounded-md p-4 flex items-start gap-3">
                <Coffee className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-400 mb-1">Support the Creator</p>
                  <p className="text-muted-foreground">
                    Donations are optional but greatly appreciated for complex requests.
                    <a href="https://buymeacoffee.com/dunamis" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                      Buy me a coffee
                    </a>
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateRequest} disabled={!newRequest.title || !newRequest.description}>
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


      </div>
    </Layout>
  );
}
