/**
 * @file PromptDisplay.tsx
 * @description Shows the currently selected prompt, allows user to input variable values,
 * assembles the final prompt text, and provides a copy-to-clipboard feature.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { PromptData } from '../lib/constants';
import { useLocalStorage } from '../lib/hooks/useLocalStorage';
import Modal from './Modal';

interface PromptDisplayProps {
  promptData: PromptData;
}

/**
 * Simple helper function to find placeholders in the template.
 * Looks for {{SOMETHING}} patterns.
 */
function getPlaceholders(template: string): string[] {
  const regex = /{{(.*?)}}/g;
  const matches = [...template.matchAll(regex)];
  return matches.map((m) => m[1]);
}

/**
 * Replaces placeholders with the user-supplied values or blank if missing
 */
function compileTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    return values[key] !== undefined ? values[key] : '';
  });
}

const PromptDisplay: React.FC<PromptDisplayProps> = ({ promptData }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const placeholders = getPlaceholders(promptData.template);

  const storageKey = `prompt-${promptData.name}-vars`;
  const [savedValues, setSavedValues] = useLocalStorage<Record<string, string>>(
    storageKey,
    {}
  );

  const [values, setValues] = useState<Record<string, string>>(savedValues);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setValues(savedValues);
  }, [savedValues]);

  const handleChangeValue = (placeholder: string, newValue: string) => {
    const newValues = { ...values, [placeholder]: newValue };
    setValues(newValues);
    setSavedValues(newValues);
  };

  const handleCopy = async () => {
    const text = compileTemplate(promptData.template, values);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isMounted) {
    return <div className="w-full h-full"></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">{promptData.name}</h1>
      
      <div className="grid gap-4">
        {placeholders.map((placeholder) => (
          <div
            key={placeholder}
            className="bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors cursor-pointer group"
            onClick={() => setActiveModal(placeholder)}
          >
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300">{placeholder}</label>
              <button
                className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModal(placeholder);
                }}
              >
                Edit
              </button>
            </div>
            <div className="mt-2 text-gray-400 line-clamp-2 text-sm">
              {values[placeholder] || 'Click to edit...'}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center mt-8 sticky bottom-4 bg-gray-900 p-4 rounded-lg shadow-lg">
        <div className="text-sm text-gray-400">
          {copied ? 'Copied to clipboard!' : 'Click to copy the complete prompt'}
        </div>
        <button
          onClick={handleCopy}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <span>Copy to Clipboard</span>
          {copied && (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>
      </div>

      <div className="mt-6">
        <div className="text-sm text-gray-400 mb-2">Preview:</div>
        <pre className="p-4 bg-gray-900 rounded-lg whitespace-pre-wrap text-gray-300 text-sm">
          {compileTemplate(promptData.template, values)}
        </pre>
      </div>

      {activeModal && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={activeModal}
          value={values[activeModal] || ''}
          onChange={(newValue) => handleChangeValue(activeModal, newValue)}
        />
      )}
    </div>
  );
};

export default PromptDisplay;