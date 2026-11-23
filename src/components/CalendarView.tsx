import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
} from 'lucide-react';
import { Folder, getFolderColor, Task } from '../types/todo';
import {
  buildMonthCalendarGrid,
  formatRussianFullDate,
  getDeadlineInfo,
  MONTHS_RU,
  parseDueDate,
  pluralizeRu,
  toLocalDateKey,
  WEEKDAYS_SHORT_RU,
} from '../utils/dateUtils';

interface CalendarViewProps {
  tasks: Task[];
  foldersById: Map<string, Folder>;
  nowMs: number;
  onEditTask: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onQuickAddOnDate: (dateKey: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  foldersById,
  nowMs,
  onEditTask,
  onToggleComplete,
  onQuickAddOnDate,
}) => {
  const nowDate = useMemo(() => new Date(nowMs), [nowMs]);
  const [cursorYear, setCursorYear] = useState<number>(() => nowDate.getFullYear());
  const [cursorMonth, setCursorMonth] = useState<number>(() => nowDate.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => toLocalDateKey(nowDate));

  const cells = useMemo(
    () => buildMonthCalendarGrid(cursorYear, cursorMonth, nowDate),
    [cursorYear, cursorMonth, nowDate]
  );

  const { tasksByDate, undatedTasks } = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    const undated: Task[] = [];

    tasks.forEach((task) => {
      const parsed = parseDueDate(task.dueDate);
      if (!parsed) {
        undated.push(task);
        return;
      }
      const key = toLocalDateKey(parsed);
      const list = grouped.get(key) ?? [];
      list.push(task);
      grouped.set(key, list);
    });

    // Sort tasks inside each day by exact time
    grouped.forEach((list) => {
      list.sort((a, b) => {
        const da = parseDueDate(a.dueDate)?.getTime() ?? 0;
        const db = parseDueDate(b.dueDate)?.getTime() ?? 0;
        return da - db;
      });
    });

    return { tasksByDate: grouped, undatedTasks: undated };
  }, [tasks]);

  const selectedDayTasks = tasksByDate.get(selectedDateKey) ?? [];

  const handlePrevMonth = () => {
    if (cursorMonth === 0) {
      setCursorMonth(11);
      setCursorYear((y) => y - 1);
    } else {
      setCursorMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (cursorMonth === 11) {
      setCursorMonth(0);
      setCursorYear((y) => y + 1);
    } else {
      setCursorMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const today = new Date();
    setCursorYear(today.getFullYear());
    setCursorMonth(today.getMonth());
    setSelectedDateKey(toLocalDateKey(today));
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      {/* Main monthly grid */}
      <div className="rounded-xl border border-slate-800/90 bg-[#161F31]/90 p-4 xl:col-span-8">
        {/* Month navigation header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="h-4 w-4 text-blue-400" />
            <h2 className="font-display text-lg font-semibold text-slate-100">
              {MONTHS_RU[cursorMonth]} {cursorYear}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Предыдущий месяц"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#0D1424] text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleGoToday}
              className="h-8 rounded-lg border border-slate-800 bg-[#0D1424] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-white whitespace-nowrap"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Следующий месяц"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#0D1424] text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAYS_SHORT_RU.map((day, idx) => (
            <div
              key={day}
              className={`py-1.5 text-xs font-medium ${
                idx >= 5 ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 42-day grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell) => {
            const dayTasks = tasksByDate.get(cell.dateKey) ?? [];
            const isSelected = cell.dateKey === selectedDateKey;
            const visibleTasks = dayTasks.slice(0, 3);
            const overflowCount = dayTasks.length - visibleTasks.length;

            return (
              <div
                key={cell.dateKey}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDateKey(cell.dateKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedDateKey(cell.dateKey);
                  }
                }}
                className={`min-h-[96px] cursor-pointer rounded-lg border p-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
                  isSelected
                    ? 'border-blue-500/60 bg-blue-500/12'
                    : cell.inCurrentMonth
                      ? 'border-slate-800/80 bg-[#0F172A]/85 hover:border-slate-700 hover:bg-[#131D33]'
                      : 'border-slate-800/40 bg-[#0B111E]/60 text-slate-600 hover:border-slate-800'
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 font-mono text-xs tabular-nums ${
                      cell.isToday
                        ? 'bg-blue-500 font-semibold text-white'
                        : cell.inCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {dayTasks.length > 0 && (
                    <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {visibleTasks.map((task) => {
                    const folder = task.folderId ? foldersById.get(task.folderId) : undefined;
                    const color = getFolderColor(folder?.color);
                    const info = getDeadlineInfo(task, nowMs);

                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateKey(cell.dateKey);
                          onEditTask(task);
                        }}
                        className={`flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-[11px] transition-colors ${
                          task.completed
                            ? 'bg-slate-800/40 text-slate-500 line-through'
                            : info.severity === 'overdue'
                              ? 'bg-red-500/15 text-red-200 hover:bg-red-500/25'
                              : info.severity === 'urgent'
                                ? 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                                : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700/80'
                        }`}
                        title={`${task.title} (${info.timeText})`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            task.completed ? 'bg-emerald-500/70' : color.dotClass
                          }`}
                        />
                        <span className="shrink-0 font-mono text-[10px] opacity-75 tabular-nums">
                          {info.timeText}
                        </span>
                        <span className="truncate">{task.title}</span>
                      </button>
                    );
                  })}

                  {overflowCount > 0 && (
                    <div className="px-1 font-mono text-[10px] text-slate-400">
                      +{overflowCount} ещё
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side: Selected day inspector + Undated tasks */}
      <div className="flex flex-col gap-5 xl:col-span-4">
        <section className="rounded-xl border border-slate-800/90 bg-[#161F31]/90 p-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="font-display text-sm font-semibold capitalize text-slate-100">
                {formatRussianFullDate(selectedDateKey)}
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {selectedDayTasks.length > 0
                  ? pluralizeRu(selectedDayTasks.length, 'задача', 'задачи', 'задач')
                  : 'На этот день дедлайнов нет'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onQuickAddOnDate(selectedDateKey)}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-500/18 px-2.5 text-xs font-medium text-blue-300 ring-1 ring-inset ring-blue-500/30 transition-colors hover:bg-blue-500/28 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Добавить</span>
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {selectedDayTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Выберите дату с задачами или нажмите «Добавить», чтобы создать задачу на этот день.
              </div>
            ) : (
              selectedDayTasks.map((task) => {
                const folder = task.folderId ? foldersById.get(task.folderId) : undefined;
                const folderColor = getFolderColor(folder?.color);
                const info = getDeadlineInfo(task, nowMs);

                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-2.5 rounded-lg bg-[#101726]/80 p-3 transition-colors hover:bg-[#131D31]"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleComplete(task.id)}
                      aria-label={
                        task.completed ? 'Вернуть задачу в активные' : 'Отметить выполненной'
                      }
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        task.completed
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {task.completed && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium ${
                            task.completed ? 'text-slate-500 line-through' : 'text-slate-100'
                          }`}
                        >
                          {task.title}
                        </p>
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                          title="Редактировать"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tabular-nums">
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {info.timeText}
                        </span>
                        <span className="text-slate-700">·</span>
                        <span
                          className={
                            info.severity === 'completed'
                              ? 'text-emerald-400'
                              : info.severity === 'overdue'
                                ? 'text-red-400'
                                : info.severity === 'urgent'
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                          }
                        >
                          {info.statusText}
                        </span>
                        {folder && (
                          <>
                            <span className="text-slate-700">·</span>
                            <span className={`font-sans ${folderColor.textClass}`}>
                              {folder.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Undated tasks list */}
        {undatedTasks.length > 0 && (
          <section className="rounded-xl border border-slate-800/90 bg-[#161F31]/90 p-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <h3 className="font-display text-sm font-semibold text-slate-200">Без дедлайна</h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {undatedTasks.length}
              </span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              {undatedTasks.map((task) => {
                const folder = task.folderId ? foldersById.get(task.folderId) : undefined;
                const color = getFolderColor(folder?.color);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onEditTask(task)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-slate-800/60"
                  >
                    <span
                      className={`truncate ${
                        task.completed ? 'text-slate-500 line-through' : 'text-slate-200'
                      }`}
                    >
                      {task.title}
                    </span>
                    {folder && (
                      <span className={`shrink-0 ${color.textClass}`}>{folder.name}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
