import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Trash2, CheckCircle, Clock, Ban } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AdminGuard from "@/components/AdminGuard";
import Layout from "@/components/Layout";
import {
  getAuditLogs,
  getCustomPromptRequests,
  completeCustomPromptRequest,
  banUser,
  unbanUser,
} from "@/lib/firestore-access";
import type { AuditLog, CustomPromptRequest } from "@/types";

export default function AdminDashboard() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomPromptRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CustomPromptRequest | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [logs, requests] = await Promise.all([
          getAuditLogs(undefined, 100),
          getCustomPromptRequests(),
        ]);
        setAuditLogs(logs);
        setCustomRequests(requests);
      } catch (error) {
        console.error("Error loading admin data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCompleteRequest = async (requestId: string) => {
    try {
      await completeCustomPromptRequest(requestId, completionNotes);
      setCustomRequests((prev) => prev.filter((r) => r.id !== requestId));
      setSelectedRequest(null);
      setCompletionNotes("");
    } catch (error) {
      console.error("Error completing request:", error);
    }
  };

  return (
    <AdminGuard>
      <Layout>
        <div className="min-h-screen bg-background pt-32 px-6 pb-20">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-12">
              <h1 className="text-4xl font-display font-bold text-foreground mb-2">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage custom prompt requests, view audit logs, and maintain platform security.
              </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="custom-requests" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md bg-black/40 border border-white/10">
                <TabsTrigger value="custom-requests" className="data-[state=active]:bg-primary/20">
                  Custom Requests
                </TabsTrigger>
                <TabsTrigger value="audit-logs" className="data-[state=active]:bg-primary/20">
                  Audit Logs
                </TabsTrigger>
              </TabsList>

              {/* CUSTOM REQUESTS TAB */}
              <TabsContent value="custom-requests" className="space-y-6 mt-6">
                {customRequests.length === 0 ? (
                  <Card className="bg-black/40 border-white/10">
                    <CardContent className="pt-12 text-center">
                      <p className="text-muted-foreground">No pending custom prompt requests.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {customRequests.map((request) => (
                      <Card
                        key={request.id}
                        className={`bg-black/40 border-white/10 cursor-pointer transition-all hover:border-primary/30 ${
                          selectedRequest?.id === request.id ? "border-primary/50 bg-primary/5" : ""
                        }`}
                        onClick={() => setSelectedRequest(request)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-lg">{request.userEmail}</CardTitle>
                                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                                  £{request.donationAmount}
                                </span>
                              </div>
                              <CardDescription>
                                Requested {new Date(request.createdAt).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-mono text-muted-foreground">{request.id}</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                              Description
                            </Label>
                            <p className="text-sm mt-2 text-foreground leading-relaxed">
                              {request.description}
                            </p>
                          </div>

                          {selectedRequest?.id === request.id && (
                            <div className="border-t border-white/10 pt-4 space-y-4">
                              <div>
                                <Label htmlFor="notes" className="text-xs uppercase tracking-wide">
                                  Completion Notes (Optional)
                                </Label>
                                <Textarea
                                  id="notes"
                                  placeholder="Add notes about the custom prompt..."
                                  className="mt-2 bg-black/60 border-white/10 text-sm h-24"
                                  value={completionNotes}
                                  onChange={(e) => setCompletionNotes(e.target.value)}
                                />
                              </div>
                              <Button
                                onClick={() => handleCompleteRequest(request.id)}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Complete
                              </Button>
                              <p className="text-xs text-muted-foreground">
                                You'll send the custom prompt to {request.userEmail} separately via email.
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* AUDIT LOGS TAB */}
              <TabsContent value="audit-logs" className="space-y-6 mt-6">
                {isLoading ? (
                  <Card className="bg-black/40 border-white/10">
                    <CardContent className="pt-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border border-primary border-t-transparent mx-auto" />
                    </CardContent>
                  </Card>
                ) : auditLogs.length === 0 ? (
                  <Card className="bg-black/40 border-white/10">
                    <CardContent className="pt-12 text-center">
                      <p className="text-muted-foreground">No audit logs yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <Card key={log.id} className="bg-black/40 border-white/10">
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                                User
                              </p>
                              <p className="font-mono text-xs text-foreground truncate">
                                {log.userId}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                                Action
                              </p>
                              <p className="text-sm font-medium">
                                {log.action.replace(/_/g, " ").toUpperCase()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                                Details
                              </p>
                              <p className="text-sm text-foreground">{log.details || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                                Time
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Layout>
    </AdminGuard>
  );
}
