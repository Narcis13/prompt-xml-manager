/**
 * @file Sidebar.tsx
 * @description Navigation sidebar showing the different prompt steps
 * with an enhanced visual design.
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
    <nav className="w-64 border-r border-gray-800 bg-gray-900/50 backdrop-blur-sm">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          01 Pro Steps
        </h2>
        <div className="space-y-1">
          {prompts.map((prompt, index) => (
            <button
              key={prompt.name}
              onClick={() => onSelect(index)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                selectedIndex === index
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="flex items-center">
                <span className="w-6 h-6 flex items-center justify-center rounded-full text-sm mr-3 bg-gray-800 text-gray-300">
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