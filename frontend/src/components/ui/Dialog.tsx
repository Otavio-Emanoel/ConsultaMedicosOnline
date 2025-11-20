import React from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 min-w-[320px] relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
          onClick={() => onOpenChange(false)}
          aria-label="Fechar"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

Dialog.Content = function Content({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
};

Dialog.Title = function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{children}</h2>;
};

export { Dialog };
