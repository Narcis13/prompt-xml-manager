import { promises as fs } from "fs";
import { dirname, resolve, isAbsolute } from "path";

interface FileChange {
  file_summary: string;
  file_operation: string;
  file_path: string;
  file_code?: string;
}

export async function applyFileChanges(change: FileChange, projectDirectory: string) {
  const { file_operation, file_path, file_code } = change;

  // Ensure project directory is absolute
  const absoluteProjectDir = resolve(projectDirectory);
  if (!isAbsolute(absoluteProjectDir)) {
    throw new Error(`Project directory must be an absolute path: ${projectDirectory}`);
  }

  // Resolve the full path
  const fullPath = resolve(absoluteProjectDir, file_path);

  // Security check
  if (!fullPath.startsWith(absoluteProjectDir)) {
    throw new Error(`File path must be within project directory. Denied: ${file_path}`);
  }

  switch (file_operation.toUpperCase()) {
    case "CREATE":
    case "UPDATE":
      if (!file_code) {
        throw new Error(`No file_code provided for ${file_operation} operation on ${file_path}`);
      }
      await ensureDirectoryExists(dirname(fullPath));
      await fs.writeFile(fullPath, file_code, "utf-8");
      break;

    case "DELETE":
      await fs.rm(fullPath, { force: true });
      break;

    default:
      console.warn(`Unknown file_operation: ${file_operation} for file: ${file_path}`);
      break;
  }
}

async function ensureDirectoryExists(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") {
      console.error(`Error creating directory ${dir}:`, error);
      throw error;
    }
  }
}