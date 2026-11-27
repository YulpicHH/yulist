import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ClipboardList,
  Folder as FolderIcon,
  Globe,
  NotebookPen,
  PanelLeftOpen,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { CalendarView } from './components/CalendarView';
import { FilterToolbar } from './components/FilterToolbar';
import { DeleteFolderModal, FolderFormModal } from './components/FolderModal';
import { NoteLockSettingsModal, NoteUnlockModal } from './components/NoteLockModals';
import { NotesView } from './components/NotesView';
import { QuickAddBar } from './components/QuickAddBar';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Sidebar } from './components/Sidebar';
import { TaskCard } from './components/TaskCard';
import { TaskEditorModal } from './components/TaskEditorModal';
import { UndoToast } from './components/UndoToast';
import { useYulistStore } from './hooks/useYulistStore';
import { Folder, FolderColorId, getFolderColor, Note, NoteTaskData, Task } from './types/todo';
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

  const taskSearchInputRef = useRef<HTMLInputElement | null>(null);
  const noteSearchInputRef = useRef<HTMLInputElement | null>(null);
  const newTaskInputRef = useRef<HTMLInputElement | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('yulist_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isElectronMac =
    typeof window !== 'undefined' &&
    Boolean(window.yulistDesktop?.isElectron && window.yulistDesktop?.platform === 'darwin');

  useEffect(() => {
    try {
      window.localStorage.setItem('yulist_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
    } catch {
      // Ignore storage errors
    }
  }, [sidebarCollapsed]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [folderModalState, setFolderModalState] = useState<{
    open: boolean;
    folder: Folder | null;
    kind: 'tasks' | 'notes';
  }>({ open: false, folder: null, kind: 'tasks' });
  const [deletingFolderState, setDeletingFolderState] = useState<{
    folder: Folder | null;
    kind: 'tasks' | 'notes';
  }>({ folder: null, kind: 'tasks' });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [unlockingNote, setUnlockingNote] = useState<Note | null>(null);
  const [lockSettingsNote, setLockSettingsNote] = useState<Note | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [noteFocusSignal, setNoteFocusSignal] = useState(0);

  // Drag-and-drop state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragTargetTaskId, setDragTargetTaskId] = useState<string | null>(null);

  const isNotesMode = store.viewMode === 'notes';

  const anyModalOpen =
    Boolean(editingTask) ||
    folderModalState.open ||
    Boolean(deletingFolderState.folder) ||
    shortcutsOpen ||
    Boolean(unlockingNote) ||
    Boolean(lockSettingsNote);

  const closeAllModals = useCallback(() => {
    setEditingTask(null);
    setFolderModalState((prev) => ({ ...prev, open: false, folder: null }));
    setDeletingFolderState((prev) => ({ ...prev, folder: null }));
    setShortcutsOpen(false);
    setUnlockingNote(null);
    setLockSettingsNote(null);
  }, []);

  const handleCreateNoteAndFocus = useCallback(() => {
    store.addNote();
    setNoteFocusSignal((n) => n + 1);
  }, [store]);

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
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
          document.activeElement.blur();
          return;
        }
        if (isNotesMode && store.selectedNoteId) {
          e.preventDefault();
          store.setSelectedNoteId(null);
        }
        return;
      }

      if (mod && key === 'k') {
        e.preventDefault();
        closeAllModals();
        const input = isNotesMode ? noteSearchInputRef.current : taskSearchInputRef.current;
        input?.focus();
        input?.select();
        return;
      }

      if (mod && e.code === 'Backslash') {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
        return;
      }

      if (mod && e.shiftKey && key === 'n') {
        e.preventDefault();
        closeAllModals();
        if (isNotesMode) {
          handleCreateNoteAndFocus();
        } else {
          newTaskInputRef.current?.focus();
        }
        return;
      }

      // Single-key shortcuts only when no modal is open and not typing in an input
      if (anyModalOpen || isEditableElement(e.target) || mod || e.altKey) {
        return;
      }

      if (key === 'n') {
        e.preventDefault();
        if (isNotesMode) {
          handleCreateNoteAndFocus();
        } else {
          newTaskInputRef.current?.focus();
        }
      } else if (e.key === '1') {
        e.preventDefault();
        store.setViewMode('list');
      } else if (e.key === '2') {
        e.preventDefault();
        store.setViewMode('calendar');
      } else if (e.key === '3') {
        e.preventDefault();
        store.setViewMode('notes');
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [anyModalOpen, closeAllModals, handleCreateNoteAndFocus, isNotesMode, store]);

  // Contextual heading & sidebar data depending on Tasks vs Notes mode
  const currentActiveFolder = isNotesMode ? store.activeNoteFolder : store.activeFolder;
  const activeHeading = currentActiveFolder
    ? currentActiveFolder.name
    : isNotesMode
      ? 'Все заметки'
      : 'Все задачи';
  const activeFolderColor = getFolderColor(currentActiveFolder?.color);
  const completedInView = store.filteredTasks.filter((t) => t.completed).length;

  const handleSaveFolder = (name: string, color: FolderColorId) => {
    if (folderModalState.kind === 'notes') {
      if (folderModalState.folder) {
        store.updateNoteFolder(folderModalState.folder.id, name, color);
      } else {
        const created = store.addNoteFolder(name, color);
        if (created) {
          store.setActiveNoteFolderId(created.id);
        }
      }
    } else {
      if (folderModalState.folder) {
        store.updateFolder(folderModalState.folder.id, name, color);
      } else {
        const created = store.addFolder(name, color);
        if (created) {
          store.setActiveFolderId(created.id);
        }
      }
    }
  };

  const handleConfirmDeleteFolder = (
    folderId: string,
    mode: 'move' | 'delete',
    targetFolderId: string | null
  ) => {
    if (deletingFolderState.kind === 'notes') {
      store.deleteNoteFolder(folderId, mode, targetFolderId);
    } else {
      store.deleteFolder(folderId, mode, targetFolderId);
    }
  };

  const handleQuickAddOnDate = (dateKey: string) => {
    setPrefillDate(dateKey);
  };

  const handleAddTaskFromNote = (taskData: NoteTaskData, folderId: string | null) => {
    const created = store.addTask({
      title: taskData.title,
      folderId,
      dueDate: taskData.dueDate,
      subtasks: taskData.subtasks.map((s) => ({ ...s })),
    });
    if (created) {
      store.showToast(`Задача «${created.title}» добавлена в общий список`);
    }
    return created;
  };

  const handleRequestOpenNote = (note: Note) => {
    if (note.lock) {
      setUnlockingNote(note);
      return;
    }
    store.setSelectedNoteId(note.id);
  };

  const { setSelectedNoteId } = store;
  const handleNoteUnlocked = useCallback(
    (noteId: string) => {
      setUnlockingNote(null);
      setSelectedNoteId(noteId);
    },
    [setSelectedNoteId]
  );

  return (
    <>
      <div className="yulist-canvas flex h-screen w-full overflow-hidden text-slate-100">
        {/* Left contextual folders sidebar (Task folders in List/Calendar, Note folders in Notes) */}
        <Sidebar
          sectionLabel={isNotesMode ? 'Папки заметок' : 'Папки'}
          allLabel={isNotesMode ? 'Все заметки' : 'Все'}
          folders={isNotesMode ? store.noteFolders : store.folders}
          folderCounts={isNotesMode ? store.noteFolderCounts : store.folderCounts}
          activeFolderId={isNotesMode ? store.activeNoteFolderId : store.activeFolderId}
          onSelectFolder={isNotesMode ? store.setActiveNoteFolderId : store.setActiveFolderId}
          onCreateFolder={() =>
            setFolderModalState({
              open: true,
              folder: null,
              kind: isNotesMode ? 'notes' : 'tasks',
            })
          }
          onEditFolder={(folder) =>
            setFolderModalState({
              open: true,
              folder,
              kind: isNotesMode ? 'notes' : 'tasks',
            })
          }
          onDeleteFolder={(folder) =>
            setDeletingFolderState({
              folder,
              kind: isNotesMode ? 'notes' : 'tasks',
            })
          }
          onOpenShortcuts={() => setShortcutsOpen(true)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main workspace viewport */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top workspace header */}
          <header
            className={`flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 bg-[#0B111E]/75 py-3.5 pr-4 backdrop-blur-md lg:pr-7 macos-drag ${
              isElectronMac
                ? sidebarCollapsed
                  ? 'pl-[88px]'
                  : 'pl-[88px] lg:pl-7'
                : 'pl-4 lg:pl-7'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5 macos-no-drag">
              {/* Mobile/half-screen open folders button */}
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                title="Показать панель папок"
                aria-label="Показать панель папок"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#131C2E] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>

              {/* Desktop restore folders button when sidebar is collapsed */}
              {sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  title="Показать панель папок (⌘\)"
                  aria-label="Показать панель папок"
                  className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#131C2E] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white lg:flex"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              )}

              {currentActiveFolder ? (
                <FolderIcon className={`h-5 w-5 shrink-0 ${activeFolderColor.textClass}`} />
              ) : isNotesMode ? (
                <NotebookPen className="h-5 w-5 shrink-0 text-blue-400" />
              ) : (
                <Globe className="h-5 w-5 shrink-0 text-blue-400" />
              )}

              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h1 className="truncate font-display text-xl font-bold tracking-tight text-slate-100">
                  {activeHeading}
                </h1>
                <span className="font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                  {isNotesMode
                    ? pluralizeRu(store.filteredNotes.length, 'заметка', 'заметки', 'заметок')
                    : `${pluralizeRu(store.filteredTasks.length, 'задача', 'задачи', 'задач')}${
                        store.filteredTasks.length > 0 ? ` · ${completedInView} выполнено` : ''
                      }`}
                </span>
              </div>
            </div>

            {/* Right controls: Segmented Список / Календарь / Заметки switcher */}
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

                <button
                  type="button"
                  role="tab"
                  aria-selected={store.viewMode === 'notes'}
                  onClick={() => store.setViewMode('notes')}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                    store.viewMode === 'notes'
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <NotebookPen className="h-3.5 w-3.5 shrink-0" />
                  <span>Заметки</span>
                </button>
              </div>
            </div>
          </header>

          {/* Scrollable content area */}
          <main className="flex-1 overflow-y-auto px-5 py-5 lg:px-7">
            <div className="mx-auto max-w-[1260px] space-y-4">
              {isNotesMode ? (
                <NotesView
                  notes={store.filteredNotes}
                  selectedNote={store.selectedNote}
                  noteFolders={store.noteFolders}
                  noteFoldersById={store.noteFoldersById}
                  taskFolders={store.folders}
                  activeNoteFolderId={store.activeNoteFolderId}
                  searchQuery={store.noteSearchQuery}
                  searchInputRef={noteSearchInputRef}
                  nowMs={store.nowMs}
                  onSearchChange={store.setNoteSearchQuery}
                  onRequestOpenNote={handleRequestOpenNote}
                  onOpenLockSettings={(note) => setLockSettingsNote(note)}
                  onCloseNote={() => store.setSelectedNoteId(null)}
                  onCreateNote={handleCreateNoteAndFocus}
                  onUpdateNote={store.updateNote}
                  onTogglePin={store.toggleNotePinned}
                  onDeleteNote={store.deleteNote}
                  onDeleteNotes={store.deleteNotes}
                  onAddTaskFromNote={handleAddTaskFromNote}
                  focusTitleSignal={noteFocusSignal}
                />
              ) : (
                <>
                  {/* Filter, search & sort bar */}
                  <FilterToolbar
                    searchInputRef={taskSearchInputRef}
                    searchQuery={store.searchQuery}
                    onSearchChange={store.setSearchQuery}
                    statusFilter={store.statusFilter}
                    onStatusChange={store.setStatusFilter}
                    deadlineFilter={store.deadlineFilter}
                    onDeadlineChange={store.setDeadlineFilter}
                    showSort={store.viewMode === 'list'}
                    sortMode={store.taskSortMode}
                    onSortChange={store.setTaskSortMode}
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

                  {/* Active task view (List or Calendar) */}
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
                              folder={
                                task.folderId ? store.foldersById.get(task.folderId) : undefined
                              }
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
                                  if (store.taskSortMode !== 'manual') {
                                    store.setTaskSortMode('manual');
                                  }
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
                </>
              )}
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
        itemKind={folderModalState.kind}
        onClose={() => setFolderModalState((prev) => ({ ...prev, open: false, folder: null }))}
        onSave={handleSaveFolder}
      />

      <DeleteFolderModal
        folder={deletingFolderState.folder}
        itemKind={deletingFolderState.kind}
        itemCount={
          deletingFolderState.folder
            ? (deletingFolderState.kind === 'notes'
                ? store.noteFolderCounts[deletingFolderState.folder.id]?.total
                : store.folderCounts[deletingFolderState.folder.id]?.total) ?? 0
            : 0
        }
        otherFolders={(deletingFolderState.kind === 'notes'
          ? store.noteFolders
          : store.folders
        ).filter((f) => f.id !== deletingFolderState.folder?.id)}
        onClose={() => setDeletingFolderState((prev) => ({ ...prev, folder: null }))}
        onConfirm={handleConfirmDeleteFolder}
      />

      <NoteUnlockModal
        note={unlockingNote}
        onClose={() => setUnlockingNote(null)}
        onUnlocked={handleNoteUnlocked}
      />

      <NoteLockSettingsModal
        note={lockSettingsNote}
        onClose={() => setLockSettingsNote(null)}
        onSaveLock={store.setNoteLock}
      />

      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <UndoToast
        toast={store.toast}
        onUndo={store.undoLastDelete}
        onDismiss={store.dismissToast}
      />
    </>
  );
}
