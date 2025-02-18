/**
 * @file HomePage
 * @description Main landing page showing the sidebar (steps) and the selected prompt content.
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
    return <Layout><div className="flex w-full h-full min-h-screen"></div></Layout>;
  }

  return (
    <Layout>
      <div className="flex w-full h-full min-h-screen">
        <Sidebar
          prompts={PROMPTS}
          selectedIndex={selectedPromptIndex}
          onSelect={handleSelectPrompt}
        />
        <main className="flex-1 p-4 overflow-y-auto">
          <PromptDisplay promptData={selectedPrompt} />
        </main>
      </div>
    </Layout>
  );
}