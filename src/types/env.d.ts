// Type declarations for environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_BASE_DIRECTORY?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
} 