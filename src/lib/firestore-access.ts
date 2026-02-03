// Firestore helpers removed for a clean state.
// Export minimal stubs so imports elsewhere do not fail.

export async function getUserProfile(_: string) {
  return null;
}

export async function createUserProfile() {
  return null;
}

export async function updateLastLogin() {
  return;
}

export async function checkPromptAccess() {
  return null;
}

export async function grantPromptAccess() {
  return;
}

export function getRandomTrialPrompt() {
  return null;
}

export async function claimTrialPrompt() {
  return false;
}

export async function addStrike() {
  return 0;
}

export async function warnUser(userId: string, reason: string): Promise<void> {
  try {
    await logAudit(userId, "strike_warning", undefined, `Warning: ${reason}`);
  } catch (error) {
    console.error("Error warning user:", error);
  }
}

export async function banUser(userId: string, reason: string): Promise<void> {
  try {
    await updateDoc(doc(db, "users", userId), {
      banned: true,
      banReason: reason,
    });

    await logAudit(userId, "user_banned", undefined, reason);
  } catch (error) {
    console.error("Error banning user:", error);
    throw error;
  }
}

export async function unbanUser(userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "users", userId), {
      banned: false,
      strikes: 0,
      banReason: undefined,
    });

    await logAudit(userId, "user_unbanned", undefined, "User unbanned");
  } catch (error) {
    console.error("Error unbanning user:", error);
    throw error;
  }
}

// ===== AUDIT LOGGING =====

export async function logAudit(
  userId: string,
  action: AuditAction,
  promptId?: string,
  details?: string
): Promise<void> {
  try {
    const auditLog: Omit<AuditLog, "id"> = {
      userId,
      action,
      promptId,
      details: details || "",
      ipAddress: "unknown", // Will be captured server-side in real app
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    };

    await addDoc(collection(db, "auditLogs"), auditLog);
  } catch (error) {
    console.error("Error logging audit:", error);
  }
}

// ===== CUSTOM PROMPT REQUESTS =====

export async function createCustomPromptRequest(
  userId: string,
  userEmail: string,
  description: string,
  donationAmount: number
): Promise<string> {
  try {
    const request: Omit<CustomPromptRequest, "id"> = {
      userId,
      userEmail,
      description,
      donationAmount,
      status: "pending",
      createdAt: Date.now(),
    };

    const docRef = await addDoc(collection(db, "customPromptRequests"), request);

    await logAudit(userId, "admin_action", undefined, `Custom prompt request created: ${docRef.id}`);

    return docRef.id;
  } catch (error) {
    console.error("Error creating custom prompt request:", error);
    throw error;
  }
}

export async function getCustomPromptRequests(): Promise<CustomPromptRequest[]> {
  try {
    const q = query(
      collection(db, "customPromptRequests"),
      where("status", "==", "pending")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    } as CustomPromptRequest));
  } catch (error) {
    console.error("Error getting custom prompt requests:", error);
    return [];
  }
}

export async function completeCustomPromptRequest(
  requestId: string,
  notes?: string
): Promise<void> {
  try {
    await updateDoc(doc(db, "customPromptRequests", requestId), {
      status: "completed",
      completedAt: Date.now(),
      notes,
    });

    await logAudit("system", "admin_action", undefined, `Custom prompt request ${requestId} completed`);
  } catch (error) {
    console.error("Error completing custom prompt request:", error);
    throw error;
  }
}

// ===== PROMPT SUBMISSIONS (Community) =====

export async function submitPrompt(
  userId: string,
  userEmail: string,
  displayName: string | undefined,
  title: string,
  description: string,
  content: string,
  category: any,
  tags: string[],
  attachmentFile?: File,
  submissionSource: 'form' | 'bulk' = 'form'
): Promise<string> {
  try {
    const submission: Omit<import("@/types").PromptSubmission, "id"> & Partial<{ attachmentUrl: string; attachmentName: string }> = {
      userId,
      userEmail,
      displayName: displayName || "Anonymous",
      title,
      description,
      content,
      category,
      tags,
      status: "pending",
      submissionSource,
      createdAt: Date.now(),
      ratings: [],
      averageRating: 0,
    };

    // Create submission first to obtain an ID for attachment path
    const docRef = await addDoc(collection(db, "promptSubmissions"), submission);

    if (attachmentFile) {
      try {
        // Upload attachment to storage under the submission id
        const path = `prompt-submissions/${docRef.id}/attachment/${attachmentFile.name}`;
        const storage = (await import("firebase/storage")).getStorage();
        const storageRef = (await import("firebase/storage")).ref(storage, path);
        await (await import("firebase/storage")).uploadBytes(storageRef, attachmentFile as any);
        const url = await (await import("firebase/storage")).getDownloadURL(storageRef);

        await updateDoc(doc(db, "promptSubmissions", docRef.id), {
          attachmentUrl: url,
          attachmentName: attachmentFile.name,
        });
      } catch (uploadErr) {
        console.error("Attachment upload failed:", uploadErr);
        // Don't fail the entire submission if attachment upload fails
      }
    }

    await logAudit(userId, "admin_action", undefined, `Prompt submitted: ${title}`);
    return docRef.id;
  } catch (error) {
    console.error("Error submitting prompt:", error);
    throw error;
  }
}

export async function getPendingSubmissions(): Promise<any[]> {
  try {
    const q = query(
      collection(db, "promptSubmissions"),
      where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
  } catch (error) {
    console.error("Error getting pending submissions:", error);
    return [];
  }
}

export async function approveSubmission(submissionId: string): Promise<void> {
  try {
    const submission = await getDoc(doc(db, "promptSubmissions", submissionId));
    if (!submission.exists()) throw new Error("Submission not found");

    const data = submission.data();

    // Mark as approved
    await updateDoc(doc(db, "promptSubmissions", submissionId), {
      status: "approved",
      approvedAt: Date.now(),
    });

    await logAudit("system", "admin_action", undefined, `Approved submission: ${data.title}`);
  } catch (error) {
    console.error("Error approving submission:", error);
    throw error;
  }
}

export async function rejectSubmission(submissionId: string, reason: string): Promise<void> {
  try {
    const submission = await getDoc(doc(db, "promptSubmissions", submissionId));
    if (!submission.exists()) throw new Error("Submission not found");

    const data = submission.data();

    await updateDoc(doc(db, "promptSubmissions", submissionId), {
      status: "rejected",
      rejectedAt: Date.now(),
      rejectionReason: reason,
    });

    await logAudit("system", "admin_action", undefined, `Rejected submission: ${data.title}`);
  } catch (error) {
    console.error("Error rejecting submission:", error);
    throw error;
  }
}

export async function getApprovedPrompts(pageLimit: number = 20, lastDoc?: any): Promise<{prompts: any[], hasMore: boolean, lastDoc: any}> {
  try {
    let q = query(
      collection(db, "promptSubmissions"),
      where("status", "==", "approved"),
      orderBy("approvedAt", "desc")
    );
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    q = query(q, limit(pageLimit + 1));
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;
    const hasMore = docs.length > pageLimit;
    const prompts = docs.slice(0, pageLimit).map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    const newLastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
    return { prompts, hasMore, lastDoc: newLastDoc };
  } catch (error) {
    console.error("Error getting approved prompts:", error);
    return { prompts: [], hasMore: false, lastDoc: null };
  }
}

export async function getUserSubmissions(userId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, "promptSubmissions"),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }))
      .sort((a: any, b: any) => {
        const aTime = a.createdAt?.getTime?.() || a.createdAt || 0;
        const bTime = b.createdAt?.getTime?.() || b.createdAt || 0;
        return bTime - aTime;
      });
  } catch (error) {
    console.error("Error getting user submissions:", error);
    return [];
  }
}

export async function getLeaderboard(limit: number = 50): Promise<any[]> {
  try {
    const q = query(
      collection(db, "promptSubmissions"),
      where("status", "==", "approved")
    );
    const querySnapshot = await getDocs(q);

    // Group by userId and count
    const leaderboard: { [key: string]: any } = {};
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!leaderboard[data.userId]) {
        leaderboard[data.userId] = {
          userId: data.userId,
          displayName: data.displayName,
          promptCount: 0,
        };
      }
      leaderboard[data.userId].promptCount += 1;
    });

    // Sort and limit
    return Object.values(leaderboard)
      .sort((a: any, b: any) => b.promptCount - a.promptCount)
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return [];
  }
}

export async function getAuditLogs(userId?: string, limit: number = 100): Promise<AuditLog[]> {
  try {
    let q;

    if (userId) {
      q = query(
        collection(db, "auditLogs"),
        where("userId", "==", userId)
      );
    } else {
      q = collection(db, "auditLogs");
    }

    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs
      .map((doc) => {
        const data = doc.data() as Omit<AuditLog, "id">;
        return {
          ...data,
          id: doc.id,
        };
      })
      .sort((a: any, b: any) => {
        const aTime = a.timestamp?.getTime?.() || typeof a.timestamp === 'number' ? a.timestamp : 0;
        const bTime = b.timestamp?.getTime?.() || typeof b.timestamp === 'number' ? b.timestamp : 0;
        return bTime - aTime;
      })
      .slice(0, limit);

    return logs;
  } catch (error) {
    console.error("Error getting audit logs:", error);
    return [];
  }
}

export async function togglePromptLock(
  submissionId: string,
  isLocked: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, "promptSubmissions", submissionId), {
      isLocked,
      lockedAt: isLocked ? Timestamp.now() : null,
    });

    await logAudit(
      "admin",
      "prompt_lock_toggled",
      undefined,
      `Prompt ${isLocked ? "locked" : "unlocked"}: ${submissionId}`
    );
  } catch (error) {
    console.error("Error toggling prompt lock:", error);
    throw error;
  }
}
