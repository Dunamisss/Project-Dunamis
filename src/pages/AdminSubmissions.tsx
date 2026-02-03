import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Lock, Unlock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import AdminGuard from "@/components/AdminGuard";
import Layout from "@/components/Layout";
import {
  getPendingSubmissions,
  approveSubmission,
  rejectSubmission,
  togglePromptLock,
  getApprovedPrompts,
} from "@/lib/firestore-access";

export default function AdminSubmissions() {
  const [pending, setPending] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [brokenPrompts, setBrokenPrompts] = useState<any[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const data = await getPendingSubmissions();
      setPending(data);
    } catch (error) {
      console.error("Error loading submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  };

  // Scan approved prompts and detect broken/partial prompts
  const scanApprovedPrompts = async () => {
    setIsScanning(true);
    setBrokenPrompts([]);

    try {
      let all: any[] = [];
      let last: any = null;
      let keepGoing = true;

      while (keepGoing) {
        const res = await getApprovedPrompts(50, last);
        all = all.concat(res.prompts);
        last = res.lastDoc;
        keepGoing = res.hasMore;
      }

      // heuristics for broken prompts
      const broken = all.filter((p) => {
        const content = p.content || "";
        const len = content.trim().length;
        const endsWithEllipsis = content.trim().endsWith("...");
        const hasEllipsis = content.includes("...");
        return (!content || len < 50 || endsWithEllipsis || hasEllipsis);
      });

      setBrokenPrompts(broken);
      toast.success(`Scan complete — ${broken.length} suspicious prompts found`);
    } catch (error) {
      console.error("Error scanning approved prompts:", error);
      toast.error("Failed to scan approved prompts");
    } finally {
      setIsScanning(false);
    }
  };

  // Reject a single broken prompt
  const rejectBrokenPrompt = async (id: string) => {
    setIsCleaning(true);
    try {
      await rejectSubmission(id, "Auto-clean: broken/partial prompt");
      setBrokenPrompts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Prompt removed");
    } catch (error) {
      console.error("Error rejecting prompt:", error);
      toast.error("Failed to remove prompt");
    } finally {
      setIsCleaning(false);
    }
  };

  // Reject all broken prompts
  const rejectAllBroken = async () => {
    if (brokenPrompts.length === 0) return;
    if (!confirm(`Reject all ${brokenPrompts.length} broken prompts? This cannot be undone.`)) return;

    setIsCleaning(true);
    try {
      for (const p of brokenPrompts) {
        await rejectSubmission(p.id, "Auto-clean: broken/partial prompt");
      }
      setBrokenPrompts([]);
      toast.success("All broken prompts rejected");
    } catch (error) {
      console.error("Error rejecting prompts:", error);
      toast.error("Failed to reject all prompts");
    } finally {
      setIsCleaning(false);
    }
  };

  // Export a report of the findings as a markdown file for admin records
  const exportReport = () => {
    if (brokenPrompts.length === 0) {
      toast("No broken prompts to export");
      return;
    }
    const lines = ["# Broken Prompts Report", `Date: ${new Date().toISOString()}`, "", "| ID | Title | Content length | Preview |", "|---|---|---:|---|"];
    brokenPrompts.forEach((p) => {
      const preview = (p.content || "").replace(/\n/g, " ").slice(0, 80).replace(/\|/g, "\\|");
      lines.push(`| ${p.id} | ${p.title} | ${((p.content || "").length)} | ${preview} |`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const el = document.createElement("a");
    el.href = URL.createObjectURL(blob);
    el.download = `broken-prompts-report-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    URL.revokeObjectURL(el.href);
    toast.success("Export started");
  };

  const handleApprove = async (submissionId: string) => {
    setIsProcessing(true);
    try {
      await approveSubmission(submissionId);
      toast.success("Prompt approved!");
      setPending((prev) => prev.filter((s) => s.id !== submissionId));
      setSelectedSubmission(null);
    } catch (error) {
      console.error("Error approving submission:", error);
      toast.error("Failed to approve");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (submissionId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsProcessing(true);
    try {
      await rejectSubmission(submissionId, rejectionReason);
      toast.success("Prompt rejected");
      setPending((prev) => prev.filter((s) => s.id !== submissionId));
      setSelectedSubmission(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting submission:", error);
      toast.error("Failed to reject");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleLock = async (submissionId: string, currentLocked: boolean) => {
    setIsProcessing(true);
    try {
      await togglePromptLock(submissionId, !currentLocked);
      toast.success(`Prompt ${!currentLocked ? "locked" : "unlocked"}`);
      setSelectedSubmission({
        ...selectedSubmission,
        isLocked: !currentLocked,
      });
    } catch (error) {
      console.error("Error toggling lock:", error);
      toast.error("Failed to toggle lock");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AdminGuard>
      <Layout>
        <div className="min-h-screen bg-background pt-32 px-6 pb-20">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-12">
              <h1 className="text-4xl font-display font-bold text-foreground mb-2">
                Moderate Submissions
              </h1>
              <p className="text-muted-foreground">
                Review and approve community-submitted prompts.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card className="bg-black/40 border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Review</p>
                      <p className="text-3xl font-bold text-primary">{pending.length}</p>
                    </div>
                    <Clock className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-white/10">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Content Cleanup</p>
                      <p className="text-sm text-muted-foreground/80">Scan approved prompts for broken/partial content</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => scanApprovedPrompts()} disabled={isScanning} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        {isScanning ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border border-current border-t-transparent" />
                            Scanning...
                          </div>
                        ) : (
                          "Scan approved prompts"
                        )}
                      </Button>
                      {brokenPrompts.length > 0 && (
                        <Button onClick={() => exportReport()} variant="outline">Export Report</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Submissions */}
            {isLoading ? (
              <Card className="bg-black/40 border-white/10">
                <CardContent className="pt-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border border-primary border-t-transparent mx-auto" />
                </CardContent>
              </Card>
            ) : pending.length === 0 ? (
              <Card className="bg-black/40 border-white/10">
                <CardContent className="pt-12 text-center">
                  <CheckCircle className="h-12 w-12 text-primary/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">All caught up! No pending submissions.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List */}
                <div className="lg:col-span-2 space-y-3">
                  {/* Broken prompts panel (shows after scan) */}
                  {brokenPrompts.length > 0 && (
                    <Card className="bg-black/40 border-white/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Broken / Partial Approved Prompts</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">Detected prompts with missing or suspiciously short content</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {brokenPrompts.map((p) => (
                            <div key={p.id} className="flex items-start justify-between gap-2 bg-black/30 p-2 rounded">
                              <div className="flex-1">
                                <div className="font-bold">{p.title}</div>
                                <div className="text-xs text-muted-foreground mt-1">ID: {p.id} • {((p.content||"").length)} chars</div>
                                <div className="text-xs mt-1 text-foreground/70 max-h-12 overflow-hidden">{(p.content||"").slice(0,200)}</div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button onClick={() => rejectBrokenPrompt(p.id)} disabled={isCleaning} variant="outline" className="border-red-600/20 text-red-400">Remove</Button>
                              </div>
                            </div>
                          ))}
                          <div className="flex gap-2 mt-2">
                            <Button onClick={() => rejectAllBroken()} disabled={isCleaning} className="bg-red-600 text-white">Reject All</Button>
                            <Button onClick={() => exportReport()} variant="outline">Export Report</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {pending.map((submission) => (
                    <Card
                      key={submission.id}
                      className={`bg-black/40 border-white/10 cursor-pointer transition-all ${
                        selectedSubmission?.id === submission.id
                          ? "border-primary/50 bg-primary/5"
                          : "hover:border-primary/30"
                      }`}
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-foreground">{submission.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              By {submission.displayName}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary" className="bg-white/5 text-xs">
                                {submission.category}
                              </Badge>
                              <Badge variant="outline" className="border-white/10 text-xs">
                                {new Date(submission.createdAt).toLocaleDateString()}
                              </Badge>
                            </div>
                          </div>
                          <Clock className="h-4 w-4 text-yellow-500 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Detail View */}
                <div>
                  {selectedSubmission ? (
                    <Card className="bg-black/40 border-white/10 sticky top-32">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{selectedSubmission.title}</CardTitle>
                        <CardDescription>{selectedSubmission.displayName}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Description */}
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                            Description
                          </p>
                          <p className="text-sm text-foreground">
                            {selectedSubmission.description}
                          </p>
                        </div>

                        {/* Content Preview */}
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                            Prompt Preview
                          </p>
                          <div className="bg-black/60 border border-white/10 rounded p-2 max-h-24 overflow-y-auto">
                            <p className="text-xs font-mono text-foreground/80">
                              {selectedSubmission.content.slice(0, 200)}...
                            </p>
                          </div>

                          {/* Attachment */}
                          {selectedSubmission.attachmentUrl && (
                            <div className="mt-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Attachment</p>
                              <a href={selectedSubmission.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary underline text-sm">Download {selectedSubmission.attachmentName || 'file'}</a>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        {selectedSubmission.tags.length > 0 && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                              Tags
                            </p>
                            <div className="flex gap-1 flex-wrap">
                              {selectedSubmission.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-xs border-white/10">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="border-t border-white/10 pt-4 space-y-2">
                          {/* Lock Toggle */}
                          <Button
                            onClick={() => handleToggleLock(selectedSubmission.id, selectedSubmission.isLocked)}
                            disabled={isProcessing}
                            variant="outline"
                            className="w-full border-white/10 hover:border-yellow-500/30 hover:text-yellow-400"
                          >
                            {selectedSubmission.isLocked ? (
                              <>
                                <Unlock className="mr-2 h-4 w-4" />
                                Unlock (Make Free)
                              </>
                            ) : (
                              <>
                                <Lock className="mr-2 h-4 w-4" />
                                Lock (Premium)
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => handleApprove(selectedSubmission.id)}
                            disabled={isProcessing}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>

                          {/* Rejection */}
                          <div>
                            <Textarea
                              placeholder="Reason for rejection..."
                              className="bg-black/60 border-white/10 text-xs h-20 mb-2"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                            />
                            <Button
                              onClick={() => handleReject(selectedSubmission.id)}
                              disabled={isProcessing}
                              className="w-full bg-red-600 hover:bg-red-700 text-white"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-black/40 border-white/10">
                      <CardContent className="pt-12 text-center">
                        <p className="text-muted-foreground text-sm">
                          Select a submission to review
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </AdminGuard>
  );
}
