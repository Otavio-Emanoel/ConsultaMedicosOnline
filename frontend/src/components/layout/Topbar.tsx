'use client';

import { useEffect, useState } from 'react';
import { Menu, Bell } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  // Evita hydration mismatch: inicia com 'U' e atualiza após mount
  const [letra, setLetra] = useState<string>('U');
  useEffect(() => {
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (userStr) {
        const user = JSON.parse(userStr || '{}');
        if (user?.name && typeof user.name === 'string' && user.name.trim().length > 0) {
          setLetra(user.name.trim()[0].toUpperCase());
        }
      } else {
        const nomeUsuario = typeof window !== 'undefined' ? localStorage.getItem('nomeUsuario') : null;
        if (nomeUsuario && nomeUsuario.trim().length > 0) {
          setLetra(nomeUsuario.trim()[0].toUpperCase());
        }
      }
    } catch {}
  }, []);

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

          {/* User Icon */}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">{letra}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
