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

export async function warnUser() {
  return;
}

export async function banUser() {
  return;
}

export async function unbanUser() {
  return;
}

export async function logAudit() {
  return;
}

export async function createCustomPromptRequest() {
  return "";
}

export async function getCustomPromptRequests() {
  return [];
}

export async function completeCustomPromptRequest() {
  return;
}

export async function submitPrompt() {
  return "";
}

export async function getPendingSubmissions() {
  return [];
}

export async function approveSubmission() {
  return;
}

export async function rejectSubmission() {
  return;
}

export async function getApprovedPrompts() {
  return { prompts: [], hasMore: false, lastDoc: null };
}

export async function getUserSubmissions() {
  return [];
}

export async function getLeaderboard() {
  return [];
}

export async function getAuditLogs() {
  return [];
}

export async function togglePromptLock() {
  return;
}
