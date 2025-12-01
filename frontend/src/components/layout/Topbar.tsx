'use client';

import { Menu, Bell, ChevronDown } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  return (
    <header className="h-16 bg-white dark:bg-surface-dark border-b border-border-light dark:border-border-dark sticky top-0 z-30">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center space-x-4">
          {/* Menu Button (Mobile) */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Page Title */}
          {title && (
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h1>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">U</span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-300 hidden sm:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
