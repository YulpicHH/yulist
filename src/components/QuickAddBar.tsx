import React, { useEffect, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Folder } from '../types/todo';
import { combineDueDate } from '../utils/dateUtils';

interface QuickAddBarProps {
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  folders: Folder[];
  activeFolderId: string;
  prefillDate?: string | null;
  onClearPrefillDate?: () => void;
  onAddTask: (payload: {
    title: string;
    folderId: string | null;
    dueDate: string | null;
  }) => void;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  titleInputRef,
  folders,
  activeFolderId,
  prefillDate,
  onClearPrefillDate,
  onAddTask,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('23:59');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(() =>
    activeFolderId !== 'all' ? activeFolderId : folders[0]?.id ?? ''
  );

  // Sync folder dropdown whenever user switches active folder in sidebar
  useEffect(() => {
    if (activeFolderId !== 'all') {
      setSelectedFolderId(activeFolderId);
    } else if (!selectedFolderId && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }
  }, [activeFolderId, folders, selectedFolderId]);

  // Ensure selectedFolderId still exists if folders are deleted
  useEffect(() => {
    if (selectedFolderId && !folders.some((f) => f.id === selectedFolderId)) {
      setSelectedFolderId(folders[0]?.id ?? '');
    }
  }, [folders, selectedFolderId]);

  // Apply prefilled date when triggered from Calendar view
  useEffect(() => {
    if (prefillDate) {
      setDate(prefillDate);
      if (!time) setTime('23:59');
      titleInputRef.current?.focus();
      onClearPrefillDate?.();
    }
  }, [prefillDate, onClearPrefillDate, time, titleInputRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      titleInputRef.current?.focus();
      return;
    }

    onAddTask({
      title: trimmed,
      folderId: selectedFolderId || null,
      dueDate: combineDueDate(date, time),
    });

    setTitle('');
    setDate('');
    setTime('23:59');
    titleInputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12"
    >
      {/* Task title input */}
      <div className="relative sm:col-span-2 lg:col-span-4">
        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новая задача..."
          aria-label="Название новой задачи"
          className="h-10 w-full rounded-lg border border-slate-800 bg-[#131C2E]/90 pr-9 pl-3.5 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-blue-500/60 focus:bg-[#0D1424] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {!title && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] text-slate-500">
            N
          </span>
        )}
      </div>

      {/* Exact date & time inputs */}
      <div className="grid grid-cols-12 gap-2 sm:col-span-2 lg:col-span-4">
        <div className="col-span-7">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Дата дедлайна"
            title="Дата дедлайна"
            className="h-10 w-full rounded-lg border border-slate-800 bg-[#131C2E]/90 px-3 font-mono text-xs text-slate-200 tabular-nums transition-colors focus:border-blue-500/60 focus:bg-[#0D1424] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="col-span-5">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={!date}
            aria-label="Точное время дедлайна"
            title={date ? 'Точное время дедлайна' : 'Сначала выберите дату'}
            className="h-10 w-full rounded-lg border border-slate-800 bg-[#131C2E]/90 px-2.5 font-mono text-xs text-slate-200 tabular-nums transition-colors focus:border-blue-500/60 focus:bg-[#0D1424] focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-45"
          />
        </div>
      </div>

      {/* Folder dropdown */}
      <div className="relative sm:col-span-1 lg:col-span-2">
        <select
          value={selectedFolderId}
          onChange={(e) => setSelectedFolderId(e.target.value)}
          aria-label="Папка для задачи"
          className="h-10 w-full appearance-none rounded-lg border border-slate-800 bg-[#131C2E]/90 pr-8 pl-3 text-sm text-slate-200 transition-colors focus:border-blue-500/60 focus:bg-[#0D1424] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Без папки</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>

      {/* Submit primary CTA */}
      <div className="sm:col-span-1 lg:col-span-2">
        <button
          type="submit"
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-400 active:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B111E] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Добавить</span>
        </button>
      </div>
    </form>
  );
};
