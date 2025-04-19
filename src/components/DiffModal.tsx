// =========================
// CLIENT COMPONENT (Diff Modal)
// =========================
/**
 * @file DiffModal.tsx
 * @description DiffModal is a client component that shows a modal with file diffs (before/after changes).
 * Used in ApplyChangesForm to preview changes before applying.
 *
 * Key Next.js concepts:
 * - Client Components: Use React hooks, browser APIs, and interactivity.
 * - Visualization: Shows code diffs for user review.
 */

"use client";

import React, { useState } from "react";
import ReactDiffViewer from "react-diff-viewer";
import { X } from "lucide-react";

interface DiffModalProps {
  diffs: Array<{
    file_path: string;
    file_operation: string;
    diff?: string;
    file_summary?: string;
    error?: string;
  }>;
  isOpen: boolean;
  onClose: () => void;
}

const DiffModal: React.FC<DiffModalProps> = ({ diffs, isOpen, onClose }) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  if (!isOpen) return null;

  // Custom dark theme for the diff viewer
  const darkTheme = {
    variables: {
      dark: {
        diffViewerBackground: "#1a1a1a",
        diffViewerColor: "#fff",
        addedBackground: "#044B53",
        addedColor: "#fff",
        removedBackground: "#632F34",
        removedColor: "#fff",
        wordAddedBackground: "#055d67",
        wordRemovedBackground: "#7d3b41",
        addedGutterBackground: "#034148",
        removedGutterBackground: "#632F34",
        gutterBackground: "#1a1a1a",
        gutterBackgroundDark: "#262626",
        highlightBackground: "#2a2a2a",
        highlightGutterBackground: "#2a2a2a",
        codeFoldGutterBackground: "#262626",
        codeFoldBackground: "#262626",
        emptyLineBackground: "#1a1a1a",
        gutterColor: "#838383",
        addedGutterColor: "#8c8c8c",
        removedGutterColor: "#8c8c8c",
        codeFoldContentColor: "#a9a9a9",
        diffViewerTitleBackground: "#2a2a2a",
        diffViewerTitleColor: "#fff",
        diffViewerTitleBorderColor: "#353535"
      }
    },
    // Add custom styles for the diff viewer
    line: {
      padding: "4px 2px",
      '&:hover': {
        background: "#2a2a2a"
      }
    },
    content: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: "13px",
      lineHeight: "1.5",
      padding: "0 10px"
    },
    gutter: {
      padding: "0 10px",
      minWidth: "60px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: "13px",
      lineHeight: "1.5",
      textAlign: "right" as const,
      background: "#1a1a1a",
      '&:hover': {
        background: "#262626"
      }
    },
    codeFold: {
      padding: "0 10px",
      height: "100%",
      background: "#262626"
    }
  };

  const currentDiff = diffs[activeFileIndex];

  // Parse the diff string into oldValue and newValue
  const parseDiffToOldNew = (diffStr: string = "") => {
    if (!diffStr) return { oldValue: "", newValue: "" };
    
    const oldLines: string[] = [];
    const newLines: string[] = [];
    
    // Split by lines and process each line
    const lines = diffStr.split("\n");
    
    for (const line of lines) {
      // Skip empty lines
      if (!line) continue;
      
      const content = line.substring(1); // Remove the first character (the diff marker)
      
      if (line.startsWith("+")) {
        // Added line - only goes in new
        newLines.push(content);
      } else if (line.startsWith("-")) {
        // Removed line - only goes in old
        oldLines.push(content);
      } else if (line.startsWith(" ")) {
        // Unchanged line - goes in both
        oldLines.push(content);
        newLines.push(content);
      }
    }
    
    return {
      oldValue: oldLines.join("\n"),
      newValue: newLines.join("\n")
    };
  };

  const { oldValue, newValue } = parseDiffToOldNew(currentDiff.diff);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-[90vw] h-[90vh] bg-card rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Preview Changes</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Tabs */}
        <div className="flex overflow-x-auto border-b border-border">
          {diffs.map((diff, index) => (
            <button
              key={diff.file_path}
              onClick={() => setActiveFileIndex(index)}
              className={`px-4 py-2 min-w-fit whitespace-nowrap ${
                index === activeFileIndex
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {diff.file_path} ({diff.file_operation})
            </button>
          ))}
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-auto p-4">
          {currentDiff.error ? (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-destructive">{currentDiff.error}</p>
            </div>
          ) : currentDiff.file_operation === "DELETE" ? (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-destructive font-semibold">This file will be deleted</p>
              {currentDiff.file_summary && (
                <p className="mt-2 text-muted-foreground">{currentDiff.file_summary}</p>
              )}
            </div>
          ) : (
            <>
              {currentDiff.file_summary && (
                <p className="mb-4 text-muted-foreground">{currentDiff.file_summary}</p>
              )}
              <div className="border border-border rounded-lg overflow-hidden">
                <ReactDiffViewer
                  oldValue={oldValue}
                  newValue={newValue}
                  splitView={true}
                  useDarkTheme={true}
                  styles={darkTheme}
                  leftTitle="Old"
                  rightTitle="New"
                  hideLineNumbers={false}
                  showDiffOnly={false}
                  extraLinesSurroundingDiff={3}
                  renderContent={(str: string) => {
                    if (!str) return null;
                    return str.split('\n').map((line, i) => (
                      <span key={i} className="whitespace-pre">{line || ' '}</span>
                    ));
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiffModal;