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

export type BulletStyle = 'dot' | 'star' | 'square' | 'heart';

export interface BulletStyleMeta {
  id: BulletStyle;
  symbol: string;
  label: string;
}

export const BULLET_STYLES: BulletStyleMeta[] = [
  { id: 'dot', symbol: '•', label: 'Точка' },
  { id: 'star', symbol: '★', label: 'Звёздочка' },
  { id: 'square', symbol: '▪', label: 'Квадратик' },
  { id: 'heart', symbol: '♥', label: 'Сердечко' },
];

export interface NoteColorOption {
  id: string;
  label: string;
  value: string;
}

export const NOTE_TEXT_COLORS: NoteColorOption[] = [
  { id: 'default', label: 'Обычный', value: '' },
  { id: 'blue', label: 'Синий', value: '#60A5FA' },
  { id: 'cyan', label: 'Бирюзовый', value: '#22D3EE' },
  { id: 'emerald', label: 'Зелёный', value: '#34D399' },
  { id: 'amber', label: 'Жёлтый', value: '#FBBF24' },
  { id: 'orange', label: 'Оранжевый', value: '#FB923C' },
  { id: 'rose', label: 'Розовый', value: '#FB7185' },
  { id: 'violet', label: 'Сиреневый', value: '#C084FC' },
];

export const NOTE_HIGHLIGHT_COLORS: NoteColorOption[] = [
  { id: 'none', label: 'Без выделения', value: '' },
  { id: 'amber', label: 'Жёлтый маркер', value: 'rgba(245, 158, 11, 0.28)' },
  { id: 'blue', label: 'Синий маркер', value: 'rgba(59, 130, 246, 0.30)' },
  { id: 'emerald', label: 'Зелёный маркер', value: 'rgba(16, 185, 129, 0.28)' },
  { id: 'rose', label: 'Розовый маркер', value: 'rgba(244, 63, 94, 0.28)' },
  { id: 'violet', label: 'Фиолетовый маркер', value: 'rgba(168, 85, 247, 0.28)' },
];

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  highlight?: string;
}

export interface NoteTaskData {
  title: string;
  dueDate: string | null;
  completed: boolean;
  subtasks: Subtask[];
  linkedTaskId?: string | null;
}

export type NoteBlockType = 'paragraph' | 'heading' | 'bullet' | 'numbered' | 'checklist' | 'task';

export interface NoteBlock {
  id: string;
  type: NoteBlockType;
  runs?: TextRun[];
  bulletStyle?: BulletStyle;
  checked?: boolean;
  taskData?: NoteTaskData;
}

export interface NoteLock {
  salt: string;
  passwordHash: string;
  touchIdEnabled: boolean;
  webAuthnCredentialId?: string | null;
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
  /** Plain-text extract kept in sync for search and previews */
  content: string;
  blocks: NoteBlock[];
  folderId: string | null;
  pinned: boolean;
  lock?: NoteLock | null;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'list' | 'calendar' | 'notes';
export type StatusFilter = 'all' | 'active' | 'completed';
export type DeadlineFilter = 'all' | 'today' | 'week' | 'overdue' | 'none';
export type TaskSortMode = 'manual' | 'remaining' | 'createdDesc' | 'createdAsc';

export interface YulistDesktopBridge {
  isElectron: boolean;
  platform: string;
  canUseTouchId?: () => Promise<boolean>;
  promptTouchId?: (reason: string) => Promise<{ ok: boolean; error?: string }>;
}

declare global {
  interface Window {
    yulistDesktop?: YulistDesktopBridge;
  }
}
