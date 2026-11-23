export type FolderColorId =
  | 'blue'
  | 'indigo'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'coral'
  | 'rose'
  | 'slate';

export interface FolderColorMeta {
  id: FolderColorId;
  label: string;
  hex: string;
  textClass: string;
  bgClass: string;
  ringClass: string;
  dotClass: string;
}

export const FOLDER_COLORS: FolderColorMeta[] = [
  {
    id: 'blue',
    label: 'Синий',
    hex: '#3B82F6',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500/15',
    ringClass: 'ring-blue-400/50',
    dotClass: 'bg-blue-400',
  },
  {
    id: 'indigo',
    label: 'Индиго',
    hex: '#818CF8',
    textClass: 'text-indigo-400',
    bgClass: 'bg-indigo-500/15',
    ringClass: 'ring-indigo-400/50',
    dotClass: 'bg-indigo-400',
  },
  {
    id: 'cyan',
    label: 'Бирюзовый',
    hex: '#22D3EE',
    textClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/15',
    ringClass: 'ring-cyan-400/50',
    dotClass: 'bg-cyan-400',
  },
  {
    id: 'emerald',
    label: 'Изумрудный',
    hex: '#34D399',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/15',
    ringClass: 'ring-emerald-400/50',
    dotClass: 'bg-emerald-400',
  },
  {
    id: 'amber',
    label: 'Янтарный',
    hex: '#FBBF24',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/15',
    ringClass: 'ring-amber-400/50',
    dotClass: 'bg-amber-400',
  },
  {
    id: 'coral',
    label: 'Коралловый',
    hex: '#FB923C',
    textClass: 'text-orange-400',
    bgClass: 'bg-orange-500/15',
    ringClass: 'ring-orange-400/50',
    dotClass: 'bg-orange-400',
  },
  {
    id: 'rose',
    label: 'Розовый',
    hex: '#FB7185',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-500/15',
    ringClass: 'ring-rose-400/50',
    dotClass: 'bg-rose-400',
  },
  {
    id: 'slate',
    label: 'Графитовый',
    hex: '#94A3B8',
    textClass: 'text-slate-400',
    bgClass: 'bg-slate-500/15',
    ringClass: 'ring-slate-400/50',
    dotClass: 'bg-slate-400',
  },
];

export function getFolderColor(colorId: FolderColorId | string | undefined): FolderColorMeta {
  return FOLDER_COLORS.find((c) => c.id === colorId) ?? FOLDER_COLORS[7];
}

export interface Folder {
  id: string;
  name: string;
  color: FolderColorId;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  folderId: string | null;
  /** Local ISO string 'YYYY-MM-DDTHH:mm' or null when no deadline */
  dueDate: string | null;
  completed: boolean;
  order: number;
  subtasks: Subtask[];
  createdAt: string;
  completedAt: string | null;
}

export interface NoteFolder {
  id: string;
  name: string;
  color: FolderColorId;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'list' | 'calendar' | 'notes';
export type StatusFilter = 'all' | 'active' | 'completed';
export type DeadlineFilter = 'all' | 'today' | 'urgent' | 'week' | 'overdue' | 'none';

export interface YulistDesktopBridge {
  isElectron: boolean;
  platform: string;
}

declare global {
  interface Window {
    yulistDesktop?: YulistDesktopBridge;
  }
}
