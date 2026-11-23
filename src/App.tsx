import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ClipboardList,
  FileText,
  Folder as FolderIcon,
  Globe,
  Menu,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { CalendarView } from './components/CalendarView';
import { FilterToolbar } from './components/FilterToolbar';
import { DeleteFolderModal, FolderFormModal } from './components/FolderModal';
import { PdfReportModal, PrintableReport } from './components/PdfReportModal';
import { QuickAddBar } from './components/QuickAddBar';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Sidebar } from './components/Sidebar';
import { TaskCard } from './components/TaskCard';
import { TaskEditorModal } from './components/TaskEditorModal';
import { UndoToast } from './components/UndoToast';
import { useYulistStore } from './hooks/useYulistStore';
import { Folder, FolderColorId, getFolderColor, PdfExportOptions, Task } from './types/todo';
import { pluralizeRu } from './utils/dateUtils';

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export default function App() {
  const store = useYulistStore();

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const newTaskInputRef = useRef<HTMLInputElement | null>(null);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [folderModalState, setFolderModalState] = useState<{
    open: boolean;
    folder: Folder | null;
  }>({ open: false, folder: null });
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<PdfExportOptions>({
    scope: 'filtered',
    includeCompleted: true,
    includeSubtasks: true,
  });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);

  // Drag-and-drop state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragTargetTaskId, setDragTargetTaskId] = useState<string | null>(null);

  const anyModalOpen =
    Boolean(editingTask) ||
    folderModalState.open ||
    Boolean(deletingFolder) ||
    pdfModalOpen ||
    shortcutsOpen;

  const closeAllModals = useCallback(() => {
    setEditingTask(null);
    setFolderModalState({ open: false, folder: null });
    setDeletingFolder(null);
    setPdfModalOpen(false);
    setShortcutsOpen(false);
  }, []);

  // Global macOS & desktop keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (e.key === 'Escape') {
        if (anyModalOpen) {
          e.preventDefault();
          closeAllModals();
          return;
        }
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      if (mod && key === 'k') {
        e.preventDefault();
        closeAllModals();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (mod && key === 'e') {
        e.preventDefault();
        closeAllModals();
        setPdfModalOpen(true);
        return;
      }

      if (mod && e.shiftKey && key === 'n') {
        e.preventDefault();
        closeAllModals();
        newTaskInputRef.current?.focus();
        return;
      }

      // Single-key shortcuts only when no modal is open and not typing in an input
      if (anyModalOpen || isEditableElement(e.target) || mod || e.altKey) {
        return;
      }

      if (key === 'n') {
        e.preventDefault();
        newTaskInputRef.current?.focus();
      } else if (e.key === '1') {
        e.preventDefault();
        store.setViewMode('list');
      } else if (e.key === '2') {
        e.preventDefault();
        store.setViewMode('calendar');
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [anyModalOpen, closeAllModals, store]);

  const activeHeading = store.activeFolder ? store.activeFolder.name : 'Все задачи';
  const activeFolderColor = getFolderColor(store.activeFolder?.color);
  const completedInView = store.filteredTasks.filter((t) => t.completed).length;

  const handleSaveFolder = (name: string, color: FolderColorId) => {
    if (folderModalState.folder) {
      store.updateFolder(folderModalState.folder.id, name, color);
    } else {
      const created = store.addFolder(name, color);
      if (created) {
        store.setActiveFolderId(created.id);
      }
    }
  };

  const handleQuickAddOnDate = (dateKey: string) => {
    setPrefillDate(dateKey);
  };

  const pdfSourceTasks = pdfOptions.scope === 'filtered' ? store.filteredTasks : store.allTasks;
  const pdfReportTitle =
    pdfOptions.scope === 'filtered' ? activeHeading : 'Все задачи — yulist';

  return (
    <>
      <div className="yulist-canvas flex h-screen w-full overflow-hidden text-slate-100 no-print">
        {/* Left folders sidebar */}
        <Sidebar
          folders={store.folders}
          folderCounts={store.folderCounts}
          activeFolderId={store.activeFolderId}
          onSelectFolder={store.setActiveFolderId}
          onCreateFolder={() => setFolderModalState({ open: true, folder: null })}
          onEditFolder={(folder) => setFolderModalState({ open: true, folder })}
          onDeleteFolder={(folder) => setDeletingFolder(folder)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main workspace viewport */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top workspace header */}
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-800/70 bg-[#0B111E]/75 px-5 py-4 backdrop-blur-md lg:px-7 macos-drag">
            <div className="flex min-w-0 items-center gap-3 macos-no-drag">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Открыть панель папок"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#131C2E] text-slate-300 hover:bg-slate-800 hover:text-white lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>

              {store.activeFolder ? (
                <FolderIcon className={`h-5 w-5 shrink-0 ${activeFolderColor.textClass}`} />
              ) : (
                <Globe className="h-5 w-5 shrink-0 text-blue-400" />
              )}

              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h1 className="truncate font-display text-xl font-bold tracking-tight text-slate-100">
                  {activeHeading}
                </h1>
                <span className="font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                  {pluralizeRu(store.filteredTasks.length, 'задача', 'задачи', 'задач')}
                  {store.filteredTasks.length > 0 && ` · ${completedInView} выполнено`}
                </span>
              </div>
            </div>

            {/* Right controls: Segmented List/Calendar switch + PDF export */}
            <div className="flex items-center gap-2.5 shrink-0 macos-no-drag">
              <div
                className="flex items-center rounded-lg border border-slate-800/90 bg-[#131C2E] p-1"
                role="tablist"
                aria-label="Режим просмотра"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={store.viewMode === 'list'}
                  onClick={() => store.setViewMode('list')}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                    store.viewMode === 'list'
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                  <span>Список</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={store.viewMode === 'calendar'}
                  onClick={() => store.setViewMode('calendar')}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                    store.viewMode === 'calendar'
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>Календарь</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPdfModalOpen(true)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-800/90 bg-[#131C2E] px-3.5 text-xs font-medium text-slate-200 transition-colors duration-150 hover:border-slate-700 hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0"
                title="Экспорт отчёта в PDF (⌘E)"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>PDF</span>
              </button>
            </div>
          </header>

          {/* Scrollable content area */}
          <main className="flex-1 overflow-y-auto px-5 py-5 lg:px-7">
            <div className="mx-auto max-w-[1260px] space-y-4">
              {/* Filter & search bar */}
              <FilterToolbar
                searchInputRef={searchInputRef}
                searchQuery={store.searchQuery}
                onSearchChange={store.setSearchQuery}
                statusFilter={store.statusFilter}
                onStatusChange={store.setStatusFilter}
                deadlineFilter={store.deadlineFilter}
                onDeadlineChange={store.setDeadlineFilter}
                hasActiveFilters={store.hasActiveFilters}
                onResetFilters={store.resetFilters}
              />

              {/* Quick add task bar */}
              <QuickAddBar
                titleInputRef={newTaskInputRef}
                folders={store.folders}
                activeFolderId={store.activeFolderId}
                prefillDate={prefillDate}
                onClearPrefillDate={() => setPrefillDate(null)}
                onAddTask={store.addTask}
              />

              {/* Active view */}
              <div className="pt-1 pb-12">
                {store.viewMode === 'list' ? (
                  store.filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#131C2E]/45 px-6 py-16 text-center">
                      <p className="font-display text-base font-semibold text-slate-200">
                        {store.hasActiveFilters
                          ? 'По текущим фильтрам задачи не найдены'
                          : 'В этой папке пока нет задач'}
                      </p>
                      <p className="mt-1.5 max-w-md text-sm text-slate-400">
                        {store.hasActiveFilters
                          ? 'Попробуйте изменить запрос поиска или сбросить выбранные фильтры.'
                          : 'Добавьте первую задачу в строке выше или нажмите клавишу N для быстрого ввода.'}
                      </p>
                      <div className="mt-5">
                        {store.hasActiveFilters ? (
                          <button
                            type="button"
                            onClick={store.resetFilters}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>Сбросить фильтры</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => newTaskInputRef.current?.focus()}
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-400"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Создать задачу</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {store.filteredTasks.map((task, idx) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          displayIndex={idx + 1}
                          folder={task.folderId ? store.foldersById.get(task.folderId) : undefined}
                          showFolderLabel={store.activeFolderId === 'all'}
                          nowMs={store.nowMs}
                          isDragging={draggingTaskId === task.id}
                          isDragTarget={
                            dragTargetTaskId === task.id && draggingTaskId !== task.id
                          }
                          onDragStart={(id) => setDraggingTaskId(id)}
                          onDragOver={(e, id) => {
                            e.preventDefault();
                            if (draggingTaskId && draggingTaskId !== id) {
                              setDragTargetTaskId(id);
                            }
                          }}
                          onDrop={(targetId) => {
                            if (draggingTaskId && draggingTaskId !== targetId) {
                              store.reorderTasks(draggingTaskId, targetId);
                            }
                            setDraggingTaskId(null);
                            setDragTargetTaskId(null);
                          }}
                          onDragEnd={() => {
                            setDraggingTaskId(null);
                            setDragTargetTaskId(null);
                          }}
                          onToggleComplete={store.toggleTaskCompleted}
                          onEdit={setEditingTask}
                          onDelete={store.deleteTask}
                          onToggleSubtask={store.toggleSubtask}
                          onAddSubtask={store.addSubtask}
                          onDeleteSubtask={store.deleteSubtask}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  <CalendarView
                    tasks={store.filteredTasks}
                    foldersById={store.foldersById}
                    nowMs={store.nowMs}
                    onEditTask={setEditingTask}
                    onToggleComplete={store.toggleTaskCompleted}
                    onQuickAddOnDate={handleQuickAddOnDate}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      <TaskEditorModal
        task={editingTask}
        folders={store.folders}
        onClose={() => setEditingTask(null)}
        onSave={store.updateTask}
        onDelete={store.deleteTask}
      />

      <FolderFormModal
        isOpen={folderModalState.open}
        editingFolder={folderModalState.folder}
        onClose={() => setFolderModalState({ open: false, folder: null })}
        onSave={handleSaveFolder}
      />

      <DeleteFolderModal
        folder={deletingFolder}
        taskCount={deletingFolder ? store.folderCounts[deletingFolder.id]?.total ?? 0 : 0}
        otherFolders={store.folders.filter((f) => f.id !== deletingFolder?.id)}
        onClose={() => setDeletingFolder(null)}
        onConfirm={store.deleteFolder}
      />

      <PdfReportModal
        isOpen={pdfModalOpen}
        reportTitle={activeHeading}
        filteredTasks={store.filteredTasks}
        allTasks={store.allTasks}
        foldersById={store.foldersById}
        options={pdfOptions}
        onChangeOptions={setPdfOptions}
        nowMs={store.nowMs}
        onClose={() => setPdfModalOpen(false)}
        onExportComplete={(msg) => store.showToast(msg)}
      />

      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <UndoToast
        toast={store.toast}
        onUndo={store.undoDeleteTask}
        onDismiss={store.dismissToast}
      />

      {/* Dedicated print-only vector PDF document */}
      <PrintableReport
        title={pdfReportTitle}
        tasks={pdfSourceTasks}
        foldersById={store.foldersById}
        options={pdfOptions}
        nowMs={store.nowMs}
      />
    </>
  );
}
