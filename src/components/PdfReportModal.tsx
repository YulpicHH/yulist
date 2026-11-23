import React, { useState } from 'react';
import { Check, FileText, Printer, X } from 'lucide-react';
import { Folder, PdfExportOptions, Task } from '../types/todo';
import { getDeadlineInfo, pluralizeRu } from '../utils/dateUtils';

interface PrintableReportProps {
  title: string;
  tasks: Task[];
  foldersById: Map<string, Folder>;
  options: PdfExportOptions;
  nowMs: number;
  preview?: boolean;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({
  title,
  tasks,
  foldersById,
  options,
  nowMs,
  preview = false,
}) => {
  const visibleTasks = options.includeCompleted ? tasks : tasks.filter((t) => !t.completed);
  const completedCount = visibleTasks.filter((t) => t.completed).length;
  const activeCount = visibleTasks.length - completedCount;

  const generatedLabel = new Date(nowMs).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={
        preview
          ? 'rounded-xl bg-white p-6 text-slate-900 shadow-inner'
          : 'print-only bg-white text-slate-900'
      }
    >
      {/* Report header */}
      <header className="flex items-end justify-between border-b-2 border-slate-900 pb-3">
        <div>
          <div className="text-xs font-semibold tracking-wide text-slate-500">yulist</div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{title}</h1>
        </div>
        <div className="text-right font-mono text-xs text-slate-600 tabular-nums">
          <div>Сформировано: {generatedLabel}</div>
          <div className="mt-0.5">
            {pluralizeRu(visibleTasks.length, 'задача', 'задачи', 'задач')} · активных: {activeCount} · выполнено: {completedCount}
          </div>
        </div>
      </header>

      {/* Tasks table */}
      {visibleTasks.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          По выбранным параметрам задач для экспорта нет.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-slate-200">
          {visibleTasks.map((task, idx) => {
            const folder = task.folderId ? foldersById.get(task.folderId) : undefined;
            const info = getDeadlineInfo(task, nowMs);
            const doneSubs = task.subtasks.filter((s) => s.completed).length;

            return (
              <div key={task.id} className="break-inside-avoid py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 font-mono text-xs font-semibold text-slate-400 tabular-nums">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-semibold ${
                          task.completed ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-600">
                        {folder && <span className="font-medium text-slate-700">{folder.name}</span>}
                        {folder && <span aria-hidden="true">·</span>}
                        <span className="font-mono tabular-nums">
                          {task.dueDate ? `${info.fullDateText} (${info.statusText})` : 'Без дедлайна'}
                        </span>
                        {task.subtasks.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              Подзадачи: {doneSubs}/{task.subtasks.length}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 font-mono text-xs font-semibold ${
                      task.completed
                        ? 'text-emerald-700'
                        : info.severity === 'overdue'
                          ? 'text-red-700'
                          : info.severity === 'urgent'
                            ? 'text-amber-700'
                            : 'text-slate-600'
                    }`}
                  >
                    {task.completed ? 'Выполнено' : 'В работе'}
                  </span>
                </div>

                {options.includeSubtasks && task.subtasks.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-7">
                    {task.subtasks.map((sub) => (
                      <li key={sub.id} className="flex items-center gap-2 text-xs text-slate-700">
                        <span className="font-mono text-slate-500">
                          {sub.completed ? '[✓]' : '[ ]'}
                        </span>
                        <span className={sub.completed ? 'text-slate-400 line-through' : ''}>
                          {sub.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface PdfReportModalProps {
  isOpen: boolean;
  reportTitle: string;
  filteredTasks: Task[];
  allTasks: Task[];
  foldersById: Map<string, Folder>;
  options: PdfExportOptions;
  onChangeOptions: (opts: PdfExportOptions) => void;
  nowMs: number;
  onClose: () => void;
  onExportComplete: (message: string) => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  reportTitle,
  filteredTasks,
  allTasks,
  foldersById,
  options,
  onChangeOptions,
  nowMs,
  onClose,
  onExportComplete,
}) => {
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const sourceTasks = options.scope === 'filtered' ? filteredTasks : allTasks;
  const effectiveTitle = options.scope === 'filtered' ? reportTitle : 'Все задачи — yulist';

  const handleExport = async () => {
    setExporting(true);
    try {
      if (window.yulistDesktop?.isElectron && window.yulistDesktop.exportPdf) {
        const slug = new Date().toISOString().slice(0, 10);
        const result = await window.yulistDesktop.exportPdf(`yulist-отчет-${slug}.pdf`);
        if (result.saved) {
          onExportComplete('PDF-отчёт успешно сохранён');
          onClose();
        }
      } else {
        // Trigger clean vector print-to-PDF layout in browser
        window.setTimeout(() => {
          window.print();
        }, 60);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-800 bg-[#141D2F] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-blue-400" />
            <h2 id="pdf-modal-title" className="font-display text-base font-semibold text-slate-100">
              Экспорт в PDF
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Export options bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-[#101828] px-5 py-3">
          <div className="flex items-center gap-1 rounded-lg bg-[#0B111E] p-1">
            <button
              type="button"
              onClick={() => onChangeOptions({ ...options, scope: 'filtered' })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                options.scope === 'filtered'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Текущий список ({filteredTasks.length})
            </button>
            <button
              type="button"
              onClick={() => onChangeOptions({ ...options, scope: 'all' })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                options.scope === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Все задачи ({allTasks.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <label className="flex cursor-pointer items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={options.includeCompleted}
                onClick={() =>
                  onChangeOptions({ ...options, includeCompleted: !options.includeCompleted })
                }
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  options.includeCompleted
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-slate-600'
                }`}
              >
                {options.includeCompleted && <Check className="h-3 w-3 stroke-[3]" />}
              </button>
              <span>Выполненные</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={options.includeSubtasks}
                onClick={() =>
                  onChangeOptions({ ...options, includeSubtasks: !options.includeSubtasks })
                }
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  options.includeSubtasks
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-slate-600'
                }`}
              >
                {options.includeSubtasks && <Check className="h-3 w-3 stroke-[3]" />}
              </button>
              <span>Подзадачи</span>
            </label>
          </div>
        </div>

        {/* Live paper preview */}
        <div className="flex-1 overflow-y-auto bg-[#0D1424] p-5">
          <PrintableReport
            title={effectiveTitle}
            tasks={sourceTasks}
            foldersById={foldersById}
            options={options}
            nowMs={nowMs}
            preview
          />
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 px-5 py-3.5">
          <p className="text-xs text-slate-400">
            {window.yulistDesktop?.isElectron
              ? 'Сохранит векторный PDF-файл напрямую на ваш MacBook.'
              : 'В диалоге печати macOS выберите «Сохранить как PDF» для идеального векторного качества.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-700/80 px-4 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Закрыть
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={handleExport}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-400 disabled:opacity-60 whitespace-nowrap"
            >
              <Printer className="h-4 w-4" />
              <span>{exporting ? 'Сохранение...' : 'Сохранить PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
