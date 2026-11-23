import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createInitialFolders, createInitialTasks } from '../data/seedData';
import {
  DeadlineFilter,
  Folder,
  FolderColorId,
  StatusFilter,
  Subtask,
  Task,
  ViewMode,
} from '../types/todo';
import { matchesDeadlineFilter } from '../utils/dateUtils';

const STORAGE_KEY = 'yulist_workspace_v1';

interface PersistedWorkspace {
  version: 1;
  folders: Folder[];
  tasks: Task[];
}

export interface ToastNotice {
  id: string;
  message: string;
  canUndo?: boolean;
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadInitialWorkspace(): PersistedWorkspace {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedWorkspace>;
      if (Array.isArray(parsed.folders) && Array.isArray(parsed.tasks)) {
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
  };
}

export function useYulistStore() {
  const [workspace, setWorkspace] = useState<PersistedWorkspace>(() => loadInitialWorkspace());
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('all');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const deletedTaskBackupRef = useRef<Task | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Persist workspace to localStorage whenever folders or tasks change
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
      deletedTaskBackupRef.current = null;
    }, 5200);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(null);
    deletedTaskBackupRef.current = null;
  }, []);

  // Folder actions
  const addFolder = useCallback((name: string, color: FolderColorId) => {
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
  }, [showToast]);

  const updateFolder = useCallback((folderId: string, name: string, color: FolderColorId) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setWorkspace((prev) => ({
      ...prev,
      folders: prev.folders.map((f) =>
        f.id === folderId ? { ...f, name: trimmed, color } : f
      ),
    }));
    showToast(`Папка «${trimmed}» обновлена`);
  }, [showToast]);

  const deleteFolder = useCallback(
    (folderId: string, mode: 'move' | 'delete', targetFolderId: string | null) => {
      setWorkspace((prev) => {
        const folderToDelete = prev.folders.find((f) => f.id === folderId);
        const remainingFolders = prev.folders.filter((f) => f.id !== folderId);
        let updatedTasks: Task[];

        if (mode === 'delete') {
          updatedTasks = prev.tasks.filter((t) => t.folderId !== folderId);
        } else {
          updatedTasks = prev.tasks.map((t) =>
            t.folderId === folderId ? { ...t, folderId: targetFolderId } : t
          );
        }

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
        deletedTaskBackupRef.current = target;
        showToast(`Задача «${target.title}» удалена`, true);
        return {
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== taskId),
        };
      });
    },
    [showToast]
  );

  const undoDeleteTask = useCallback(() => {
    const backup = deletedTaskBackupRef.current;
    if (!backup) return;
    deletedTaskBackupRef.current = null;
    setWorkspace((prev) => {
      if (prev.tasks.some((t) => t.id === backup.id)) return prev;
      return {
        ...prev,
        tasks: [...prev.tasks, backup].sort((a, b) => a.order - b.order),
      };
    });
    dismissToast();
  }, [dismissToast]);

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

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDeadlineFilter('all');
  }, []);

  // Derived data
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

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== 'all' || deadlineFilter !== 'all';

  return {
    folders: workspace.folders,
    foldersById,
    allTasks: sortedAllTasks,
    filteredTasks,
    folderCounts,
    activeFolderId,
    activeFolder,
    setActiveFolderId,
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
    undoDeleteTask,
    addFolder,
    updateFolder,
    deleteFolder,
    addTask,
    updateTask,
    toggleTaskCompleted,
    deleteTask,
    reorderTasks,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
  };
}
