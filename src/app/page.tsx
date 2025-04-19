// =========================
// CLIENT COMPONENT (Main Page)
// =========================
/**
 * @file page.tsx
 * @description HomePage is a Next.js 15 Client Component (because it uses hooks and interactivity).
 * It renders the main UI: sidebar navigation and the selected prompt content.
 *
 * Key Next.js concepts:
 * - Client Components: Use 'use client' at the top, can use React hooks, browser APIs, and are interactive.
 * - App Router: Files in app/ are routed by filename (page.tsx = / route).
 * - Layout: This page is wrapped by RootLayout (layout.tsx).
 */

'use client';

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import PromptDisplay from '../components/PromptDisplay';
import { PROMPTS } from '../lib/constants';
import { PromptData } from '../lib/constants';

export default function HomePage() {
  // Add loading state to prevent hydration mismatch
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);

  useEffect(() => {
    // After initial mount, we can show content
    setIsLoading(false);
  }, []);

  const handleSelectPrompt = (index: number) => {
    setSelectedPromptIndex(index);
  };

  const selectedPrompt: PromptData = PROMPTS[selectedPromptIndex];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex w-full h-full min-h-screen bg-background animate-pulse" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex w-full h-screen bg-background overflow-hidden">
        {/* Sidebar with navigation */}
        <Sidebar
          prompts={PROMPTS}
          selectedIndex={selectedPromptIndex}
          onSelect={handleSelectPrompt}
        />
        
        {/* Main content area */}
        <main className="flex-1 bg-gradient-to-b from-background to-background/50">
          <div className="h-full">
            <PromptDisplay promptData={selectedPrompt} />
          </div>
        </main>
      </div>
    </Layout>
  );
}