import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], alt: 'Ctrl + K', label: 'Фокус на поиск (задачи или заметки)' },
  { keys: ['N'], alt: '⌘ ⇧ N', label: 'Создать новую задачу или заметку' },
  { keys: ['1'], alt: null, label: 'Переключить на «Список»' },
  { keys: ['2'], alt: null, label: 'Переключить на «Календарь»' },
  { keys: ['3'], alt: null, label: 'Переключить на «Заметки»' },
  { keys: ['⌘', 'B / I / U'], alt: null, label: 'Жирный / курсив / подчёркнутый в заметке' },
  { keys: ['?'], alt: null, label: 'Показать или скрыть эту справку' },
  { keys: ['Esc'], alt: null, label: 'Закрыть окно или выйти к списку заметок' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#141D2F] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Keyboard className="h-4 w-4 text-blue-400" />
            <h2 id="shortcuts-modal-title" className="font-display text-base font-semibold text-slate-100">
              Горячие клавиши
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-800/70 px-5 py-2">
          {SHORTCUTS.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span className="text-slate-300">{item.label}</span>
              <div className="flex shrink-0 items-center gap-1">
                {item.keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex min-w-6 items-center justify-center rounded-md border border-slate-700 bg-[#0D1424] px-1.5 py-0.5 font-mono text-xs font-medium text-slate-200"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800/80 px-5 py-3 text-xs text-slate-400">
          Одиночные клавиши работают, когда курсор не находится в поле ввода.
        </div>
      </div>
    </div>
  );
};
