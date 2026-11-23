import React from 'react';
import {
  Folder as FolderIcon,
  Globe,
  Keyboard,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Folder, getFolderColor } from '../types/todo';

interface SidebarProps {
  folders: Folder[];
  folderCounts: Record<string, { total: number; active: number }>;
  activeFolderId: string;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onOpenShortcuts: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  folderCounts,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onOpenShortcuts,
  mobileOpen,
  onCloseMobile,
}) => {
  const isElectronMac =
    typeof window !== 'undefined' &&
    window.yulistDesktop?.isElectron &&
    window.yulistDesktop?.platform === 'darwin';

  const allCount = folderCounts.all?.total ?? 0;

  const content = (
    <aside className="flex h-full w-[256px] shrink-0 flex-col border-r border-slate-800/80 bg-[#111827]/95 backdrop-blur-md select-none">
      {/* Top macOS-inspired brand header */}
      <div
        className={`flex items-center justify-between px-4 pb-3 ${
          isElectronMac ? 'pt-10 macos-drag' : 'pt-5'
        }`}
      >
        <div className="flex items-center gap-2.5 macos-no-drag">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30">
            <span className="font-display text-sm font-bold tracking-tight">yu</span>
          </div>
          <span className="font-display text-[17px] font-bold tracking-tight text-slate-100 whitespace-nowrap">
            yulist
          </span>
        </div>

        <button
          type="button"
          onClick={onCloseMobile}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 lg:hidden macos-no-drag"
          aria-label="Закрыть панель папок"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Section title */}
      <div className="flex items-center justify-between px-4 pt-2 pb-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <FolderIcon className="h-3.5 w-3.5 text-slate-500" />
          <span>Папки</span>
        </div>
        <span className="font-mono text-[11px] text-slate-500 tabular-nums">
          {folders.length}
        </span>
      </div>

      {/* Folders list */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Папки задач">
        {/* All tasks item */}
        <button
          type="button"
          onClick={() => {
            onSelectFolder('all');
            onCloseMobile();
          }}
          className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
            activeFolderId === 'all'
              ? 'bg-blue-500/18 text-blue-200 ring-1 ring-inset ring-blue-500/30'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Globe
              className={`h-4 w-4 shrink-0 ${
                activeFolderId === 'all' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
              }`}
            />
            <span className="truncate font-medium">Все</span>
          </span>
          <span
            className={`ml-2 font-mono text-xs tabular-nums ${
              activeFolderId === 'all' ? 'text-blue-300' : 'text-slate-500'
            }`}
          >
            {allCount}
          </span>
        </button>

        <div className="my-2 border-t border-slate-800/70" />

        {/* Custom user folders */}
        {folders.map((folder) => {
          const isActive = activeFolderId === folder.id;
          const color = getFolderColor(folder.color);
          const count = folderCounts[folder.id]?.total ?? 0;

          return (
            <div
              key={folder.id}
              className={`group relative flex items-center rounded-lg transition-colors duration-150 ${
                isActive
                  ? 'bg-blue-500/16 text-slate-100 ring-1 ring-inset ring-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectFolder(folder.id);
                  onCloseMobile();
                }}
                className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left text-sm"
              >
                <FolderIcon className={`h-4 w-4 shrink-0 ${color.textClass}`} />
                <span className="truncate font-medium">{folder.name}</span>
              </button>

              {/* Count (hides on hover to reveal edit/delete actions) */}
              <div className="flex shrink-0 items-center pr-2">
                <span
                  className={`px-1 font-mono text-xs tabular-nums transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0 ${
                    isActive ? 'text-blue-300' : 'text-slate-500'
                  }`}
                >
                  {count}
                </span>

                <div className="pointer-events-none absolute right-1.5 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditFolder(folder);
                    }}
                    title="Изменить папку"
                    aria-label={`Изменить папку ${folder.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-700/80 hover:text-slate-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFolder(folder);
                    }}
                    title="Удалить папку"
                    aria-label={`Удалить папку ${folder.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* New folder dashed button */}
        <div className="pt-3">
          <button
            type="button"
            onClick={onCreateFolder}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700/90 px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors duration-150 hover:border-slate-500 hover:bg-slate-800/50 hover:text-slate-200"
          >
            <Plus className="h-4 w-4" />
            <span>Новая папка</span>
          </button>
        </div>
      </nav>

      {/* Subtle footer shortcut trigger */}
      <div className="border-t border-slate-800/80 px-3 py-2.5">
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
        >
          <span className="flex items-center gap-2">
            <Keyboard className="h-3.5 w-3.5 text-slate-500" />
            <span>Горячие клавиши</span>
          </span>
          <span className="font-mono text-[11px] text-slate-500">⌘K · N · ?</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <div className="hidden h-full lg:block no-print">{content}</div>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden no-print">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};
