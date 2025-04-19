// =========================
// CLIENT COMPONENT (App Layout)
// =========================
/**
 * @file Layout.tsx
 * @description Layout is a reusable client component for consistent page structure.
 * It is NOT a Next.js layout (not in app/), but a normal React component for wrapping content.
 *
 * Key Next.js concepts:
 * - Client Components: Use React hooks, browser APIs, and interactivity.
 * - Used inside page.tsx to wrap the main content.
 */

import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4">
          <h1 className="text-xl font-bold text-foreground">
            Prompt XML Manager
          </h1>
        </div>
      </header>
      <main className="h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
};

export default Layout;