// Configuration management for the application

// Helper function to get environment variables with type safety
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // Debug logs for environment variable loading
  console.log('Environment Variable Debug:');
  console.log('- Key being accessed:', key);
  
  // We can access NEXT_PUBLIC variables directly from process.env
  const value = process.env[key];
  console.log('- Value:', value);
  
  return value || defaultValue;
};

// Log the config object creation
const config = {
  // Base directory from environment variable, with fallback to empty string
  baseDirectory: getEnvVar('NEXT_PUBLIC_BASE_DIRECTORY', ''),
} as const;

console.log('Final config object:', config);

export { config };
// Type for the config object
export type Config = typeof config;