/**
 * @file Sidebar.tsx
 * @description Navigation sidebar showing the different prompt steps
 * with an enhanced visual design using orange highlights.
 */

import React from 'react';
import { PromptData } from '../lib/constants';

interface SidebarProps {
  prompts: PromptData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ prompts, selectedIndex, onSelect }) => {
  return (
    <nav className="w-64 border-r border-border bg-card/50 backdrop-blur-sm">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          01 PRO STEPS
        </h2>
        <div className="space-y-1.5">
          {prompts.map((prompt, index) => (
            <button
              key={prompt.name}
              onClick={() => onSelect(index)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                selectedIndex === index
                  ? 'bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <div className="flex items-center">
                <span 
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-sm mr-3 
                    ${selectedIndex === index 
                      ? 'bg-primary-foreground/20 text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground'}`}
                >
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{prompt.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;