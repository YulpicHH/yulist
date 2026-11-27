import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialFolders,
  createInitialNoteFolders,
  createInitialNotes,
  createInitialTasks,
} from '../data/seedData';
import {
  DeadlineFilter,
  Folder,
  FolderColorId,
  Note,
  NoteBlock,
  NoteFolder,
  StatusFilter,
  Subtask,
  Task,
  ViewMode,
} from '../types/todo';
import { matchesDeadlineFilter, pluralizeRu } from '../utils/dateUtils';
import {
  createBlockId,
  extractNotePlainText,
  migratePlainTextToBlocks,
} from '../utils/noteUtils';

const STORAGE_KEY = 'yulist_workspace_v1';

interface PersistedWorkspace {
  version: 1;
  folders: Folder[];
  tasks: Task[];
  noteFolders: NoteFolder[];
  notes: Note[];
}

export interface ToastNotice {
  id: string;
  message: string;
  canUndo?: boolean;
}

type UndoBackup =
  | { kind: 'task'; item: Task }
  | { kind: 'notes'; items: Note[]; previousSelectedId: string | null }
  | null;

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hydrateNote(raw: Partial<Note>): Note {
  const rawContent = typeof raw.content === 'string' ? raw.content : '';
  const blocks: NoteBlock[] =
    Array.isArray(raw.blocks) && raw.blocks.length > 0
      ? raw.blocks
      : migratePlainTextToBlocks(rawContent);
  const nowIso = new Date().toISOString();

  return {
    id: raw.id || generateId('note'),
    title: typeof raw.title === 'string' ? raw.title : '',
    content: extractNotePlainText(blocks),
    blocks,
    folderId: raw.folderId ?? null,
    pinned: Boolean(raw.pinned),
    createdAt: raw.createdAt || nowIso,
    updatedAt: raw.updatedAt || nowIso,
  };
}

function loadInitialWorkspace(): PersistedWorkspace {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedWorkspace>;
      if (Array.isArray(parsed.folders) && Array.isArray(parsed.tasks)) {
        const hasNotesState = Array.isArray(parsed.noteFolders) && Array.isArray(parsed.notes);
        return {
          version: 1,
          folders: parsed.folders,
          tasks: parsed.tasks.map((t, index) => ({
            ...t,
            order: typeof t.order === 'number' ? t.order : index,
            subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
            dueDate: t.dueDate ?? null,
            completedAt: t.completedAt ?? null,
          })),
          noteFolders: hasNotesState ? parsed.noteFolders! : createInitialNoteFolders(),
          notes: hasNotesState ? parsed.notes!.map(hydrateNote) : createInitialNotes(),
        };
      }
    }
  } catch {
    // Fallback to clean seed state if localStorage is unavailable or corrupted
  }
  return {
    version: 1,
    folders: createInitialFolders(),
    tasks: createInitialTasks(),
    noteFolders: createInitialNoteFolders(),
    notes: createInitialNotes(),
  };
}

export function useYulistStore() {
  const [workspace, setWorkspace] = useState<PersistedWorkspace>(() => loadInitialWorkspace());
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [activeNoteFolderId, setActiveNoteFolderId] = useState<string>('all');
  // Starts at null so the user can browse the general notes overview field without being locked inside a note
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [noteSearchQuery, setNoteSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('all');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const undoBackupRef = useRef<UndoBackup>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Persist workspace to localStorage whenever folders, tasks, noteFolders, or notes change
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      // Ignore quota errors gracefully
    }
  }, [workspace]);

  // Live countdown ticker every 30 seconds
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const showToast = useCallback((message: string, canUndo = false) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ id: generateId('toast'), message, canUndo });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      undoBackupRef.current = null;
    }, 5200);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(null);
    undoBackupRef.current = null;
  }, []);

  const selectNoteFolder = useCallback((folderId: string) => {
    setActiveNoteFolderId(folderId);
    // Return to the overview field of the chosen folder so the user isn't trapped in a previous note
    setSelectedNoteId(null);
  }, []);

  // Task Folder actions
  const addFolder = useCallback(
    (name: string, color: FolderColorId) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const newFolder: Folder = {
        id: generateId('folder'),
        name: trimmed,
        color,
        createdAt: new Date().toISOString(),
      };
      setWorkspace((prev) => ({
        ...prev,
        folders: [...prev.folders, newFolder],
      }));
      showToast(`Папка «${trimmed}» создана`);
      return newFolder;
    },
    [showToast]
  );

  const updateFolder = useCallback(
    (folderId: string, name: string, color: FolderColorId) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setWorkspace((prev) => ({
        ...prev,
        folders: prev.folders.map((f) =>
          f.id === folderId ? { ...f, name: trimmed, color } : f
        ),
      }));
      showToast(`Папка «${trimmed}» обновлена`);
    },
    [showToast]
  );

  const deleteFolder = useCallback(
    (folderId: string, mode: 'move' | 'delete', targetFolderId: string | null) => {
      setWorkspace((prev) => {
        const folderToDelete = prev.folders.find((f) => f.id === folderId);
        const remainingFolders = prev.folders.filter((f) => f.id !== folderId);
        const updatedTasks =
          mode === 'delete'
            ? prev.tasks.filter((t) => t.folderId !== folderId)
            : prev.tasks.map((t) =>
                t.folderId === folderId ? { ...t, folderId: targetFolderId } : t
              );

        if (folderToDelete) {
          showToast(`Папка «${folderToDelete.name}» удалена`);
        }

        return {
          ...prev,
          folders: remainingFolders,
          tasks: updatedTasks,
        };
      });

      setActiveFolderId((current) => (current === folderId ? 'all' : current));
    },
    [showToast]
  );

  // Note Folder actions
  const addNoteFolder = useCallback(
    (name: string, color: FolderColorId) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const newFolder: NoteFolder = {
        id: generateId('nfolder'),
        name: trimmed,
        color,
        createdAt: new Date().toISOString(),
      };
      setWorkspace((prev) => ({
        ...prev,
        noteFolders: [...prev.noteFolders, newFolder],
      }));
      showToast(`Папка заметок «${trimmed}» создана`);
      return newFolder;
    },
    [showToast]
  );

  const updateNoteFolder = useCallback(
    (folderId: string, name: string, color: FolderColorId) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setWorkspace((prev) => ({
        ...prev,
        noteFolders: prev.noteFolders.map((f) =>
          f.id === folderId ? { ...f, name: trimmed, color } : f
        ),
      }));
      showToast(`Папка заметок «${trimmed}» обновлена`);
    },
    [showToast]
  );

  const deleteNoteFolder = useCallback(
    (folderId: string, mode: 'move' | 'delete', targetFolderId: string | null) => {
      setWorkspace((prev) => {
        const folderToDelete = prev.noteFolders.find((f) => f.id === folderId);
        const remainingFolders = prev.noteFolders.filter((f) => f.id !== folderId);
        const updatedNotes =
          mode === 'delete'
            ? prev.notes.filter((n) => n.folderId !== folderId)
            : prev.notes.map((n) =>
                n.folderId === folderId ? { ...n, folderId: targetFolderId } : n
              );

        if (folderToDelete) {
          showToast(`Папка заметок «${folderToDelete.name}» удалена`);
        }

        return {
          ...prev,
          noteFolders: remainingFolders,
          notes: updatedNotes,
        };
      });

      setActiveNoteFolderId((current) => (current === folderId ? 'all' : current));
    },
    [showToast]
  );

  // Task actions
  const addTask = useCallback(
    (payload: {
      title: string;
      folderId: string | null;
      dueDate: string | null;
      subtasks?: Subtask[];
    }) => {
      const trimmed = payload.title.trim();
      if (!trimmed) return null;

      const newTask: Task = {
        id: generateId('task'),
        title: trimmed,
        folderId: payload.folderId,
        dueDate: payload.dueDate,
        completed: false,
        order: 0,
        subtasks: payload.subtasks ?? [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      };

      setWorkspace((prev) => {
        const maxOrder = prev.tasks.reduce((max, t) => Math.max(max, t.order), -1);
        return {
          ...prev,
          tasks: [...prev.tasks, { ...newTask, order: maxOrder + 1 }],
        };
      });

      setNowMs(Date.now());
      return newTask;
    },
    []
  );

  const updateTask = useCallback(
    (
      taskId: string,
      updates: Partial<Pick<Task, 'title' | 'folderId' | 'dueDate' | 'completed' | 'subtasks'>>
    ) => {
      setWorkspace((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const nextCompleted =
            typeof updates.completed === 'boolean' ? updates.completed : task.completed;
          return {
            ...task,
            ...updates,
            title: updates.title !== undefined ? updates.title.trim() || task.title : task.title,
            completed: nextCompleted,
            completedAt:
              typeof updates.completed === 'boolean'
                ? nextCompleted
                  ? new Date().toISOString()
                  : null
                : task.completedAt,
          };
        }),
      }));
      setNowMs(Date.now());
    },
    []
  );

  const toggleTaskCompleted = useCallback((taskId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const nextCompleted = !task.completed;
        return {
          ...task,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : null,
        };
      }),
    }));
  }, []);

  const deleteTask = useCallback(
    (taskId: string) => {
      setWorkspace((prev) => {
        const target = prev.tasks.find((t) => t.id === taskId);
        if (!target) return prev;
        undoBackupRef.current = { kind: 'task', item: target };
        showToast(`Задача «${target.title}» удалена`, true);
        return {
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== taskId),
        };
      });
    },
    [showToast]
  );

  const reorderTasks = useCallback((draggedTaskId: string, targetTaskId: string) => {
    if (draggedTaskId === targetTaskId) return;
    setWorkspace((prev) => {
      const sorted = [...prev.tasks].sort((a, b) => a.order - b.order);
      const fromIndex = sorted.findIndex((t) => t.id === draggedTaskId);
      const toIndex = sorted.findIndex((t) => t.id === targetTaskId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);

      const reindexed = sorted.map((t, idx) => ({ ...t, order: idx }));
      return {
        ...prev,
        tasks: reindexed,
      };
    });
  }, []);

  // Subtask inline actions
  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          subtasks: task.subtasks.map((sub) =>
            sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
          ),
        };
      }),
    }));
  }, []);

  const addSubtask = useCallback((taskId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          subtasks: [
            ...task.subtasks,
            {
              id: generateId('sub'),
              title: trimmed,
              completed: false,
            },
          ],
        };
      }),
    }));
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          subtasks: task.subtasks.filter((s) => s.id !== subtaskId),
        };
      }),
    }));
  }, []);

  // Note actions
  const addNote = useCallback(
    (folderId?: string | null) => {
      const nowIso = new Date().toISOString();
      const targetFolder =
        folderId !== undefined
          ? folderId
          : activeNoteFolderId !== 'all'
            ? activeNoteFolderId
            : null;

      const newNote: Note = {
        id: generateId('note'),
        title: '',
        content: '',
        blocks: [{ id: createBlockId(), type: 'paragraph', runs: [] }],
        folderId: targetFolder,
        pinned: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setWorkspace((prev) => ({
        ...prev,
        notes: [newNote, ...prev.notes],
      }));
      setSelectedNoteId(newNote.id);
      return newNote;
    },
    [activeNoteFolderId]
  );

  const updateNote = useCallback(
    (
      noteId: string,
      updates: Partial<Pick<Note, 'title' | 'blocks' | 'folderId' | 'pinned'>>
    ) => {
      setWorkspace((prev) => ({
        ...prev,
        notes: prev.notes.map((note) => {
          if (note.id !== noteId) return note;
          const nextBlocks = updates.blocks ?? note.blocks;
          return {
            ...note,
            ...updates,
            blocks: nextBlocks,
            content: updates.blocks ? extractNotePlainText(nextBlocks) : note.content,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    []
  );

  const toggleNotePinned = useCallback((noteId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      notes: prev.notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              pinned: !note.pinned,
            }
          : note
      ),
    }));
  }, []);

  const deleteNotes = useCallback(
    (noteIds: string[]) => {
      if (noteIds.length === 0) return;
      const idSet = new Set(noteIds);
      setWorkspace((prev) => {
        const removed = prev.notes.filter((n) => idSet.has(n.id));
        if (removed.length === 0) return prev;
        undoBackupRef.current = {
          kind: 'notes',
          items: removed,
          previousSelectedId: selectedNoteId,
        };
        if (removed.length === 1) {
          const label = removed[0].title.trim() || 'Без названия';
          showToast(`Заметка «${label}» удалена`, true);
        } else {
          showToast(
            `Удалено: ${pluralizeRu(removed.length, 'заметка', 'заметки', 'заметок')}`,
            true
          );
        }
        return {
          ...prev,
          notes: prev.notes.filter((n) => !idSet.has(n.id)),
        };
      });
      setSelectedNoteId((current) => (current && idSet.has(current) ? null : current));
    },
    [selectedNoteId, showToast]
  );

  const deleteNote = useCallback(
    (noteId: string) => {
      deleteNotes([noteId]);
    },
    [deleteNotes]
  );

  // Unified Undo handler (supports single task, single note, or bulk-deleted notes)
  const undoLastDelete = useCallback(() => {
    const backup = undoBackupRef.current;
    if (!backup) return;
    undoBackupRef.current = null;

    if (backup.kind === 'task') {
      setWorkspace((prev) => {
        if (prev.tasks.some((t) => t.id === backup.item.id)) return prev;
        return {
          ...prev,
          tasks: [...prev.tasks, backup.item].sort((a, b) => a.order - b.order),
        };
      });
    } else {
      setWorkspace((prev) => {
        const existingIds = new Set(prev.notes.map((n) => n.id));
        const toRestore = backup.items.filter((item) => !existingIds.has(item.id));
        if (toRestore.length === 0) return prev;
        return {
          ...prev,
          notes: [...toRestore, ...prev.notes],
        };
      });
      if (backup.previousSelectedId) {
        setSelectedNoteId(backup.previousSelectedId);
      }
    }

    dismissToast();
  }, [dismissToast]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDeadlineFilter('all');
  }, []);

  // Derived data: Tasks
  const sortedAllTasks = useMemo(
    () => [...workspace.tasks].sort((a, b) => a.order - b.order),
    [workspace.tasks]
  );

  const foldersById = useMemo(() => {
    const map = new Map<string, Folder>();
    workspace.folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [workspace.folders]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, { total: number; active: number }> = {
      all: { total: 0, active: 0 },
    };
    workspace.folders.forEach((f) => {
      counts[f.id] = { total: 0, active: 0 };
    });

    workspace.tasks.forEach((t) => {
      counts.all.total += 1;
      if (!t.completed) counts.all.active += 1;
      if (t.folderId && counts[t.folderId]) {
        counts[t.folderId].total += 1;
        if (!t.completed) counts[t.folderId].active += 1;
      }
    });
    return counts;
  }, [workspace.folders, workspace.tasks]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedAllTasks.filter((task) => {
      if (activeFolderId !== 'all' && task.folderId !== activeFolderId) {
        return false;
      }
      if (statusFilter === 'active' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      if (!matchesDeadlineFilter(task, deadlineFilter, nowMs)) return false;

      if (q) {
        const folderName = task.folderId ? foldersById.get(task.folderId)?.name.toLowerCase() ?? '' : '';
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesSubtask = task.subtasks.some((s) => s.title.toLowerCase().includes(q));
        const matchesFolder = folderName.includes(q);
        if (!matchesTitle && !matchesSubtask && !matchesFolder) return false;
      }

      return true;
    });
  }, [sortedAllTasks, activeFolderId, statusFilter, deadlineFilter, searchQuery, nowMs, foldersById]);

  const activeFolder = useMemo(
    () => (activeFolderId === 'all' ? null : foldersById.get(activeFolderId) ?? null),
    [activeFolderId, foldersById]
  );

  // Derived data: Notes
  const noteFoldersById = useMemo(() => {
    const map = new Map<string, NoteFolder>();
    workspace.noteFolders.forEach((f) => map.set(f.id, f));
    return map;
  }, [workspace.noteFolders]);

  const noteFolderCounts = useMemo(() => {
    const counts: Record<string, { total: number; active: number }> = {
      all: { total: 0, active: 0 },
    };
    workspace.noteFolders.forEach((f) => {
      counts[f.id] = { total: 0, active: 0 };
    });

    workspace.notes.forEach((n) => {
      counts.all.total += 1;
      counts.all.active += 1;
      if (n.folderId && counts[n.folderId]) {
        counts[n.folderId].total += 1;
        counts[n.folderId].active += 1;
      }
    });
    return counts;
  }, [workspace.noteFolders, workspace.notes]);

  const filteredNotes = useMemo(() => {
    const q = noteSearchQuery.trim().toLowerCase();
    return [...workspace.notes]
      .filter((note) => {
        if (activeNoteFolderId !== 'all' && note.folderId !== activeNoteFolderId) {
          return false;
        }
        if (q) {
          const folderName = note.folderId
            ? noteFoldersById.get(note.folderId)?.name.toLowerCase() ?? ''
            : '';
          const matchesTitle = note.title.toLowerCase().includes(q);
          const matchesContent = note.content.toLowerCase().includes(q);
          const matchesFolder = folderName.includes(q);
          if (!matchesTitle && !matchesContent && !matchesFolder) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [workspace.notes, activeNoteFolderId, noteSearchQuery, noteFoldersById]);

  const activeNoteFolder = useMemo(
    () => (activeNoteFolderId === 'all' ? null : noteFoldersById.get(activeNoteFolderId) ?? null),
    [activeNoteFolderId, noteFoldersById]
  );

  // Only clear selectedNoteId if the open note itself was deleted (never force-select another note)
  useEffect(() => {
    if (selectedNoteId && !workspace.notes.some((n) => n.id === selectedNoteId)) {
      setSelectedNoteId(null);
    }
  }, [selectedNoteId, workspace.notes]);

  const selectedNote = useMemo(
    () => (selectedNoteId ? workspace.notes.find((n) => n.id === selectedNoteId) ?? null : null),
    [selectedNoteId, workspace.notes]
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== 'all' || deadlineFilter !== 'all';

  return {
    // Task folders & tasks
    folders: workspace.folders,
    foldersById,
    allTasks: sortedAllTasks,
    filteredTasks,
    folderCounts,
    activeFolderId,
    activeFolder,
    setActiveFolderId,
    // Note folders & notes
    noteFolders: workspace.noteFolders,
    noteFoldersById,
    filteredNotes,
    noteFolderCounts,
    activeNoteFolderId,
    activeNoteFolder,
    setActiveNoteFolderId: selectNoteFolder,
    selectedNoteId,
    selectedNote,
    setSelectedNoteId,
    noteSearchQuery,
    setNoteSearchQuery,
    // Shared UI
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    deadlineFilter,
    setDeadlineFilter,
    hasActiveFilters,
    resetFilters,
    nowMs,
    toast,
    showToast,
    dismissToast,
    undoLastDelete,
    // Task folder CRUD
    addFolder,
    updateFolder,
    deleteFolder,
    // Note folder CRUD
    addNoteFolder,
    updateNoteFolder,
    deleteNoteFolder,
    // Task CRUD
    addTask,
    updateTask,
    toggleTaskCompleted,
    deleteTask,
    reorderTasks,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    // Note CRUD
    addNote,
    updateNote,
    toggleNotePinned,
    deleteNote,
    deleteNotes,
  };
}
