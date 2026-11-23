import React, { useState } from 'react';
import {
  Check,
  CheckSquare,
  Clock,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Folder, getFolderColor, Task } from '../types/todo';
import { getDeadlineInfo } from '../utils/dateUtils';

interface TaskCardProps {
  task: Task;
  displayIndex: number;
  folder: Folder | undefined;
  showFolderLabel: boolean;
  nowMs: number;
  isDragging: boolean;
  isDragTarget: boolean;
  onDragStart: (taskId: string) => void;
  onDragOver: (e: React.DragEvent, taskId: string) => void;
  onDrop: (taskId: string) => void;
  onDragEnd: () => void;
  onToggleComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  displayIndex,
  folder,
  showFolderLabel,
  nowMs,
  isDragging,
  isDragTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleComplete,
  onEdit,
  onDelete,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
}) => {
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskDraft, setSubtaskDraft] = useState('');

  const deadline = getDeadlineInfo(task, nowMs);
  const folderColor = getFolderColor(folder?.color);
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  const handleSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskDraft.trim()) {
      setAddingSubtask(false);
      return;
    }
    onAddSubtask(task.id, subtaskDraft.trim());
    setSubtaskDraft('');
  };

  // Surface and border posture derived strictly from semantic severity (single elevation, no thick left bar)
  const cardSurfaceClasses = (() => {
    if (isDragTarget) {
      return 'border-blue-400/70 bg-[#18243A] ring-2 ring-blue-500/25';
    }
    if (deadline.severity === 'overdue') {
      return 'border-red-500/45 bg-gradient-to-b from-red-500/[0.06] to-[#161F31]/95 hover:border-red-400/60';
    }
    if (deadline.severity === 'urgent') {
      return 'border-amber-500/45 bg-gradient-to-b from-amber-500/[0.06] to-[#161F31]/95 hover:border-amber-400/60';
    }
    return 'border-slate-800/90 bg-[#161F31]/95 hover:border-slate-700/90';
  })();

  const deadlineTextClasses = (() => {
    switch (deadline.severity) {
      case 'completed':
        return 'text-emerald-400';
      case 'overdue':
        return 'text-red-400';
      case 'urgent':
        return 'text-amber-400';
      default:
        return 'text-slate-400';
    }
  })();

  return (
    <article
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(e) => onDragOver(e, task.id)}
      onDrop={() => onDrop(task.id)}
      onDragEnd={onDragEnd}
      className={`group/card flex flex-col justify-between rounded-xl border p-4 transition-all duration-150 ${cardSurfaceClasses} ${
        isDragging ? 'opacity-45 scale-[0.99]' : 'opacity-100'
      }`}
    >
      {/* Top block: Grip + Number + Title + Metadata */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <span
              className="mt-0.5 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-slate-600 transition-colors hover:text-slate-400 active:cursor-grabbing"
              title="Перетащить для изменения порядка"
              aria-hidden="true"
            >
              <GripVertical className="h-4 w-4" />
            </span>

            <span className="mt-0.5 shrink-0 font-mono text-sm font-medium text-slate-500 tabular-nums">
              {displayIndex}.
            </span>

            <h3
              className={`min-w-0 break-words text-[15px] leading-snug font-semibold transition-colors ${
                task.completed ? 'text-slate-400 line-through decoration-slate-600' : 'text-slate-100'
              }`}
            >
              {task.title}
            </h3>
          </div>

          {showFolderLabel && folder && (
            <span
              className={`shrink-0 text-xs font-medium whitespace-nowrap ${folderColor.textClass}`}
            >
              {folder.name}
            </span>
          )}
        </div>

        {/* Clean unboxed inline metadata line: subtask ratio + exact deadline & live countdown */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-6 text-xs">
          {totalSubtasks > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 font-mono tabular-nums ${
                completedSubtasks === totalSubtasks ? 'text-emerald-400' : 'text-slate-300'
              }`}
              title={`Выполнено подзадач: ${completedSubtasks} из ${totalSubtasks}`}
            >
              <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </span>
          )}

          {totalSubtasks > 0 && task.dueDate && (
            <span className="text-slate-700" aria-hidden="true">
              ·
            </span>
          )}

          {task.dueDate ? (
            <div className="inline-flex flex-wrap items-center gap-x-1.5 font-mono tabular-nums">
              <Clock className={`h-3.5 w-3.5 shrink-0 ${deadlineTextClasses}`} />
              <span className="font-medium text-slate-200">{deadline.shortDate}</span>
              <span className="text-slate-500">{deadline.timeText}</span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className={`font-medium ${deadlineTextClasses}`}>
                {deadline.statusText}
              </span>
            </div>
          ) : (
            <span className="font-mono text-slate-500">
              {task.completed ? 'выполнено' : 'Без дедлайна'}
            </span>
          )}
        </div>
      </div>

      {/* Hairline separator & Action controls */}
      <div className="mt-4">
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
          <button
            type="button"
            onClick={() => setAddingSubtask((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Подзадача</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(task)}
              title="Редактировать задачу"
              aria-label={`Редактировать задачу ${task.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-amber-300"
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onToggleComplete(task.id)}
              title={task.completed ? 'Вернуть в активные' : 'Отметить выполненной'}
              aria-label={
                task.completed
                  ? `Отменить выполнение задачи ${task.title}`
                  : `Выполнить задачу ${task.title}`
              }
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                task.completed
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-inset ring-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800/70 text-slate-400 ring-1 ring-inset ring-slate-700/80 hover:bg-slate-700/80 hover:text-slate-100'
              }`}
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(task.id)}
              title="Удалить задачу"
              aria-label={`Удалить задачу ${task.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Subtasks list (subtle recessed tint without extra nested border boxes) */}
        {(totalSubtasks > 0 || addingSubtask) && (
          <div className="mt-3 space-y-1.5 rounded-lg bg-[#101726]/75 px-3 py-2.5">
            {task.subtasks.map((sub) => (
              <div
                key={sub.id}
                className="group/sub flex items-center justify-between gap-2 py-0.5"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={sub.completed}
                    onClick={() => onToggleSubtask(task.id, sub.id)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                      sub.completed
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-slate-600 bg-slate-900/70 hover:border-slate-400'
                    }`}
                  >
                    {sub.completed && <Check className="h-3 w-3 stroke-[3]" />}
                  </button>
                  <span
                    className={`truncate text-[13px] transition-colors ${
                      sub.completed ? 'text-slate-500 line-through' : 'text-slate-200'
                    }`}
                  >
                    {sub.title}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => onDeleteSubtask(task.id, sub.id)}
                  title="Удалить подзадачу"
                  aria-label={`Удалить подзадачу ${sub.title}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:bg-slate-800 hover:text-red-400 group-hover/sub:opacity-100 focus-visible:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {addingSubtask && (
              <form onSubmit={handleSubtaskSubmit} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  autoFocus
                  value={subtaskDraft}
                  onChange={(e) => setSubtaskDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setAddingSubtask(false);
                      setSubtaskDraft('');
                    }
                  }}
                  placeholder="Новая подзадача и Enter..."
                  className="h-8 flex-1 rounded-md border border-slate-700/90 bg-[#0B111E] px-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500/60 focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-8 rounded-md bg-blue-500/20 px-2.5 text-xs font-medium text-blue-300 hover:bg-blue-500/30"
                >
                  Добавить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingSubtask(false);
                    setSubtaskDraft('');
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  aria-label="Отменить добавление подзадачи"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
