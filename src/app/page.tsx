/**
 * @file HomePage
 * @description Main landing page showing the sidebar (steps) and the selected prompt content
 * with a sleek dark theme and professional layout.
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
      <div className="flex w-full h-full min-h-screen bg-background">
        {/* Sidebar with navigation */}
        <Sidebar
          prompts={PROMPTS}
          selectedIndex={selectedPromptIndex}
          onSelect={handleSelectPrompt}
        />
        
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-background/50">
          <div className="h-full">
            <PromptDisplay promptData={selectedPrompt} />
          </div>
        </main>
      </div>
    </Layout>
  );
}