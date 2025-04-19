// =========================
// CLIENT COMPONENT (Reusable Modal)
// =========================
/**
 * @file Modal.tsx
 * @description Modal is a reusable client component for editing text in a popup.
 * It is used for editing prompt variables in PromptDisplay.
 *
 * Key Next.js concepts:
 * - Client Components: Use React hooks, browser APIs, and interactivity.
 * - Reusability: Can be used anywhere a modal is needed.
 */

import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onChange: (value: string) => void;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  value,
  onChange,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus textarea when modal opens
      textareaRef.current?.focus();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-card border border-border/50 rounded-lg p-6 w-full max-w-2xl transform transition-all duration-200 ease-in-out shadow-xl"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-64 p-4 bg-secondary text-foreground rounded-lg resize-none border border-border/50 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          placeholder="Enter your text here..."
        />
        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary-600 transition-colors shadow-lg shadow-primary/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;