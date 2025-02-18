/**
 * @file RootLayout
 * @description Wraps the entire Next.js application in a global layout. 
 * Imports global styles and sets up a minimal HTML structure.
 */

import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prompt Manager',
  description: 'A Next.js app to manage 01 Pro prompts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white">
        {children}
      </body>
    </html>
  );
}