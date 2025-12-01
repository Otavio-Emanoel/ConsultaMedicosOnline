'use client';

import { Menu, Bell } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  
  const nomeUsuario = typeof window !== 'undefined' ? (localStorage.getItem('nomeUsuario') || 'Usuário') : 'Usuário';
  // Busca o nome do usuário logado salvo em localStorage.user (JSON)
  let letra = 'U';
  if (typeof window !== 'undefined') {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.name) {
          letra = user.name.trim()[0]?.toUpperCase() || 'U';
        }
      }
    } catch {}
  }

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
