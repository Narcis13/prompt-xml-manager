// =========================
// SERVER COMPONENT (Root Layout)
// =========================
/**
 * @file layout.tsx
 * @description RootLayout is a special Next.js 15 Server Component that wraps your entire app. 
 * It defines the HTML structure, metadata, and global styles. 
 * In Next.js 15, files in the app/ directory are server components by default unless you add 'use client'.
 *
 * Key Next.js concepts:
 * - Server Components: Run on the server, have no access to browser APIs, and are good for static/shared UI.
 * - Metadata: Used for SEO and browser tab info.
 * - Global CSS: Imported here to apply styles everywhere.
 */

import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prompt Manager',
  description: 'A Next.js app to manage 01 Pro prompts and apply code changes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}