// =========================
// TYPE DECLARATIONS (TypeScript)
// =========================
/**
 * @file env.d.ts
 * @description TypeScript type declarations for environment variables.
 * Ensures type safety when accessing process.env in the app.
 *
 * Key Next.js concepts:
 * - Type Declarations: Used for type safety in both server and client code.
 */

// Type declarations for environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_BASE_DIRECTORY?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}