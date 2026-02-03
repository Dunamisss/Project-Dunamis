/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PromptCard from '../PromptCard';

const securedPrompt = {
  id: 'p1',
  title: 'Secured Prompt',
  category: 'Art',
  description: 'A secured prompt',
  previewContent: 'Preview of secured prompt',
  content: 'Full secured content',
  isSecured: true,
  accessLevel: 'premium',
  rating: 5,
  tags: [],
  knowledgeAssets: []
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

beforeEach(() => {
  // Provide a minimal localStorage mock for jsdom in CI
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (store[key] ?? null),
    setItem: (key: string, value: string) => (store[key] = value),
    removeItem: (key: string) => delete store[key],
    clear: () => Object.keys(store).forEach(k => delete store[k]),
  });
});

describe('PromptCard (secured behavior)', () => {
  it('shows sign-in message on card when user is not signed in', () => {
    render(<PromptCard prompt={securedPrompt as any} />);
    expect(screen.getByText(/Sign in to preview this secured prompt/i)).toBeDefined();
  });

  it('dialog shows premium lock overlay for guests', async () => {
    render(<PromptCard prompt={securedPrompt as any} />);

    // open dialog by clicking the card trigger (pick the first match to avoid duplicate text nodes)
    const titles = screen.getAllByText(securedPrompt.title);
    fireEvent.click(titles[0]);

    // Expect a lock heading to be present in the dialog
    expect(await screen.findByText(/Premium Content/i)).toBeDefined();
    expect(await screen.findByText(/Sign in to access it/i) || screen.getByText(/Donate/i)).toBeDefined();
  });
});