export interface KnowledgeAsset {
  id: string;
  name: string;
  type: "pdf" | "txt" | "json" | "image";
  size?: string;
  url?: string; // Path to file in public/assets
}

export interface Prompt {
  id: string;
  title: string;
  category: "Art" | "Marketing" | "Development" | "Business" | "Creative Writing" | "Productivity" | "SEO" | "Other";
  description: string;
  content: string; // The actual prompt text
  previewContent?: string; // Teaser text for locked prompts
  tags: string[];
  
  // Security & Access Control
  isSecured: boolean; // If true, content is blurred/hidden for public users (UI-level)
  isLocked: boolean; // If true, prompt is completely locked - not sent to non-admins (server-level)
  accessLevel: "public" | "member" | "premium";
  lockedAt?: number; // Timestamp when locked (for audit trail)
  
  // Metadata
  rating: number;
  usageCount: number;
  
  // Associated Files (RAG/Knowledge)
  knowledgeAssets?: KnowledgeAsset[];
}

// ===== SECURITY & ACCESS CONTROL TYPES =====

export type UserAccessTier = "free" | "premium" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  authProvider: "google" | "github" | "email";
  accessTier: UserAccessTier;
  trialPromptUsed: boolean;
  strikes: number; // 0-3, 3 = banned
  banned: boolean;
  banReason?: string;
  premiumExpiresAt?: number; // timestamp
  createdAt: number;
  lastLoginAt: number;
}

export type PromptAccessType = "free" | "trial" | "premium" | "custom";

export interface UserPromptAccess {
  id: string;
  userId: string;
  promptId: string;
  accessType: PromptAccessType;
  grantedAt: number;
  expiresAt?: number; // For time-limited access
  usageCount: number;
}

export type AuditAction = 
  | "prompt_view_attempt"
  | "prompt_access_denied"
  | "prompt_access_granted"
  | "strike_warning"
  | "strike_applied"
  | "user_banned"
  | "user_unbanned"
  | "admin_action"
  | "prompt_lock_toggled";

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  promptId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
}

export interface CustomPromptRequest {
  id: string;
  userId: string;
  userEmail: string;
  description: string;
  donationAmount: number;
  status: "pending" | "completed" | "rejected";
  createdAt: number;
  completedAt?: number;
  notes?: string;
}

// ===== PROMPT SUBMISSION TYPES =====

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface PromptSubmission {
  id: string;
  userId: string;
  userEmail: string;
  displayName: string;
  title: string;
  description: string;
  content: string;
  category: "Art" | "Marketing" | "Development" | "Business" | "Creative Writing" | "Productivity" | "SEO" | "Other";
  tags: string[];
  status: SubmissionStatus;
  createdAt: number;
  approvedAt?: number;
  rejectedAt?: number;
  rejectionReason?: string;
  ratings: number[];
  averageRating: number;
  // Metadata about how the submission was created (optional)
  submissionSource?: 'form' | 'bulk';
}
