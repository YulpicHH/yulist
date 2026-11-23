import React from 'react';
import { ChevronDown, RotateCcw, Search, X } from 'lucide-react';
import { DeadlineFilter, StatusFilter } from '../types/todo';

interface FilterToolbarProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (val: StatusFilter) => void;
  deadlineFilter: DeadlineFilter;
  onDeadlineChange: (val: DeadlineFilter) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  searchInputRef,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  deadlineFilter,
  onDeadlineChange,
  hasActiveFilters,
  onResetFilters,
}) => {
  return (
    <div className="rounded-xl border border-slate-800/90 bg-[#131C2E]/85 p-2.5 backdrop-blur-xs">
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
        {/* Search input */}
        <div className="relative md:col-span-5">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по задачам и подзадачам..."
            aria-label="Поиск задач"
            className="h-10 w-full rounded-lg border border-slate-800 bg-[#0D1424] pr-14 pl-10 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Очистить поиск"
              className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] text-slate-500">
              ⌘K
            </span>
          )}
        </div>

        {/* Status filter */}
        <div className="relative md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
            aria-label="Фильтр по статусу"
            className="h-10 w-full appearance-none rounded-lg border border-slate-800 bg-[#0D1424] pr-9 pl-3.5 text-sm text-slate-200 transition-colors focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="completed">Выполненные</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>

        {/* Deadline filter */}
        <div className={`relative ${hasActiveFilters ? 'md:col-span-3' : 'md:col-span-4'}`}>
          <select
            value={deadlineFilter}
            onChange={(e) => onDeadlineChange(e.target.value as DeadlineFilter)}
            aria-label="Фильтр по дедлайну"
            className="h-10 w-full appearance-none rounded-lg border border-slate-800 bg-[#0D1424] pr-9 pl-3.5 text-sm text-slate-200 transition-colors focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Любой дедлайн</option>
            <option value="today">Сегодня</option>
            <option value="urgent">Срочные (&lt; 24ч)</option>
            <option value="week">На этой неделе</option>
            <option value="overdue">Просроченные</option>
            <option value="none">Без дедлайна</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>

        {/* Reset button when filtered */}
        {hasActiveFilters && (
          <div className="md:col-span-1">
            <button
              type="button"
              onClick={onResetFilters}
              title="Сбросить фильтры"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-[#0D1424] px-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800/70 hover:text-white whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span className="md:hidden">Сбросить</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
