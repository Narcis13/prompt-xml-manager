/**
 * @file PromptDisplay.tsx
 * @description Shows the currently selected prompt or, if "Apply Changes" is selected, shows the ApplyChangesForm.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { PromptData } from '../lib/constants';
import { useLocalStorage } from '../lib/hooks/useLocalStorage';
import Modal from './Modal';
import ApplyChangesForm from './ApplyChangesForm';

interface PromptDisplayProps {
  promptData: PromptData;
}

function getPlaceholders(template: string): string[] {
  const regex = /{{(.*?)}}/g;
  const matches = [...template.matchAll(regex)];
  return matches.map((m) => m[1]);
}

function compileTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    return values[key] !== undefined ? values[key] : '';
  });
}

const PromptDisplay: React.FC<PromptDisplayProps> = ({ promptData }) => {
  const [isMounted, setIsMounted] = useState(false);

  // For all normal prompts
  const placeholders = getPlaceholders(promptData.template);
  const storageKey = `prompt-${promptData.name}-vars`;
  const [savedValues, setSavedValues] = useLocalStorage<Record<string, string>>(
    storageKey,
    {}
  );
  const [values, setValues] = useState<Record<string, string>>(savedValues);
  const [copied, setCopied] = useState(false);

  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setValues(savedValues);
  }, [savedValues]);

  if (!isMounted) {
    return <div className="w-full h-full"></div>;
  }

  // If this is the "Apply Changes" step, show the XML form
  if (promptData.name === 'Apply Changes') {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <ApplyChangesForm />
      </div>
    );
  }

  // Standard prompt display flow
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">{promptData.name}</h1>
      
      {promptData.name === 'Apply Changes' ? (
        <div className="max-w-4xl mx-auto">
          <ApplyChangesForm />
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {placeholders.map((placeholder) => (
              <div
                key={placeholder}
                className="bg-card rounded-lg p-4 hover:bg-secondary transition-colors cursor-pointer group border border-border/50"
                onClick={() => setActiveModal(placeholder)}
              >
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground">{placeholder}</label>
                  <button
                    className="text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModal(placeholder);
                    }}
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-2 text-muted-foreground line-clamp-2 text-sm">
                  {values[placeholder] || 'Click to edit...'}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center mt-8 sticky bottom-4 bg-card border border-border/50 p-4 rounded-lg shadow-lg backdrop-blur-sm">
            <div className="text-sm text-muted-foreground">
              {copied ? 'Copied to clipboard!' : 'Click to copy the complete prompt'}
            </div>
            <button
              onClick={handleCopy}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2 shadow-lg shadow-primary/20"
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
            <div className="text-sm text-muted-foreground mb-2">Preview:</div>
            <pre className="p-4 bg-card border border-border/50 rounded-lg whitespace-pre-wrap text-muted-foreground text-sm">
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
        </>
      )}
    </div>
  );
};

export default PromptDisplay;