import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckSquare,
  ChevronDown,
  FileText,
  ListTodo,
  Lock,
  LockOpen,
  Minus,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Folder, getFolderColor, Note, NoteBlock, NoteFolder, NoteTaskData, Task } from '../types/todo';
import { pluralizeRu } from '../utils/dateUtils';
import { getNoteBlockStats } from '../utils/noteUtils';
import { RichNoteEditor } from './RichNoteEditor';

interface NotesViewProps {
  notes: Note[];
  selectedNote: Note | null;
  noteFolders: NoteFolder[];
  noteFoldersById: Map<string, NoteFolder>;
  taskFolders: Folder[];
  activeNoteFolderId: string;
  searchQuery: string;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  nowMs: number;
  onSearchChange: (q: string) => void;
  onRequestOpenNote: (note: Note) => void;
  onOpenLockSettings: (note: Note) => void;
  onCloseNote: () => void;
  onCreateNote: () => void;
  onUpdateNote: (
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'blocks' | 'folderId' | 'pinned'>>
  ) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onDeleteNotes: (noteIds: string[]) => void;
  onAddTaskFromNote: (taskData: NoteTaskData, folderId: string | null) => Task | null;
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
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return 'Пустая заметка';
  return lines.slice(0, 2).join(' · ');
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  selectedNote,
  noteFolders,
  noteFoldersById,
  taskFolders,
  activeNoteFolderId,
  searchQuery,
  searchInputRef,
  nowMs,
  onSearchChange,
  onRequestOpenNote,
  onOpenLockSettings,
  onCloseNote,
  onCreateNote,
  onUpdateNote,
  onTogglePin,
  onDeleteNote,
  onDeleteNotes,
  onAddTaskFromNote,
  focusTitleSignal,
}) => {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // Prune any selected IDs that are no longer visible in the current filtered notes
  const visibleIdKey = useMemo(() => notes.map((n) => n.id).join('|'), [notes]);
  useEffect(() => {
    const valid = new Set(notes.map((n) => n.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [visibleIdKey, notes]);

  useEffect(() => {
    if (focusTitleSignal > 0 && selectedNote) {
      titleInputRef.current?.focus();
    }
  }, [focusTitleSignal, selectedNote]);

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected = notes.length > 0 && selectedIds.size === notes.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < notes.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notes.map((n) => n.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    onDeleteNotes(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  // MODE 2: Inside an open (unlocked) note
  if (selectedNote) {
    const charCount = selectedNote.content.length;
    const wordCount = selectedNote.content.trim().split(/\s+/).filter(Boolean).length;
    const isLocked = Boolean(selectedNote.lock);

    return (
      <div className="flex min-h-[600px] flex-col overflow-hidden rounded-xl border border-slate-800/90 bg-[#161F31]/95">
        {/* Top bar: Exit to general field + Folder + Lock + Pin + Delete */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onCloseNote}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0D1424] px-3 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Все заметки</span>
            </button>

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
              onClick={() => onOpenLockSettings(selectedNote)}
              title={isLocked ? 'Настройки пароля и Touch ID' : 'Поставить пароль на заметку'}
              aria-label={isLocked ? 'Настройки пароля' : 'Поставить пароль'}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                isLocked
                  ? 'bg-amber-500/18 text-amber-300 ring-1 ring-inset ring-amber-500/35 hover:bg-amber-500/25'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {isLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isLocked ? 'Пароль включён' : 'Пароль'}</span>
            </button>

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

        {/* Editable note title */}
        <div className="px-6 pt-3 pb-3">
          <input
            ref={titleInputRef}
            type="text"
            value={selectedNote.title}
            onChange={(e) => onUpdateNote(selectedNote.id, { title: e.target.value })}
            placeholder="Заголовок заметки..."
            aria-label="Заголовок заметки"
            className="w-full bg-transparent font-display text-2xl font-bold tracking-tight text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />
        </div>

        {/* Rich Block Editor */}
        <RichNoteEditor
          noteId={selectedNote.id}
          blocks={selectedNote.blocks}
          taskFolders={taskFolders}
          nowMs={nowMs}
          onChangeBlocks={(nextBlocks: NoteBlock[]) =>
            onUpdateNote(selectedNote.id, { blocks: nextBlocks })
          }
          onAddTaskToMainList={onAddTaskFromNote}
        />

        {/* Quiet editor footer */}
        <div className="flex items-center justify-between border-t border-slate-800/70 px-6 py-2.5 font-mono text-[11px] text-slate-500 tabular-nums">
          <span>
            {isLocked
              ? 'Заметка автоматически заблокируется при выходе · Esc — к списку заметок'
              : 'Сохраняется автоматически · Esc — к списку заметок'}
          </span>
          <span>
            {wordCount} слов · {charCount} символов
          </span>
        </div>
      </div>
    );
  }

  // MODE 1: General Notes Overview Field (outside of any individual note)
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

      {/* Bulk selection bar */}
      {notes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-[#131C2E]/65 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={allSelected ? true : someSelected ? 'mixed' : false}
              onClick={handleToggleSelectAll}
              className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-200 transition-colors hover:text-white"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                  allSelected || someSelected
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-slate-600 bg-slate-900/80 hover:border-slate-400'
                }`}
              >
                {allSelected ? (
                  <Check className="pointer-events-none h-3 w-3 stroke-[3]" />
                ) : someSelected ? (
                  <Minus className="pointer-events-none h-3 w-3 stroke-[3]" />
                ) : null}
              </span>
              <span>{allSelected ? 'Снять выделение со всех' : 'Выделить все'}</span>
            </button>

            {selectedIds.size > 0 && (
              <span className="font-mono text-xs text-blue-300 tabular-nums">
                Выбрано: {selectedIds.size} из {notes.length}
              </span>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="h-8 rounded-lg px-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                Отменить выбор
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500/20 px-3 text-xs font-semibold text-red-300 ring-1 ring-inset ring-red-500/35 transition-colors hover:bg-red-500/30 whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Удалить ({selectedIds.size})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notes grid or empty state */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#131C2E]/45 px-6 py-16 text-center">
          <FileText className="h-8 w-8 text-slate-600" />
          <p className="mt-3 font-display text-base font-semibold text-slate-200">
            {searchQuery.trim() ? 'Заметки не найдены' : 'В этом разделе пока нет заметок'}
          </p>
          <p className="mt-1.5 max-w-md text-sm text-slate-400">
            {searchQuery.trim()
              ? 'Попробуйте изменить запрос или очистить поиск.'
              : 'Нажмите «Новая заметка» или клавишу N, чтобы создать первую заметку с форматированием и встроенными задачами.'}
          </p>
          <div className="mt-5">
            {searchQuery.trim() ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Сбросить поиск</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCreateNote}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-400"
              >
                <Plus className="h-4 w-4" />
                <span>Создать заметку</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-12 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => {
            const isChecked = selectedIds.has(note.id);
            const isLocked = Boolean(note.lock);
            const folder = note.folderId ? noteFoldersById.get(note.folderId) : undefined;
            const folderColor = getFolderColor(folder?.color);
            const stats = isLocked ? null : getNoteBlockStats(note.blocks);

            return (
              <article
                key={note.id}
                onClick={() => onRequestOpenNote(note)}
                className={`group relative flex min-h-[168px] cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all duration-150 ${
                  isChecked
                    ? 'border-blue-500/60 bg-blue-500/[0.08] ring-1 ring-inset ring-blue-500/25'
                    : isLocked
                      ? 'border-amber-500/30 bg-[#161F31]/95 hover:border-amber-400/50 hover:bg-[#192338]'
                      : 'border-slate-800/90 bg-[#161F31]/95 hover:border-slate-700 hover:bg-[#192338]'
                }`}
              >
                <div>
                  {/* Card header: top-left checkbox square + title + lock/pin/delete */}
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      aria-label={`Выбрать заметку ${note.title || 'Без названия'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectId(note.id);
                      }}
                      className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
                        isChecked
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-slate-600 bg-[#0D1424]/90 hover:border-blue-400'
                      }`}
                    >
                      {isChecked && <Check className="pointer-events-none h-3 w-3 stroke-[3]" />}
                    </button>

                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      {isLocked && (
                        <Lock
                          className="h-3.5 w-3.5 shrink-0 text-amber-400"
                          aria-label="Защищена паролем"
                        />
                      )}
                      <h3 className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold text-slate-100">
                        {note.title.trim() || 'Без названия'}
                      </h3>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenLockSettings(note);
                          }}
                          title="Поставить пароль на заметку"
                          aria-label="Поставить пароль на заметку"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 opacity-0 transition-colors hover:bg-slate-800 hover:text-amber-300 group-hover:opacity-100"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(note.id);
                        }}
                        title={note.pinned ? 'Открепить' : 'Закрепить'}
                        aria-label={note.pinned ? 'Открепить заметку' : 'Закрепить заметку'}
                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                          note.pinned
                            ? 'text-amber-400 hover:bg-amber-500/15'
                            : 'text-slate-500 opacity-0 hover:bg-slate-800 hover:text-slate-200 group-hover:opacity-100'
                        }`}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                        title="Удалить заметку"
                        aria-label="Удалить заметку"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 opacity-0 transition-colors hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body area: strictly hidden when locked, preview shown when unlocked */}
                  {isLocked ? (
                    <div className="mt-4 flex items-center gap-2 pl-7 text-xs text-slate-500">
                      <Lock className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                      <span>Содержимое скрыто · введите пароль или Touch ID</span>
                    </div>
                  ) : (
                    <p className="mt-2.5 line-clamp-3 pl-7 text-xs leading-relaxed text-slate-400">
                      {getPreviewLine(note.content)}
                    </p>
                  )}
                </div>

                {/* Card footer metadata */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2.5 pl-7 text-[11px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-slate-500 tabular-nums">
                      {formatNoteTimestamp(note.updatedAt)}
                    </span>

                    {activeNoteFolderId === 'all' && folder && (
                      <>
                        <span className="text-slate-700" aria-hidden="true">
                          ·
                        </span>
                        <span className={`font-medium ${folderColor.textClass}`}>
                          {folder.name}
                        </span>
                      </>
                    )}
                  </div>

                  {stats && (stats.checklistTotal > 0 || stats.taskTotal > 0) && (
                    <div className="flex items-center gap-2.5 font-mono text-slate-400 tabular-nums">
                      {stats.checklistTotal > 0 && (
                        <span className="inline-flex items-center gap-1" title="Пункты чек-листа">
                          <CheckSquare className="h-3 w-3 text-emerald-500" />
                          <span>
                            {stats.checklistDone}/{stats.checklistTotal}
                          </span>
                        </span>
                      )}
                      {stats.taskTotal > 0 && (
                        <span className="inline-flex items-center gap-1" title="Задачи внутри заметки">
                          <ListTodo className="h-3 w-3 text-blue-400" />
                          <span>
                            {pluralizeRu(stats.taskTotal, 'задача', 'задачи', 'задач')}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
