import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { ToastNotice } from '../hooks/useYulistStore';

interface UndoToastProps {
  toast: ToastNotice | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ toast, onUndo, onDismiss }) => {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-5 bottom-5 z-50 flex items-center gap-3 rounded-xl border border-slate-700/90 bg-[#162033]/95 px-4 py-3 text-sm text-slate-100 shadow-2xl backdrop-blur-md no-print"
    >
      <span>{toast.message}</span>

      {toast.canUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-500/30"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Отменить</span>
        </button>
      )}

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Закрыть уведомление"
        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
