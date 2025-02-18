/**
 * @file RootLayout
 * @description Wraps the entire Next.js application in a global layout. 
 * Adopts the black/gray/orange theme from updated globals.css.
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