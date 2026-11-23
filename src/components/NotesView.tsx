import React, { useEffect, useRef } from 'react';
import {
  ChevronDown,
  FileText,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { getFolderColor, Note, NoteFolder } from '../types/todo';

interface NotesViewProps {
  notes: Note[];
  selectedNote: Note | null;
  noteFolders: NoteFolder[];
  noteFoldersById: Map<string, NoteFolder>;
  activeNoteFolderId: string;
  searchQuery: string;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (q: string) => void;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onUpdateNote: (
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'content' | 'folderId' | 'pinned'>>
  ) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  focusTitleSignal: number;
}

function formatNoteTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPreviewLine(content: string): string {
  const firstNonEmpty = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return firstNonEmpty || 'Пустая заметка';
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  selectedNote,
  noteFolders,
  noteFoldersById,
  activeNoteFolderId,
  searchQuery,
  searchInputRef,
  onSearchChange,
  onSelectNote,
  onCreateNote,
  onUpdateNote,
  onTogglePin,
  onDeleteNote,
  focusTitleSignal,
}) => {
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (focusTitleSignal > 0) {
      titleInputRef.current?.focus();
    }
  }, [focusTitleSignal]);

  const charCount = selectedNote ? selectedNote.content.length : 0;
  const wordCount = selectedNote
    ? selectedNote.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="space-y-4">
      {/* Top Notes search & create toolbar */}
      <div className="rounded-xl border border-slate-800/90 bg-[#131C2E]/85 p-2.5 backdrop-blur-xs">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Поиск по заметкам и папкам..."
              aria-label="Поиск по заметкам"
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#0D1424] pr-14 pl-10 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Очистить поиск по заметкам"
                className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] text-slate-500">
                ⌘K
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onCreateNote}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-400 active:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B111E] whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Новая заметка</span>
          </button>
        </div>
      </div>

      {/* macOS split-pane Notes layout */}
      <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-xl border border-slate-800/90 bg-[#161F31]/90 lg:grid-cols-12">
        {/* Left notes list */}
        <div className="flex flex-col border-b border-slate-800/80 bg-[#121A2B]/80 lg:col-span-4 lg:border-r lg:border-b-0">
          {notes.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">
              <FileText className="h-7 w-7 text-slate-600" />
              <p className="mt-3 font-display text-sm font-semibold text-slate-200">
                {searchQuery.trim() ? 'Заметки не найдены' : 'Здесь пока нет заметок'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {searchQuery.trim()
                  ? 'Попробуйте изменить запрос или очистить поиск.'
                  : 'Нажмите «Новая заметка» или клавишу N, чтобы начать.'}
              </p>
              <div className="mt-4">
                {searchQuery.trim() ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Сбросить поиск</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onCreateNote}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-500 px-3 text-xs font-semibold text-white hover:bg-blue-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Создать заметку</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="max-h-[300px] flex-1 divide-y divide-slate-800/60 overflow-y-auto lg:max-h-[640px]">
              {notes.map((note) => {
                const isSelected = selectedNote?.id === note.id;
                const folder = note.folderId ? noteFoldersById.get(note.folderId) : undefined;
                const folderColor = getFolderColor(folder?.color);

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => onSelectNote(note.id)}
                    className={`flex w-full flex-col gap-1 px-4 py-3.5 text-left transition-colors duration-150 ${
                      isSelected
                        ? 'bg-blue-500/16 text-slate-100'
                        : 'text-slate-300 hover:bg-slate-800/45'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-display text-sm font-semibold text-slate-100">
                        {note.title.trim() || 'Без названия'}
                      </span>
                      {note.pinned && (
                        <Pin className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-label="Закреплена" />
                      )}
                    </div>

                    <p className="line-clamp-1 text-xs text-slate-400">
                      {getPreviewLine(note.content)}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      <span className="font-mono text-slate-500 tabular-nums">
                        {formatNoteTimestamp(note.updatedAt)}
                      </span>
                      {activeNoteFolderId === 'all' && folder && (
                        <>
                          <span className="text-slate-700" aria-hidden="true">
                            ·
                          </span>
                          <span className={`truncate font-medium ${folderColor.textClass}`}>
                            {folder.name}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right distraction-free note editor */}
        <div className="flex flex-col lg:col-span-8">
          {selectedNote ? (
            <>
              {/* Editor toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <select
                      value={selectedNote.folderId ?? ''}
                      onChange={(e) =>
                        onUpdateNote(selectedNote.id, { folderId: e.target.value || null })
                      }
                      aria-label="Папка заметки"
                      className="h-8 appearance-none rounded-lg border border-slate-800 bg-[#0D1424] pr-7 pl-2.5 text-xs text-slate-200 transition-colors focus:border-blue-500/60 focus:outline-none"
                    >
                      <option value="">Без папки</option>
                      {noteFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  </div>

                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    Изменено {formatNoteTimestamp(selectedNote.updatedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onTogglePin(selectedNote.id)}
                    title={selectedNote.pinned ? 'Открепить заметку' : 'Закрепить сверху'}
                    aria-label={selectedNote.pinned ? 'Открепить заметку' : 'Закрепить заметку'}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      selectedNote.pinned
                        ? 'bg-amber-500/18 text-amber-300 ring-1 ring-inset ring-amber-500/35 hover:bg-amber-500/25'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <Pin className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteNote(selectedNote.id)}
                    title="Удалить заметку"
                    aria-label="Удалить заметку"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Editor body */}
              <div className="flex flex-1 flex-col px-6 py-5">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => onUpdateNote(selectedNote.id, { title: e.target.value })}
                  placeholder="Заголовок заметки..."
                  aria-label="Заголовок заметки"
                  className="w-full bg-transparent font-display text-2xl font-bold tracking-tight text-slate-100 placeholder:text-slate-600 focus:outline-none"
                />

                <textarea
                  value={selectedNote.content}
                  onChange={(e) => onUpdateNote(selectedNote.id, { content: e.target.value })}
                  placeholder="Начните писать заметку, конспект или список идей..."
                  aria-label="Текст заметки"
                  className="mt-4 min-h-[380px] flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              {/* Quiet editor footer */}
              <div className="flex items-center justify-between border-t border-slate-800/70 px-6 py-2.5 font-mono text-[11px] text-slate-500 tabular-nums">
                <span>Сохраняется автоматически</span>
                <span>
                  {wordCount} слов · {charCount} символов
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <FileText className="h-9 w-9 text-slate-700" />
              <p className="mt-3 font-display text-base font-semibold text-slate-300">
                Выберите заметку или создайте новую
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Организуйте конспекты и идеи по папкам слева, а поиск по всем заметкам доступен по ⌘K.
              </p>
              <button
                type="button"
                onClick={onCreateNote}
                className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-400"
              >
                <Plus className="h-4 w-4" />
                <span>Новая заметка</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
