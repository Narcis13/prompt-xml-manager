"use server";
/**
 * @file apply-changes-actions.ts
 * @description A server action that parses the provided XML and applies file changes on the filesystem.
 */

import { parseXmlString } from "@/lib/xml-parser";
import { applyFileChanges } from "@/lib/apply-changes";

export async function applyChangesAction(xml: string, projectDirectory: string) {
  // Parse the changes from the XML
  const changes = await parseXmlString(xml);

  if (!changes || !Array.isArray(changes)) {
    throw new Error("Invalid XML format. Could not find <changed_files>.");
  }

  if (!projectDirectory || !projectDirectory.trim()) {
    throw new Error("No project directory provided.");
  }

  for (const file of changes) {
    await applyFileChanges(file, projectDirectory);
  }
}