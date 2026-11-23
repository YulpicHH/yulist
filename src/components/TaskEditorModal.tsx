import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Clock, Plus, Trash2, X } from 'lucide-react';
import { Folder, Subtask, Task } from '../types/todo';
import { combineDueDate, splitDueDate, toLocalDateKey } from '../utils/dateUtils';

interface TaskEditorModalProps {
  task: Task | null;
  folders: Folder[];
  onClose: () => void;
  onSave: (
    taskId: string,
    updates: {
      title: string;
      folderId: string | null;
      dueDate: string | null;
      completed: boolean;
      subtasks: Subtask[];
    }
  ) => void;
  onDelete: (taskId: string) => void;
}

export const TaskEditorModal: React.FC<TaskEditorModalProps> = ({
  task,
  folders,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('23:59');
  const [completed, setCompleted] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setFolderId(task.folderId ?? '');
    const split = splitDueDate(task.dueDate);
    setDate(split.date);
    setTime(split.time);
    setCompleted(task.completed);
    setSubtasks(task.subtasks.map((s) => ({ ...s })));
    setNewSubtask('');
  }, [task]);

  if (!task) return null;

  const applyPreset = (offsetDays: number, presetTime: string) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDate(toLocalDateKey(d));
    setTime(presetTime);
  };

  const handleAddSubtask = () => {
    const trimmed = newSubtask.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: trimmed,
        completed: false,
      },
    ]);
    setNewSubtask('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(task.id, {
      title: title.trim(),
      folderId: folderId || null,
      dueDate: combineDueDate(date, time),
      completed,
      subtasks: subtasks.filter((s) => s.title.trim().length > 0),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-editor-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#141D2F] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <h2 id="task-editor-title" className="font-display text-base font-semibold text-slate-100">
            Редактировать задачу
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
          {/* Title */}
          <div>
            <label htmlFor="edit-task-title" className="mb-1.5 block text-xs font-medium text-slate-400">
              Название
            </label>
            <input
              id="edit-task-title"
              type="text"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-700/90 bg-[#0D1424] px-3.5 text-sm text-slate-100 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Folder & Status */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-task-folder" className="mb-1.5 block text-xs font-medium text-slate-400">
                Папка
              </label>
              <div className="relative">
                <select
                  id="edit-task-folder"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="h-10 w-full appearance-none rounded-lg border border-slate-700/90 bg-[#0D1424] pr-8 pl-3 text-sm text-slate-200 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Статус</span>
              <button
                type="button"
                onClick={() => setCompleted((c) => !c)}
                className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors ${
                  completed
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700/90 bg-[#0D1424] text-slate-300 hover:border-slate-600'
                }`}
              >
                <Check className="h-4 w-4" />
                <span>{completed ? 'Выполнена' : 'В работе'}</span>
              </button>
            </div>
          </div>

          {/* Exact deadline date & time */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Дедлайн (дата и точное время)</span>
              </label>
              {date && (
                <button
                  type="button"
                  onClick={() => {
                    setDate('');
                    setTime('23:59');
                  }}
                  className="text-xs text-slate-400 hover:text-red-400"
                >
                  Убрать
                </button>
              )}
            </div>

            <div className="grid grid-cols-12 gap-2.5">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Дата дедлайна"
                className="col-span-7 h-10 rounded-lg border border-slate-700/90 bg-[#0D1424] px-3 font-mono text-xs text-slate-100 tabular-nums focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={!date}
                aria-label="Время дедлайна"
                className="col-span-5 h-10 rounded-lg border border-slate-700/90 bg-[#0D1424] px-3 font-mono text-xs text-slate-100 tabular-nums focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-45"
              />
            </div>

            {/* Quick deadline presets */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset(0, '23:59')}
                className="rounded-md bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              >
                Сегодня 23:59
              </button>
              <button
                type="button"
                onClick={() => applyPreset(1, '18:00')}
                className="rounded-md bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              >
                Завтра 18:00
              </button>
              <button
                type="button"
                onClick={() => applyPreset(3, '23:59')}
                className="rounded-md bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              >
                Через 3 дня
              </button>
              <button
                type="button"
                onClick={() => applyPreset(7, '23:59')}
                className="rounded-md bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              >
                Через неделю
              </button>
            </div>
          </div>

          {/* Subtasks editor */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Подзадачи</span>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {subtasks.filter((s) => s.completed).length}/{subtasks.length}
              </span>
            </div>

            <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg bg-[#0D1424] p-2.5">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSubtasks((prev) =>
                        prev.map((s) => (s.id === sub.id ? { ...s, completed: !s.completed } : s))
                      )
                    }
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                      sub.completed
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {sub.completed && <Check className="h-3 w-3 stroke-[3]" />}
                  </button>
                  <input
                    type="text"
                    value={sub.title}
                    onChange={(e) =>
                      setSubtasks((prev) =>
                        prev.map((s) => (s.id === sub.id ? { ...s, title: e.target.value } : s))
                      )
                    }
                    className={`h-8 flex-1 rounded bg-transparent px-1.5 text-sm focus:bg-slate-800/60 focus:outline-none ${
                      sub.completed ? 'text-slate-500 line-through' : 'text-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setSubtasks((prev) => prev.filter((s) => s.id !== sub.id))}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-red-400"
                    aria-label="Удалить подзадачу"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Добавить подзадачу..."
                  className="h-8 flex-1 rounded-md border border-slate-800 bg-[#141D2F] px-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-800 px-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Добавить</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/12"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Удалить</span>
            </button>

            <div className="flex items-center gap-2">
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
                Сохранить
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
