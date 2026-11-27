import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bold,
  Check,
  CheckSquare,
  Clock,
  Heading2,
  Highlighter,
  Italic,
  ListOrdered,
  ListTodo,
  Palette,
  Plus,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import {
  BULLET_STYLES,
  BulletStyle,
  Folder,
  NOTE_HIGHLIGHT_COLORS,
  NOTE_TEXT_COLORS,
  NoteBlock,
  NoteTaskData,
  Task,
  TextRun,
} from '../types/todo';
import { combineDueDate, getDeadlineInfo, splitDueDate } from '../utils/dateUtils';
import {
  createBlockId,
  extractNotePlainText,
  getRunsPlainText,
  normalizeRuns,
  parseElementToRuns,
  renderRunsToElement,
} from '../utils/noteUtils';

interface RichNoteEditorProps {
  noteId: string;
  blocks: NoteBlock[];
  taskFolders: Folder[];
  nowMs: number;
  onChangeBlocks: (blocks: NoteBlock[]) => void;
  onAddTaskToMainList: (taskData: NoteTaskData, folderId: string | null) => Task | null;
}

function getBulletSymbol(style: BulletStyle | undefined): string {
  return BULLET_STYLES.find((b) => b.id === style)?.symbol ?? '•';
}

function getBulletColorClass(style: BulletStyle | undefined): string {
  switch (style) {
    case 'star':
      return 'text-amber-400';
    case 'heart':
      return 'text-rose-400';
    case 'square':
      return 'text-cyan-400';
    default:
      return 'text-blue-400';
  }
}

interface EditableTextBlockProps {
  block: NoteBlock;
  placeholder: string;
  isAllSelected: boolean;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  onFocusBlock: (id: string) => void;
  onClearAllSelected: () => void;
  onSelectAllNote: () => void;
  onDeleteAllSelected: () => void;
  onReplaceAllWithChar: (char: string) => void;
  onCopyAll: (cut: boolean) => void;
  onGetAllPlainText: () => string;
  onFormatAll: (formatKey: 'bold' | 'italic' | 'underline') => void;
  onUpdateRuns: (id: string, runs: TextRun[]) => void;
  onDeleteSingleLine: (id: string) => void;
  onEnterKey: (id: string) => void;
  onBackspaceEmpty: (id: string) => void;
  onArrowNav: (id: string, dir: 'up' | 'down') => void;
}

const EditableTextBlock: React.FC<EditableTextBlockProps> = ({
  block,
  placeholder,
  isAllSelected,
  registerRef,
  onFocusBlock,
  onClearAllSelected,
  onSelectAllNote,
  onDeleteAllSelected,
  onReplaceAllWithChar,
  onCopyAll,
  onGetAllPlainText,
  onFormatAll,
  onUpdateRuns,
  onDeleteSingleLine,
  onEnterKey,
  onBackspaceEmpty,
  onArrowNav,
}) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const lastSyncedJsonRef = useRef<string>('');
  const serializedRuns = JSON.stringify(block.runs ?? []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (lastSyncedJsonRef.current !== serializedRuns) {
      renderRunsToElement(el, block.runs);
      lastSyncedJsonRef.current = serializedRuns;
    }
  }, [block.id, serializedRuns, block.runs]);

  const handleInput = () => {
    const el = elRef.current;
    if (!el) return;
    const nextRuns = parseElementToRuns(el);
    lastSyncedJsonRef.current = JSON.stringify(nextRuns);
    onUpdateRuns(block.id, nextRuns);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Strip arbitrary HTML on paste to prevent unsafe markup injection
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain');
    if (!plain) return;
    if (isAllSelected) {
      onReplaceAllWithChar(plain.replace(/\r?\n/g, ' '));
      return;
    }
    const singleLine = plain.replace(/\r?\n/g, ' ');
    document.execCommand('insertText', false, singleLine);
    handleInput();
  };

  const handleCopy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!isAllSelected) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', onGetAllPlainText());
  };

  const handleCut = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!isAllSelected) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', onGetAllPlainText());
    onDeleteAllSelected();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    const lowerKey = e.key.toLowerCase();
    const code = e.code;

    const isKeyA = code === 'KeyA' || lowerKey === 'a' || lowerKey === 'ф';
    const isKeyC = code === 'KeyC' || lowerKey === 'c' || lowerKey === 'с';
    const isKeyX = code === 'KeyX' || lowerKey === 'x' || lowerKey === 'ч';
    const isKeyB = code === 'KeyB' || lowerKey === 'b' || lowerKey === 'и';
    const isKeyI = code === 'KeyI' || lowerKey === 'i' || lowerKey === 'ш';
    const isKeyU = code === 'KeyU' || lowerKey === 'u' || lowerKey === 'г';

    // Cmd+A / Ctrl+A: Select ALL text across the entire note (works in EN & RU keyboard layouts)
    if (mod && isKeyA) {
      e.preventDefault();
      e.stopPropagation();
      onSelectAllNote();
      return;
    }

    // Handling keys while the entire note text is selected via Cmd+A
    if (isAllSelected) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        onDeleteAllSelected();
        return;
      }
      if (mod && isKeyC) {
        e.preventDefault();
        e.stopPropagation();
        onCopyAll(false);
        return;
      }
      if (mod && isKeyX) {
        e.preventDefault();
        e.stopPropagation();
        onCopyAll(true);
        return;
      }
      if (mod && isKeyB) {
        e.preventDefault();
        onFormatAll('bold');
        return;
      }
      if (mod && isKeyI) {
        e.preventDefault();
        onFormatAll('italic');
        return;
      }
      if (mod && isKeyU) {
        e.preventDefault();
        onFormatAll('underline');
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClearAllSelected();
        return;
      }
      if (e.key.length === 1 && !mod && !e.altKey) {
        e.preventDefault();
        onReplaceAllWithChar(e.key);
        return;
      }
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        onClearAllSelected();
      }
    }

    // Cmd+Backspace (Cmd+Delete on MacBook): delete ONLY the current line, never the whole note
    if (e.metaKey && e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      const text = elRef.current?.textContent ?? '';
      if (text.length === 0) {
        onBackspaceEmpty(block.id);
      } else {
        onDeleteSingleLine(block.id);
      }
      return;
    }

    if (mod && isKeyB) {
      e.preventDefault();
      document.execCommand('bold');
      handleInput();
      return;
    }
    if (mod && isKeyI) {
      e.preventDefault();
      document.execCommand('italic');
      handleInput();
      return;
    }
    if (mod && isKeyU) {
      e.preventDefault();
      document.execCommand('underline');
      handleInput();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnterKey(block.id);
      return;
    }

    if (e.key === 'Backspace') {
      const text = elRef.current?.textContent ?? '';
      if (text.length === 0) {
        e.preventDefault();
        onBackspaceEmpty(block.id);
      }
      return;
    }

    if (e.key === 'ArrowUp' && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.anchorOffset === 0) {
        e.preventDefault();
        onArrowNav(block.id, 'up');
      }
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
      const sel = window.getSelection();
      const textLen = elRef.current?.textContent?.length ?? 0;
      if (sel && sel.isCollapsed && sel.anchorOffset >= textLen) {
        e.preventDefault();
        onArrowNav(block.id, 'down');
      }
    }
  };

  const isEmpty = getRunsPlainText(block.runs).length === 0;
  const isHeading = block.type === 'heading';
  const isChecked = block.type === 'checklist' && Boolean(block.checked);

  return (
    <div className="relative min-w-0 flex-1">
      {isEmpty && placeholder && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 select-none text-slate-600 ${
            isHeading ? 'font-display text-lg font-bold' : 'text-[15px] leading-relaxed'
          }`}
        >
          {placeholder}
        </span>
      )}
      <div
        ref={(node) => {
          elRef.current = node;
          registerRef(block.id, node);
        }}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onMouseDown={() => {
          if (isAllSelected) onClearAllSelected();
        }}
        onFocus={() => onFocusBlock(block.id)}
        onInput={handleInput}
        onBlur={handleInput}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className={`min-h-[26px] w-full rounded-sm break-words whitespace-pre-wrap transition-colors outline-none ${
          isHeading
            ? 'font-display text-lg font-bold tracking-tight text-slate-100'
            : 'text-[15px] leading-relaxed text-slate-200'
        } ${isChecked ? 'text-slate-500 line-through decoration-slate-600' : ''} ${
          isAllSelected && !isEmpty ? 'bg-blue-500/28 text-blue-50' : ''
        }`}
      />
    </div>
  );
};

interface NoteTaskBlockCardProps {
  block: NoteBlock;
  taskFolders: Folder[];
  nowMs: number;
  onUpdateTaskData: (blockId: string, next: NoteTaskData) => void;
  onDeleteBlock: (blockId: string) => void;
  onAddTaskToMainList: (taskData: NoteTaskData, folderId: string | null) => Task | null;
}

const NoteTaskBlockCard: React.FC<NoteTaskBlockCardProps> = ({
  block,
  taskFolders,
  nowMs,
  onUpdateTaskData,
  onDeleteBlock,
  onAddTaskToMainList,
}) => {
  const data = block.taskData ?? {
    title: '',
    dueDate: null,
    completed: false,
    subtasks: [],
    linkedTaskId: null,
  };

  const [addingSub, setAddingSub] = useState(false);
  const [subDraft, setSubDraft] = useState('');
  const [showSendPicker, setShowSendPicker] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string>(taskFolders[0]?.id ?? '');

  const split = splitDueDate(data.dueDate);
  const syntheticTask: Task = {
    id: block.id,
    title: data.title,
    folderId: null,
    dueDate: data.dueDate,
    completed: data.completed,
    order: 0,
    subtasks: data.subtasks,
    createdAt: '',
    completedAt: null,
  };
  const deadline = getDeadlineInfo(syntheticTask, nowMs);
  const doneSubs = data.subtasks.filter((s) => s.completed).length;

  const borderClass =
    deadline.severity === 'overdue'
      ? 'border-red-500/45 bg-red-500/[0.04]'
      : deadline.severity === 'urgent'
        ? 'border-amber-500/45 bg-amber-500/[0.04]'
        : 'border-slate-800/90 bg-[#101829]/90';

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = subDraft.trim();
    if (!trimmed) {
      setAddingSub(false);
      return;
    }
    onUpdateTaskData(block.id, {
      ...data,
      subtasks: [
        ...data.subtasks,
        { id: createBlockId('nsub'), title: trimmed, completed: false },
      ],
    });
    setSubDraft('');
  };

  const handleSendToTasks = () => {
    const safeTitle = data.title.trim() || 'Задача из заметки';
    const created = onAddTaskToMainList({ ...data, title: safeTitle }, targetFolderId || null);
    if (created) {
      onUpdateTaskData(block.id, {
        ...data,
        title: safeTitle,
        linkedTaskId: created.id,
      });
      setShowSendPicker(false);
    }
  };

  return (
    <div className={`my-2 rounded-xl border p-3.5 transition-colors ${borderClass}`}>
      {/* Header row: checkbox + editable title + actions */}
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={data.completed}
          aria-label={data.completed ? 'Снять отметку выполнения задачи' : 'Отметить задачу выполненной'}
          onClick={() => onUpdateTaskData(block.id, { ...data, completed: !data.completed })}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
            data.completed
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
              : 'border-slate-600 bg-slate-900/70 hover:border-slate-400'
          }`}
        >
          {data.completed && <Check className="pointer-events-none h-3.5 w-3.5 stroke-[2.5]" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-medium text-blue-400">Задача</span>
            {data.subtasks.length > 0 && (
              <>
                <span className="text-slate-700" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {doneSubs}/{data.subtasks.length}
                </span>
              </>
            )}
            {data.linkedTaskId && (
              <>
                <span className="text-slate-700" aria-hidden="true">
                  ·
                </span>
                <span className="text-[11px] font-medium text-emerald-400">
                  В общем списке задач
                </span>
              </>
            )}
          </div>

          <input
            type="text"
            value={data.title}
            onChange={(e) => onUpdateTaskData(block.id, { ...data, title: e.target.value })}
            placeholder="Название задачи..."
            aria-label="Название встроенной задачи"
            className={`mt-1 w-full bg-transparent text-sm font-semibold focus:outline-none ${
              data.completed ? 'text-slate-500 line-through' : 'text-slate-100 placeholder:text-slate-600'
            }`}
          />
        </div>

        <button
          type="button"
          onClick={() => onDeleteBlock(block.id)}
          title="Удалить блок задачи"
          aria-label="Удалить задачу из заметки"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Deadline date/time & live countdown row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2.5 pl-7">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={split.date}
            onChange={(e) =>
              onUpdateTaskData(block.id, {
                ...data,
                dueDate: combineDueDate(e.target.value, split.time),
              })
            }
            aria-label="Дата дедлайна задачи"
            className="h-8 rounded-md border border-slate-800 bg-[#0B111E] px-2 font-mono text-[11px] text-slate-200 tabular-nums focus:border-blue-500/60 focus:outline-none"
          />
          <input
            type="time"
            value={split.time}
            disabled={!split.date}
            onChange={(e) =>
              onUpdateTaskData(block.id, {
                ...data,
                dueDate: combineDueDate(split.date, e.target.value),
              })
            }
            aria-label="Время дедлайна задачи"
            className="h-8 rounded-md border border-slate-800 bg-[#0B111E] px-2 font-mono text-[11px] text-slate-200 tabular-nums focus:border-blue-500/60 focus:outline-none disabled:opacity-45"
          />

          {data.dueDate && (
            <span
              className={`inline-flex items-center gap-1 font-mono text-[11px] tabular-nums ${
                deadline.severity === 'completed'
                  ? 'text-emerald-400'
                  : deadline.severity === 'overdue'
                    ? 'text-red-400'
                    : deadline.severity === 'urgent'
                      ? 'text-amber-400'
                      : 'text-slate-400'
              }`}
            >
              <Clock className="h-3 w-3 shrink-0" />
              <span>{deadline.statusText}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddingSub((v) => !v)}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <Plus className="h-3 w-3" />
            <span>Подзадача</span>
          </button>

          {!data.linkedTaskId && (
            <button
              type="button"
              onClick={() => setShowSendPicker((v) => !v)}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-500/15 px-2.5 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-500/25 whitespace-nowrap"
              title="Добавить эту задачу также в раздел «Список» и «Календарь»"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>В общий список</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional folder picker when sending task to main Tasks list */}
      {showSendPicker && !data.linkedTaskId && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg bg-[#0B111E] p-2.5 pl-7">
          <span className="text-xs text-slate-400">Папка задач:</span>
          <select
            value={targetFolderId}
            onChange={(e) => setTargetFolderId(e.target.value)}
            className="h-8 rounded-md border border-slate-700 bg-[#141D2F] px-2 text-xs text-slate-200 focus:border-blue-500/60 focus:outline-none"
          >
            <option value="">Без папки</option>
            {taskFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSendToTasks}
            className="h-8 rounded-md bg-blue-500 px-3 text-xs font-semibold text-white hover:bg-blue-400"
          >
            Добавить
          </button>
          <button
            type="button"
            onClick={() => setShowSendPicker(false)}
            className="h-8 rounded-md px-2 text-xs text-slate-400 hover:text-slate-200"
          >
            Отмена
          </button>
        </div>
      )}

      {/* Embedded subtasks */}
      {(data.subtasks.length > 0 || addingSub) && (
        <div className="mt-2.5 space-y-1.5 pl-7">
          {data.subtasks.map((sub) => (
            <div key={sub.id} className="group/nsub flex items-center justify-between gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={sub.completed}
                onClick={() =>
                  onUpdateTaskData(block.id, {
                    ...data,
                    subtasks: data.subtasks.map((s) =>
                      s.id === sub.id ? { ...s, completed: !s.completed } : s
                    ),
                  })
                }
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-xs"
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                    sub.completed
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-slate-600 bg-slate-900/70 hover:border-slate-400'
                  }`}
                >
                  {sub.completed && <Check className="pointer-events-none h-2.5 w-2.5 stroke-[3]" />}
                </span>
                <span className={sub.completed ? 'text-slate-500 line-through' : 'text-slate-300'}>
                  {sub.title}
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateTaskData(block.id, {
                    ...data,
                    subtasks: data.subtasks.filter((s) => s.id !== sub.id),
                  })
                }
                aria-label="Удалить подзадачу"
                className="flex h-5 w-5 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:text-red-400 group-hover/nsub:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {addingSub && (
            <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                autoFocus
                value={subDraft}
                onChange={(e) => setSubDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setAddingSub(false);
                    setSubDraft('');
                  }
                }}
                placeholder="Подзадача и Enter..."
                className="h-7 flex-1 rounded-md border border-slate-700 bg-[#0B111E] px-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500/60 focus:outline-none"
              />
              <button
                type="submit"
                className="h-7 rounded-md bg-blue-500/20 px-2.5 text-xs font-medium text-blue-300 hover:bg-blue-500/30"
              >
                Ок
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export const RichNoteEditor: React.FC<RichNoteEditorProps> = ({
  noteId,
  blocks,
  taskFolders,
  nowMs,
  onChangeBlocks,
  onAddTaskToMainList,
}) => {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(blocks[0]?.id ?? null);
  const [openMenu, setOpenMenu] = useState<'textColor' | 'highlight' | null>(null);
  const [allTextSelected, setAllTextSelected] = useState(false);

  const editorCanvasRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingFocusIdRef = useRef<string | null>(null);

  // Reset active block & full-note selection when switching notes
  useEffect(() => {
    setActiveBlockId(blocks[0]?.id ?? null);
    setOpenMenu(null);
    setAllTextSelected(false);
  }, [noteId]);

  // Listen for macOS Electron menu Cmd+A event when focus is inside the note body
  useEffect(() => {
    const onNativeSelectAll = (ev: Event) => {
      const canvas = editorCanvasRef.current;
      const active = document.activeElement;
      if (!canvas || !active || !canvas.contains(active)) return;
      // Do not hijack Cmd+A inside an embedded task <input>
      if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') return;
      ev.preventDefault();
      setAllTextSelected(true);
      window.getSelection()?.removeAllRanges();
    };
    window.addEventListener('yulist:select-all', onNativeSelectAll);
    return () => window.removeEventListener('yulist:select-all', onNativeSelectAll);
  }, []);

  // Focus newly created or navigated block cleanly
  useEffect(() => {
    const targetId = pendingFocusIdRef.current;
    if (!targetId) return;
    const el = blockRefs.current.get(targetId);
    if (el) {
      pendingFocusIdRef.current = null;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [blocks]);

  const registerRef = (id: string, el: HTMLDivElement | null) => {
    if (el) {
      blockRefs.current.set(id, el);
    } else {
      blockRefs.current.delete(id);
    }
  };

  const syncFocusedBlockDom = () => {
    const targetId = activeBlockId;
    if (!targetId) return;
    const el = blockRefs.current.get(targetId);
    if (!el) return;
    const nextRuns = parseElementToRuns(el);
    onChangeBlocks(blocks.map((b) => (b.id === targetId ? { ...b, runs: nextRuns } : b)));
  };

  // Apply formatting across ALL text blocks when Cmd+A whole-note selection is active
  const applyFormatAcrossAllBlocks = (
    updater: (run: TextRun, allAlreadyHave: boolean) => TextRun,
    predicate?: (run: TextRun) => boolean
  ) => {
    const textRunsAll = blocks
      .filter((b) => b.type !== 'task')
      .flatMap((b) => b.runs ?? [])
      .filter((r) => r.text.length > 0);
    const allAlreadyHave =
      predicate !== undefined && textRunsAll.length > 0 && textRunsAll.every(predicate);

    const nextBlocks = blocks.map((b) => {
      if (b.type === 'task') return b;
      const runs = b.runs ?? [];
      if (runs.length === 0) return b;
      return {
        ...b,
        runs: normalizeRuns(runs.map((r) => updater(r, allAlreadyHave))),
      };
    });
    onChangeBlocks(nextBlocks);
  };

  const applyInlineCommand = (command: string, value?: string) => {
    if (allTextSelected) {
      if (command === 'bold') {
        applyFormatAcrossAllBlocks((r, has) => ({ ...r, bold: !has }), (r) => Boolean(r.bold));
      } else if (command === 'italic') {
        applyFormatAcrossAllBlocks((r, has) => ({ ...r, italic: !has }), (r) => Boolean(r.italic));
      } else if (command === 'underline') {
        applyFormatAcrossAllBlocks(
          (r, has) => ({ ...r, underline: !has }),
          (r) => Boolean(r.underline)
        );
      } else if (command === 'strikeThrough') {
        applyFormatAcrossAllBlocks((r, has) => ({ ...r, strike: !has }), (r) => Boolean(r.strike));
      } else if (command === 'foreColor' && value) {
        applyFormatAcrossAllBlocks((r) => ({ ...r, color: value }));
      } else if (command === 'removeColor') {
        applyFormatAcrossAllBlocks((r) => ({ ...r, color: undefined }));
      } else if (command === 'hiliteColor' && value) {
        applyFormatAcrossAllBlocks((r) => ({ ...r, highlight: value }));
      } else if (command === 'removeHighlight') {
        applyFormatAcrossAllBlocks((r) => ({ ...r, highlight: undefined }));
      }
      return;
    }

    const targetId = activeBlockId ?? blocks.find((b) => b.type !== 'task')?.id ?? null;
    if (!targetId) return;
    const el = blockRefs.current.get(targetId);
    if (!el) return;

    const sel = window.getSelection();
    if (!sel || !el.contains(sel.anchorNode)) {
      el.focus();
    }

    document.execCommand('styleWithCSS', false, 'true');
    if (command === 'removeColor') {
      document.execCommand('foreColor', false, '#E2E8F0');
    } else if (command === 'removeHighlight') {
      document.execCommand('hiliteColor', false, 'transparent');
    } else {
      document.execCommand(command, false, value);
    }
    syncFocusedBlockDom();
  };

  const handleSelectAllNote = () => {
    setAllTextSelected(true);
    // Clear browser single-div text selection so our unified cross-block selection highlight renders cleanly
    const sel = window.getSelection();
    sel?.removeAllRanges();
  };

  const handleDeleteAllSelected = () => {
    setAllTextSelected(false);
    const fresh: NoteBlock = { id: createBlockId(), type: 'paragraph', runs: [] };
    onChangeBlocks([fresh]);
    setActiveBlockId(fresh.id);
    pendingFocusIdRef.current = fresh.id;
  };

  const handleReplaceAllWithChar = (char: string) => {
    setAllTextSelected(false);
    const fresh: NoteBlock = {
      id: createBlockId(),
      type: 'paragraph',
      runs: char ? [{ text: char }] : [],
    };
    onChangeBlocks([fresh]);
    setActiveBlockId(fresh.id);
    pendingFocusIdRef.current = fresh.id;
  };

  const handleCopyAll = (cut: boolean) => {
    const plain = extractNotePlainText(blocks);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(plain).catch(() => {
        // Ignore clipboard permission errors
      });
    }
    if (cut) {
      handleDeleteAllSelected();
    }
  };

  const handleDeleteSingleLine = (id: string) => {
    // Deletes ONLY the text of this single line (keeping other lines untouched)
    const nextBlocks = blocks.map((b) => (b.id === id ? { ...b, runs: [] } : b));
    onChangeBlocks(nextBlocks);
    pendingFocusIdRef.current = id;
  };

  const activeBlock = blocks.find((b) => b.id === activeBlockId) ?? null;

  const setOrInsertTextBlockType = (
    nextType: 'paragraph' | 'heading' | 'bullet' | 'numbered' | 'checklist',
    bulletStyle?: BulletStyle
  ) => {
    setOpenMenu(null);

    if (allTextSelected) {
      const nextBlocks = blocks.map((b) => {
        if (b.type === 'task') return b;
        return {
          id: b.id,
          type: nextType,
          runs: b.runs ?? [],
          ...(nextType === 'bullet' ? { bulletStyle: bulletStyle ?? 'dot' } : {}),
          ...(nextType === 'checklist' ? { checked: Boolean(b.checked) } : {}),
        };
      });
      onChangeBlocks(nextBlocks);
      setAllTextSelected(false);
      return;
    }

    const idx = blocks.findIndex((b) => b.id === activeBlockId);

    if (idx !== -1 && blocks[idx].type !== 'task') {
      const current = blocks[idx];
      const isSameType =
        current.type === nextType &&
        (nextType !== 'bullet' || current.bulletStyle === bulletStyle);

      const updated: NoteBlock = isSameType
        ? { id: current.id, type: 'paragraph', runs: current.runs ?? [] }
        : {
            id: current.id,
            type: nextType,
            runs: current.runs ?? [],
            ...(nextType === 'bullet' ? { bulletStyle: bulletStyle ?? 'dot' } : {}),
            ...(nextType === 'checklist' ? { checked: Boolean(current.checked) } : {}),
          };

      const nextBlocks = [...blocks];
      nextBlocks[idx] = updated;
      onChangeBlocks(nextBlocks);
      pendingFocusIdRef.current = current.id;
      return;
    }

    // Insert a new block after active block or at the end
    const newBlock: NoteBlock = {
      id: createBlockId(),
      type: nextType,
      runs: [],
      ...(nextType === 'bullet' ? { bulletStyle: bulletStyle ?? 'dot' } : {}),
      ...(nextType === 'checklist' ? { checked: false } : {}),
    };
    const insertAt = idx !== -1 ? idx + 1 : blocks.length;
    const nextBlocks = [...blocks.slice(0, insertAt), newBlock, ...blocks.slice(insertAt)];
    onChangeBlocks(nextBlocks);
    setActiveBlockId(newBlock.id);
    pendingFocusIdRef.current = newBlock.id;
  };

  const insertEmbeddedTask = () => {
    setOpenMenu(null);
    setAllTextSelected(false);
    const newTaskBlock: NoteBlock = {
      id: createBlockId('ntask'),
      type: 'task',
      taskData: {
        title: '',
        dueDate: null,
        completed: false,
        subtasks: [],
        linkedTaskId: null,
      },
    };
    const trailingParagraph: NoteBlock = {
      id: createBlockId(),
      type: 'paragraph',
      runs: [],
    };
    const idx = blocks.findIndex((b) => b.id === activeBlockId);
    const insertAt = idx !== -1 ? idx + 1 : blocks.length;
    const needsTrailing = insertAt === blocks.length;
    const nextBlocks = [
      ...blocks.slice(0, insertAt),
      newTaskBlock,
      ...(needsTrailing ? [trailingParagraph] : []),
      ...blocks.slice(insertAt),
    ];
    onChangeBlocks(nextBlocks);
    setActiveBlockId(newTaskBlock.id);
  };

  const handleUpdateRuns = (id: string, runs: TextRun[]) => {
    onChangeBlocks(blocks.map((b) => (b.id === id ? { ...b, runs } : b)));
  };

  const handleToggleChecklist = (id: string) => {
    onChangeBlocks(blocks.map((b) => (b.id === id ? { ...b, checked: !b.checked } : b)));
  };

  const handleUpdateTaskData = (id: string, taskData: NoteTaskData) => {
    onChangeBlocks(blocks.map((b) => (b.id === id ? { ...b, taskData } : b)));
  };

  const handleDeleteBlock = (id: string) => {
    const remaining = blocks.filter((b) => b.id !== id);
    if (remaining.length === 0) {
      const fresh: NoteBlock = { id: createBlockId(), type: 'paragraph', runs: [] };
      onChangeBlocks([fresh]);
      setActiveBlockId(fresh.id);
      pendingFocusIdRef.current = fresh.id;
      return;
    }
    onChangeBlocks(remaining);
  };

  const handleEnterKey = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const current = blocks[idx];
    const currentText = getRunsPlainText(current.runs).trim();

    // Pressing Enter on an empty bullet/numbered/checklist item exits the list cleanly
    if (
      (current.type === 'bullet' || current.type === 'numbered' || current.type === 'checklist') &&
      currentText.length === 0
    ) {
      const nextBlocks = [...blocks];
      nextBlocks[idx] = { id: current.id, type: 'paragraph', runs: [] };
      onChangeBlocks(nextBlocks);
      pendingFocusIdRef.current = current.id;
      return;
    }

    const newBlock: NoteBlock =
      current.type === 'bullet'
        ? { id: createBlockId(), type: 'bullet', bulletStyle: current.bulletStyle ?? 'dot', runs: [] }
        : current.type === 'numbered'
          ? { id: createBlockId(), type: 'numbered', runs: [] }
          : current.type === 'checklist'
            ? { id: createBlockId(), type: 'checklist', checked: false, runs: [] }
            : { id: createBlockId(), type: 'paragraph', runs: [] };

    const nextBlocks = [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)];
    onChangeBlocks(nextBlocks);
    setActiveBlockId(newBlock.id);
    pendingFocusIdRef.current = newBlock.id;
  };

  const handleBackspaceEmpty = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const current = blocks[idx];

    if (current.type !== 'paragraph') {
      const nextBlocks = [...blocks];
      nextBlocks[idx] = { id: current.id, type: 'paragraph', runs: [] };
      onChangeBlocks(nextBlocks);
      pendingFocusIdRef.current = current.id;
      return;
    }

    if (blocks.length <= 1) return;
    const prevEditable = [...blocks.slice(0, idx)].reverse().find((b) => b.type !== 'task');
    const nextBlocks = blocks.filter((b) => b.id !== id);
    onChangeBlocks(nextBlocks);
    if (prevEditable) {
      setActiveBlockId(prevEditable.id);
      pendingFocusIdRef.current = prevEditable.id;
    }
  };

  const handleArrowNav = (id: string, dir: 'up' | 'down') => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const step = dir === 'up' ? -1 : 1;
    let cursor = idx + step;
    while (cursor >= 0 && cursor < blocks.length) {
      if (blocks[cursor].type !== 'task') {
        const targetId = blocks[cursor].id;
        setActiveBlockId(targetId);
        const el = blockRefs.current.get(targetId);
        if (el) {
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(dir === 'up');
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
        return;
      }
      cursor += step;
    }
  };

  // Show placeholder ONLY on a completely clean, untouched note — never on Return blank lines
  const isNoteCompletelyEmpty =
    blocks.length === 1 &&
    blocks[0].type === 'paragraph' &&
    getRunsPlainText(blocks[0].runs).length === 0;

  // Compute sequential numbering for consecutive numbered list blocks
  let consecutiveNumber = 0;
  const blockNumbers = blocks.map((b) => {
    if (b.type === 'numbered') {
      consecutiveNumber += 1;
      return consecutiveNumber;
    }
    consecutiveNumber = 0;
    return 0;
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* macOS Formatting Toolbar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-y border-slate-800/80 bg-[#121A2B]/95 px-4 py-2 backdrop-blur-md">
        {/* Inline text style controls */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineCommand('bold')}
            title="Жирный (⌘B)"
            aria-label="Жирный"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineCommand('italic')}
            title="Курсив (⌘I)"
            aria-label="Курсив"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Italic className="h-4 w-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineCommand('underline')}
            title="Подчёркнутый (⌘U)"
            aria-label="Подчёркнутый"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Underline className="h-4 w-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineCommand('strikeThrough')}
            title="Зачёркнутый"
            aria-label="Зачёркнутый"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Strikethrough className="h-4 w-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOrInsertTextBlockType('heading')}
            title="Заголовок раздела"
            aria-label="Заголовок"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              activeBlock?.type === 'heading'
                ? 'bg-blue-500/20 text-blue-300'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Heading2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-1 h-5 w-px bg-slate-800" aria-hidden="true" />

        {/* Text color & Highlight color pickers */}
        <div className="relative flex items-center gap-0.5">
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpenMenu((m) => (m === 'textColor' ? null : 'textColor'))}
              title="Цвет выделенного текста"
              aria-label="Цвет текста"
              className={`flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
                openMenu === 'textColor'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Цвет</span>
            </button>

            {openMenu === 'textColor' && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                className="absolute top-full left-0 z-30 mt-1.5 flex items-center gap-1.5 rounded-xl border border-slate-700/90 bg-[#141D2F] p-2 shadow-2xl"
              >
                {NOTE_TEXT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    aria-label={c.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!c.value) {
                        applyInlineCommand('removeColor');
                      } else {
                        applyInlineCommand('foreColor', c.value);
                      }
                      setOpenMenu(null);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 transition-transform hover:scale-110"
                    style={{ backgroundColor: c.value || '#E2E8F0' }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpenMenu((m) => (m === 'highlight' ? null : 'highlight'))}
              title="Выделить текст цветом (маркер)"
              aria-label="Выделение текста цветом"
              className={`flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
                openMenu === 'highlight'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Highlighter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Маркер</span>
            </button>

            {openMenu === 'highlight' && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                className="absolute top-full left-0 z-30 mt-1.5 flex items-center gap-1.5 rounded-xl border border-slate-700/90 bg-[#141D2F] p-2 shadow-2xl"
              >
                {NOTE_HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    aria-label={c.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!c.value) {
                        applyInlineCommand('removeHighlight');
                      } else {
                        applyInlineCommand('hiliteColor', c.value);
                      }
                      setOpenMenu(null);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-600 text-[10px] text-slate-300 transition-transform hover:scale-110"
                    style={{ backgroundColor: c.value || '#0B111E' }}
                  >
                    {!c.value && <X className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mx-1 h-5 w-px bg-slate-800" aria-hidden="true" />

        {/* Custom bullet markers (dot, star, square, heart) + numbered list (1. 2. 3.) */}
        <div className="flex items-center gap-0.5" role="group" aria-label="Стили списков">
          {BULLET_STYLES.map((style) => {
            const isActive =
              activeBlock?.type === 'bullet' && activeBlock.bulletStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOrInsertTextBlockType('bullet', style.id)}
                title={`Список: ${style.label} (${style.symbol})`}
                aria-label={`Список: ${style.label}`}
                className={`flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-500/20 text-white ring-1 ring-inset ring-blue-500/40'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={getBulletColorClass(style.id)}>{style.symbol}</span>
              </button>
            );
          })}

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOrInsertTextBlockType('numbered')}
            title="Нумерованный список (1. 2. 3.)"
            aria-label="Нумерованный список"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              activeBlock?.type === 'numbered'
                ? 'bg-blue-500/20 text-blue-300 ring-1 ring-inset ring-blue-500/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-1 h-5 w-px bg-slate-800" aria-hidden="true" />

        {/* Interactive checkable item & Embedded task creator */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOrInsertTextBlockType('checklist')}
            title="Пункт с галочкой (можно отмечать выполненным)"
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeBlock?.type === 'checklist'
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-inset ring-emerald-500/35'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
            <span>Чек-лист</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertEmbeddedTask}
            title="Создать полноценную задачу внутри заметки"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-500/15 px-2.5 text-xs font-medium text-blue-300 ring-1 ring-inset ring-blue-500/30 transition-colors hover:bg-blue-500/25 whitespace-nowrap"
          >
            <ListTodo className="h-3.5 w-3.5" />
            <span>+ Задача</span>
          </button>
        </div>
      </div>

      {/* Blocks canvas */}
      <div
        ref={editorCanvasRef}
        className="flex-1 space-y-1.5 px-6 py-5"
        onClick={() => {
          if (openMenu) setOpenMenu(null);
        }}
      >
        {blocks.map((block, index) => {
          if (block.type === 'task') {
            return (
              <NoteTaskBlockCard
                key={block.id}
                block={block}
                taskFolders={taskFolders}
                nowMs={nowMs}
                onUpdateTaskData={handleUpdateTaskData}
                onDeleteBlock={handleDeleteBlock}
                onAddTaskToMainList={onAddTaskToMainList}
              />
            );
          }

          const placeholder =
            isNoteCompletelyEmpty && index === 0
              ? 'Начните писать заметку... Выделите текст, чтобы изменить цвет, жирность или курсив.'
              : '';

          return (
            <div key={block.id} className="group/blk flex items-start gap-2.5">
              {block.type === 'bullet' && (
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex w-5 shrink-0 select-none items-center justify-center text-sm ${getBulletColorClass(
                    block.bulletStyle
                  )}`}
                >
                  {getBulletSymbol(block.bulletStyle)}
                </span>
              )}

              {block.type === 'numbered' && (
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex min-w-5 shrink-0 select-none justify-end font-mono text-sm font-medium text-blue-400 tabular-nums"
                >
                  {blockNumbers[index]}.
                </span>
              )}

              {block.type === 'checklist' && (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={Boolean(block.checked)}
                  aria-label={block.checked ? 'Снять отметку пункта' : 'Отметить пункт выполненным'}
                  onClick={() => handleToggleChecklist(block.id)}
                  className={`mt-1 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border transition-colors ${
                    block.checked
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-600 bg-slate-900/70 hover:border-slate-400'
                  }`}
                >
                  {block.checked && <Check className="pointer-events-none h-3 w-3 stroke-[3]" />}
                </button>
              )}

              <EditableTextBlock
                block={block}
                placeholder={placeholder}
                isAllSelected={allTextSelected}
                registerRef={registerRef}
                onFocusBlock={setActiveBlockId}
                onClearAllSelected={() => setAllTextSelected(false)}
                onSelectAllNote={handleSelectAllNote}
                onDeleteAllSelected={handleDeleteAllSelected}
                onReplaceAllWithChar={handleReplaceAllWithChar}
                onCopyAll={handleCopyAll}
                onGetAllPlainText={() => extractNotePlainText(blocks)}
                onFormatAll={(fmt) => applyInlineCommand(fmt)}
                onUpdateRuns={handleUpdateRuns}
                onDeleteSingleLine={handleDeleteSingleLine}
                onEnterKey={handleEnterKey}
                onBackspaceEmpty={handleBackspaceEmpty}
                onArrowNav={handleArrowNav}
              />
            </div>
          );
        })}

        {/* Subtle bottom click area to append a new clean paragraph when clicking empty space */}
        <div
          onClick={() => {
            setAllTextSelected(false);
            const last = blocks[blocks.length - 1];
            if (last && last.type !== 'task' && getRunsPlainText(last.runs).length === 0) {
              setActiveBlockId(last.id);
              blockRefs.current.get(last.id)?.focus();
              return;
            }
            const nextBlock: NoteBlock = { id: createBlockId(), type: 'paragraph', runs: [] };
            onChangeBlocks([...blocks, nextBlock]);
            setActiveBlockId(nextBlock.id);
            pendingFocusIdRef.current = nextBlock.id;
          }}
          className="min-h-[120px] cursor-text"
        />
      </div>
    </div>
  );
};
