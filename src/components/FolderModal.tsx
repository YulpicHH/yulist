import React, { useEffect, useState } from 'react';
import { Check, Folder as FolderIcon, Trash2, X } from 'lucide-react';
import { Folder, FOLDER_COLORS, FolderColorId } from '../types/todo';
import { pluralizeRu } from '../utils/dateUtils';

interface FolderFormModalProps {
  isOpen: boolean;
  editingFolder: Folder | null;
  itemKind?: 'tasks' | 'notes';
  onClose: () => void;
  onSave: (name: string, color: FolderColorId) => void;
}

export const FolderFormModal: React.FC<FolderFormModalProps> = ({
  isOpen,
  editingFolder,
  itemKind = 'tasks',
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState<FolderColorId>('blue');

  useEffect(() => {
    if (!isOpen) return;
    if (editingFolder) {
      setName(editingFolder.name);
      setColor(editingFolder.color);
    } else {
      setName('');
      setColor('blue');
    }
  }, [isOpen, editingFolder]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#141D2F] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <h2 id="folder-modal-title" className="font-display text-base font-semibold text-slate-100">
            {editingFolder
              ? itemKind === 'notes'
                ? 'Редактировать папку заметок'
                : 'Редактировать папку'
              : itemKind === 'notes'
                ? 'Новая папка заметок'
                : 'Новая папка'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="folder-name-input" className="mb-1.5 block text-xs font-medium text-slate-400">
              Название папки
            </label>
            <input
              id="folder-name-input"
              type="text"
              autoFocus
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                itemKind === 'notes'
                  ? 'Например: Лекции, Конспекты, Идеи...'
                  : 'Например: Алгоритмы, Диплом...'
              }
              className="h-10 w-full rounded-lg border border-slate-700/90 bg-[#0D1424] px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium text-slate-400">Цвет папки</span>
            <div className="grid grid-cols-4 gap-2">
              {FOLDER_COLORS.map((item) => {
                const selected = item.id === color;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setColor(item.id)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                      selected
                        ? 'border-blue-500/70 bg-blue-500/12 text-slate-100'
                        : 'border-slate-800 bg-[#0D1424] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <FolderIcon className={`h-3.5 w-3.5 shrink-0 ${item.textClass}`} />
                    <span className="truncate">{item.label}</span>
                    {selected && <Check className="ml-auto h-3 w-3 shrink-0 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-700/80 px-4 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="h-9 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-400"
            >
              {editingFolder ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeleteFolderModalProps {
  folder: Folder | null;
  itemCount: number;
  itemKind?: 'tasks' | 'notes';
  otherFolders: Folder[];
  onClose: () => void;
  onConfirm: (folderId: string, mode: 'move' | 'delete', targetFolderId: string | null) => void;
}

export const DeleteFolderModal: React.FC<DeleteFolderModalProps> = ({
  folder,
  itemCount,
  itemKind = 'tasks',
  otherFolders,
  onClose,
  onConfirm,
}) => {
  const [mode, setMode] = useState<'move' | 'delete'>('move');
  const [targetFolderId, setTargetFolderId] = useState<string>('');

  useEffect(() => {
    if (folder) {
      setMode('move');
      setTargetFolderId('');
    }
  }, [folder]);

  if (!folder) return null;

  const countLabel =
    itemKind === 'notes'
      ? pluralizeRu(itemCount, 'заметка', 'заметки', 'заметок')
      : pluralizeRu(itemCount, 'задача', 'задачи', 'задач');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-folder-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#141D2F] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <h2 id="delete-folder-title" className="font-display text-base font-semibold text-slate-100">
            Удалить папку «{folder.name}»?
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm text-slate-300">
          {itemCount === 0 ? (
            <p className="text-slate-400">
              {itemKind === 'notes'
                ? 'В этой папке сейчас нет заметок. Папка будет удалена безвозвратно.'
                : 'В этой папке сейчас нет задач. Папка будет удалена безвозвратно.'}
            </p>
          ) : (
            <>
              <p className="text-slate-300">
                В папке находится{' '}
                <span className="font-mono font-semibold text-slate-100 tabular-nums">
                  {countLabel}
                </span>
                . Что сделать с ними?
              </p>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-800 bg-[#0D1424] p-3">
                  <input
                    type="radio"
                    name="delete-folder-mode"
                    checked={mode === 'move'}
                    onChange={() => setMode('move')}
                    className="mt-1 accent-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-200">
                      {itemKind === 'notes' ? 'Сохранить заметки' : 'Сохранить задачи'}
                    </div>
                    <div className="mt-1.5">
                      <select
                        value={targetFolderId}
                        disabled={mode !== 'move'}
                        onChange={(e) => setTargetFolderId(e.target.value)}
                        className="h-9 w-full rounded-md border border-slate-700 bg-[#141D2F] px-2.5 text-xs text-slate-200 focus:border-blue-500/70 focus:outline-none disabled:opacity-50"
                      >
                        <option value="">
                          {itemKind === 'notes'
                            ? 'Оставить без папки (в «Все заметки»)'
                            : 'Оставить без папки (в разделе «Все»)'}
                        </option>
                        {otherFolders.map((f) => (
                          <option key={f.id} value={f.id}>
                            Перенести в «{f.name}»
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-800 bg-[#0D1424] p-3">
                  <input
                    type="radio"
                    name="delete-folder-mode"
                    checked={mode === 'delete'}
                    onChange={() => setMode('delete')}
                    className="accent-red-500"
                  />
                  <span className="font-medium text-red-300">
                    {itemKind === 'notes'
                      ? 'Удалить папку вместе со всеми заметками'
                      : 'Удалить папку вместе со всеми задачами'}
                  </span>
                </label>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-700/80 px-4 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(folder.id, mode, targetFolderId || null);
                onClose();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-500/90 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Удалить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
