/** @vitest-environment jsdom */
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CommunityPrompts from "../CommunityPrompts";
import { getApprovedPrompts } from "@/lib/firestore-access";

vi.mock("@/lib/firestore-access", () => ({
  getApprovedPrompts: vi.fn(),
}));

// Simplify layout for tests so we can assert on rendered prompt titles reliably
vi.mock('@/components/Layout', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

// Mock auth context used by CommunityPrompts
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("CommunityPrompts", () => {
  it("renders and shows a few prompts", async () => {
    (getApprovedPrompts as any).mockResolvedValue({
      prompts: [
        { id: "p0", title: "Prompt 0", description: "Desc", category: "Other", tags: ["t"], displayName: "T", approvedAt: Date.now(), content: "This is a long prompt content for testing purposes. " + "x".repeat(100), isLocked: false }
      ],
      hasMore: false,
      lastDoc: null,
    });

    render(<CommunityPrompts />);

    // findAllByText is used because layout produces duplicate nodes for titles
    // (cards rendered inside the layout wrapper). We just need at least one match.
    const matches = await screen.findAllByText(/Prompt 0/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("shows Load More and appends prompts when clicked", async () => {
    (getApprovedPrompts as any)
      .mockResolvedValueOnce({
        prompts: [ { id: "p0", title: "Prompt 0", description: "Desc", category: "Other", tags: [], displayName: "T", approvedAt: Date.now(), content: "This is a long prompt content for testing purposes. " + "x".repeat(100), isLocked: false } ],
        hasMore: true,
        lastDoc: { id: "doc1" },
      })
      .mockResolvedValueOnce({
        prompts: [ { id: "p1", title: "Prompt 1", description: "Desc", category: "Other", tags: [], displayName: "T", approvedAt: Date.now(), content: "This is a long prompt content for testing purposes. " + "x".repeat(120), isLocked: false } ],
        hasMore: false,
        lastDoc: null,
      });

    render(<CommunityPrompts />);

    const matches0 = await screen.findAllByText(/Prompt 0/i);
    expect(matches0.length).toBeGreaterThan(0);

    const loadMore = await screen.findByRole("button", { name: /Load More Prompts/i });
    fireEvent.click(loadMore);

    const matches1 = await screen.findAllByText(/Prompt 1/i);
    expect(matches1.length).toBeGreaterThan(0);
  });

  it("displays error and allows retry", async () => {
    (getApprovedPrompts as any)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        prompts: [ { id: "p0", title: "Prompt 0", description: "Desc", category: "Other", tags: [], displayName: "T", approvedAt: Date.now(), content: "This is a long prompt content for testing purposes. " + "x".repeat(100), isLocked: false } ],
        hasMore: false,
        lastDoc: null,
      });

    render(<CommunityPrompts />);

    expect(await screen.findByText(/Error:/i)).toBeTruthy();

    const retry = await screen.findByRole("button", { name: /Retry/i });
    fireEvent.click(retry);

    const retryMatches = await screen.findAllByText(/Prompt 0/i);
    expect(retryMatches.length).toBeGreaterThan(0);
  });
});
