"use server";
/**
 * @file apply-changes-actions.ts
 * @description A server action that parses the provided XML and applies or previews file changes on the filesystem.
 */

import { parseAndValidateXml } from "@/lib/xml-parser";
import { applyFileChanges } from "@/lib/apply-changes";
import { promises as fs } from "fs";
import { resolve, isAbsolute } from "path";
import { diffLines } from "diff";

/**
 * applyChangesAction
 * Parses XML, then applies changes to the filesystem.
 */
export const applyChangesAction = async (xml: string, projectDirectory: string) => {
  // Parse/Validate the changes from the XML
  const changes = await parseAndValidateXml(xml);

  if (!changes || !Array.isArray(changes)) {
    throw new Error("Invalid XML format. Could not parse changes.");
  }

  if (!projectDirectory || !projectDirectory.trim()) {
    throw new Error("No project directory provided.");
  }

  for (const file of changes) {
    await applyFileChanges(file, projectDirectory);
  }
};

/**
 * previewChangesAction
 * Parses/Validates XML, then creates a diff against existing code for CREATE/UPDATE operations
 * (DELETE just notes the file would be removed).
 * Returns an array of diffs: { file_path, isDelete, diff, error? }
 */
export const previewChangesAction = async (xml: string, projectDirectory: string) => {
  const changes = await parseAndValidateXml(xml);

  if (!changes || !Array.isArray(changes)) {
    throw new Error("Invalid XML format. Could not parse changes.");
  }

  if (!projectDirectory || !projectDirectory.trim()) {
    throw new Error("No project directory provided.");
  }

  const results: {
    file_path: string;
    file_summary: string;
    file_operation: string;
    diff?: string;
    error?: string;
  }[] = [];

  for (const file of changes) {
    const { file_operation, file_path, file_code, file_summary } = file;
    const upperOp = file_operation.toUpperCase();

    try {
      // Ensure projectDirectory is absolute
      const absoluteProjectDir = resolve(projectDirectory);
      if (!isAbsolute(absoluteProjectDir)) {
        throw new Error(`Project directory must be an absolute path: ${projectDirectory}`);
      }

      const fullPath = resolve(absoluteProjectDir, file_path);
      if (!fullPath.startsWith(absoluteProjectDir)) {
        throw new Error(`File path must be within project directory. Denied: ${file_path}`);
      }

      if (upperOp === "DELETE") {
        // For deletes, we won't generate a diff, just note it will be removed
        results.push({
          file_path,
          file_summary,
          file_operation,
          diff: "File will be deleted."
        });
      } else {
        // CREATE or UPDATE => compare existing code with new code
        let oldCode = "";
        try {
          oldCode = await fs.readFile(fullPath, "utf-8");
        } catch {
          oldCode = "";
        }

        const newCode = file_code || "";
        const diff = diffLines(oldCode, newCode, { newlineIsToken: true });
        // Build a unified diff string manually
        let diffStr = "";
        diff.forEach(part => {
          const lines = part.value.split("\n");
          lines.forEach((line) => {
            // Skip empty lines only if they're the only line
            if (line.trim() === "" && lines.length === 1) {
              return;
            }
            // Add the appropriate prefix based on the type of change
            if (part.added) {
              diffStr += "+" + line + "\n";
            } else if (part.removed) {
              diffStr += "-" + line + "\n";
            } else {
              diffStr += " " + line + "\n";
            }
          });
        });

        results.push({
          file_path,
          file_summary,
          file_operation,
          diff: diffStr
        });
      }
    } catch (_error: unknown) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      results.push({
        file_path,
        file_summary,
        file_operation,
        error: error.message
      });
    }
  }

  return results;
};