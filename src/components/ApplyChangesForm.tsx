"use client";
/**
 * @file ApplyChangesForm.tsx
 * @description Form to paste XML from the O1 model and apply changes to a codebase.
 * Now includes a "Preview Changes" feature that shows a green/red diff of what
 * would be changed before actually applying them.
 */

import React, { useState, useEffect } from "react";
import { applyChangesAction, previewChangesAction } from "../actions/apply-changes-actions";
import { useLocalStorage } from "../lib/hooks/useLocalStorage";
import DiffModal from "./DiffModal";

interface PreviewDiffResult {
  file_path: string;
  file_summary: string;
  file_operation: string;
  diff?: string;
  error?: string;
}

const ApplyChangesForm: React.FC = () => {
  const [xml, setXml] = useState<string>("");
  // For the base directory (optional)
  const [baseDir, setBaseDir] = useLocalStorage<string>("base_directory", "");
  // For the folder name or full path
  const [projectFolder, setProjectFolder] = useLocalStorage<string>("project_folder", "");

  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [previewError, setPreviewError] = useState<string>("");
  const [previewDiffs, setPreviewDiffs] = useState<PreviewDiffResult[] | null>(null);
  const [showDiffModal, setShowDiffModal] = useState<boolean>(false);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const buildFinalDirectory = (): string => {
    let finalDirectory = "";
    const trimmedProjectFolder = projectFolder.trim();
    const trimmedBaseDir = baseDir.trim();

    // If projectFolder is a full path starting with '/', use it directly
    if (trimmedProjectFolder.startsWith("/")) {
      finalDirectory = trimmedProjectFolder;
    } else {
      if (trimmedBaseDir && trimmedProjectFolder) {
        if (trimmedBaseDir.endsWith("/")) {
          finalDirectory = trimmedBaseDir + trimmedProjectFolder;
        } else {
          finalDirectory = trimmedBaseDir + "/" + trimmedProjectFolder;
        }
      } else if (trimmedBaseDir && !trimmedProjectFolder) {
        finalDirectory = trimmedBaseDir;
      } else if (!trimmedBaseDir && trimmedProjectFolder) {
        finalDirectory = trimmedProjectFolder;
      }
    }

    return finalDirectory;
  };

  const handlePreview = async () => {
    setPreviewError("");
    setPreviewDiffs(null);
    setShowDiffModal(false);

    if (!xml.trim()) {
      setPreviewError("Please paste XML before previewing changes.");
      return;
    }

    const finalDirectory = buildFinalDirectory();
    if (!finalDirectory) {
      setPreviewError("No directory specified. Provide a base directory + project folder or a full path.");
      return;
    }

    try {
      const result = await previewChangesAction(xml, finalDirectory);
      setPreviewDiffs(result);
      setShowDiffModal(true);
    } catch (error: unknown) {
      const parsedError = error instanceof Error ? error : new Error(String(error));
      setPreviewError(parsedError?.message || "An error occurred while previewing changes.");
    }
  };

  const handleApply = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!xml.trim()) {
      setErrorMessage("Please paste XML before applying changes.");
      return;
    }

    const finalDirectory = buildFinalDirectory();
    if (!finalDirectory) {
      setErrorMessage("No directory specified. Provide a base directory + project folder or a full path.");
      return;
    }

    try {
      await applyChangesAction(xml, finalDirectory);
      setXml("");
      setPreviewDiffs(null);
      setShowDiffModal(false);
      setSuccessMessage("Changes applied successfully!");
    } catch (error: unknown) {
      const parsedError = error instanceof Error ? error : new Error(String(error));
      setErrorMessage(parsedError?.message || "An error occurred while applying changes.");
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary-foreground">
          {successMessage}
        </div>
      )}

      <div className="flex flex-col">
        <label className="mb-2 font-medium text-foreground">Base Directory (Optional):</label>
        <input
          className="border border-border bg-secondary text-foreground p-3 w-full rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          type="text"
          value={baseDir}
          onChange={(e) => setBaseDir(e.target.value)}
          placeholder="e.g. /Users/{user}/{dev-folder}"
        />
        <p className="text-sm text-muted-foreground mt-2">
          This is optional. If provided, it will combine with your project folder name below.
        </p>
      </div>

      <div className="flex flex-col">
        <label className="mb-2 font-medium text-foreground">Project Folder (Name or Full Path):</label>
        <input
          className="border border-border bg-secondary text-foreground p-3 w-full rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          type="text"
          value={projectFolder}
          onChange={(e) => setProjectFolder(e.target.value)}
          placeholder="e.g. /Users/user/{dev-folder}/{project-name} or {project-name}"
        />
        <p className="text-sm text-muted-foreground mt-2">
          If you provide a full path (starting with /), the base directory above will be ignored.
        </p>
      </div>

      <div className="flex flex-col">
        <label className="mb-2 font-medium text-foreground">Paste XML here:</label>
        <textarea
          className="border border-border bg-secondary text-foreground p-3 h-64 w-full rounded-lg resize-none focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          value={xml}
          onChange={(e) => setXml(e.target.value)}
          placeholder="Paste the <code_changes>...</code_changes> XML here"
        />
      </div>

      <div className="flex items-center space-x-4">
        <button
          className="flex-1 px-6 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors font-medium"
          onClick={handlePreview}
        >
          Preview Changes
        </button>

        <button
          className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors shadow-lg shadow-primary/20 font-medium"
          onClick={handleApply}
        >
          Apply Changes
        </button>
      </div>

      {previewError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {previewError}
        </div>
      )}

      {/* Diff Modal */}
      {previewDiffs && (
        <DiffModal
          diffs={previewDiffs}
          isOpen={showDiffModal}
          onClose={() => setShowDiffModal(false)}
        />
      )}
    </div>
  );
};

export default ApplyChangesForm;