/**
 * @file DiffViewer.tsx
 * @description
 * Renders a collapsible list of file diffs using react-diff-viewer.
 *
 * Each file's diff is shown with optional syntax highlight. By default
 * we treat them as text. For actual syntax highlight, we'd integrate
 * highlight libraries, but standard text diff is enough for demonstration.
 */

"use client";

import React, { useState } from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer";

interface DiffItem {
  file_path: string;
  file_summary: string;
  file_operation: string;
  diff?: string;
  error?: string;
}

interface DiffViewerProps {
  diffs: DiffItem[];
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diffs }) => {
  const [expandedFiles, setExpandedFiles] = useState<{ [key: string]: boolean }>({});

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => ({
      ...prev,
      [filePath]: !prev[filePath],
    }));
  };

  /**
   * We have a unified string with +/- lines. We'll pass them into ReactDiffViewer
   * as "oldValue/newValue" by reconstructing them. This isn't perfect but is workable
   * for a quick approach. The best approach is to parse the unified diff properly
   * but let's do a simpler split.
   */
  function parseDiffToOldNew(diffStr: string | undefined) {
    if (!diffStr) {
      return {
        oldValue: "",
        newValue: ""
      };
    }
    
    const oldLines: string[] = [];
    const newLines: string[] = [];
    const lines = diffStr.split("\n");

    for (const line of lines) {
      if (!line) continue;
      if (line.startsWith("+")) {
        newLines.push(line.replace(/^\+/, ""));
      } else if (line.startsWith("-")) {
        oldLines.push(line.replace(/^-/, ""));
      } else {
        oldLines.push(line.replace(/^ /, ""));
        newLines.push(line.replace(/^ /, ""));
      }
    }
    return {
      oldValue: oldLines.join("\n"),
      newValue: newLines.join("\n")
    };
  }

  return (
    <div className="space-y-6">
      {diffs.map((diffItem) => {
        const { file_path, diff, error, file_operation, file_summary } = diffItem;
        const isOpen = expandedFiles[file_path] || false;

        if (error) {
          return (
            <div key={file_path} className="p-4 border border-red-500 bg-red-50 text-red-800 rounded">
              <p className="font-bold">Error in {file_path}:</p>
              <p>{error}</p>
            </div>
          );
        }

        if (file_operation.toUpperCase() === "DELETE") {
          return (
            <div
              key={file_path}
              className="p-4 border border-border bg-card text-foreground rounded space-y-2"
            >
              <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleFile(file_path)}>
                <p className="font-semibold">
                  {file_path} ({file_operation})
                </p>
                <span className="text-sm text-muted-foreground">
                  {isOpen ? "Hide" : "Show"} details
                </span>
              </div>
              {isOpen && (
                <div className="bg-secondary p-2 text-destructive-foreground rounded">
                  <p className="font-bold">File will be deleted.</p>
                  {file_summary && <p className="mt-1 text-sm italic">{file_summary}</p>}
                </div>
              )}
            </div>
          );
        }

        // CREATE or UPDATE => show the diff
        const { oldValue, newValue } = parseDiffToOldNew(diff);

        return (
          <div
            key={file_path}
            className="border border-border bg-card rounded p-4 space-y-2"
          >
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleFile(file_path)}
            >
              <p className="font-semibold">
                {file_path} ({file_operation})
              </p>
              <span className="text-sm text-muted-foreground">
                {isOpen ? "Hide" : "Show"} diff
              </span>
            </div>
            {isOpen && (
              <div className="bg-secondary rounded p-2 overflow-auto">
                {file_summary && (
                  <p className="mb-2 text-sm italic text-muted-foreground">
                    {file_summary}
                  </p>
                )}
                <ReactDiffViewer
                  oldValue={oldValue}
                  newValue={newValue}
                  splitView={true}
                  compareMethod={DiffMethod.WORDS}
                  leftTitle="Old"
                  rightTitle="New"
                  showDiffOnly={false}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DiffViewer;