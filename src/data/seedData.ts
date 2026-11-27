import { Folder, Note, NoteFolder, Task } from '../types/todo';
import { toLocalDateTimeString } from '../utils/dateUtils';

export function createInitialFolders(): Folder[] {
  const created = new Date().toISOString();
  return [
    { id: 'folder-trpo', name: 'TRPO', color: 'blue', createdAt: created },
    { id: 'folder-proga', name: 'proga', color: 'indigo', createdAt: created },
    { id: 'folder-math', name: 'математика', color: 'cyan', createdAt: created },
    { id: 'folder-discrete', name: 'Дискретка', color: 'emerald', createdAt: created },
    { id: 'folder-physics', name: 'Физика', color: 'amber', createdAt: created },
    { id: 'folder-saod', name: 'SAOD', color: 'coral', createdAt: created },
    { id: 'folder-front-java', name: 'front JAVA', color: 'rose', createdAt: created },
  ];
}

export function createInitialTasks(): Task[] {
  const now = new Date();
  const createdIso = now.toISOString();

  // Task 1: Completed math exam prep (past date)
  const t1Date = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  t1Date.setHours(18, 0, 0, 0);

  // Task 2: Completed physics task with 1 subtask
  const t2Date = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  t2Date.setHours(19, 30, 0, 0);

  // Task 3: Urgent RGR due in ~21 hours 49 minutes (matches user mockup urgency highlight)
  const t3Date = new Date(now.getTime() + (21 * 60 + 49) * 60 * 1000);

  // Task 4: Upcoming programming task due in ~4 days 21 hours 49 minutes with 1/2 subtasks done
  const t4Date = new Date(now.getTime() + (4 * 24 * 60 + 21 * 60 + 49) * 60 * 1000);

  return [
    {
      id: 'task-seed-1',
      title: 'Подготовиться к кр по матеше',
      folderId: 'folder-math',
      dueDate: toLocalDateTimeString(t1Date),
      completed: true,
      order: 0,
      subtasks: [],
      createdAt: createdIso,
      completedAt: createdIso,
    },
    {
      id: 'task-seed-2',
      title: 'Физика',
      folderId: 'folder-physics',
      dueDate: toLocalDateTimeString(t2Date),
      completed: true,
      order: 1,
      subtasks: [
        {
          id: 'sub-seed-2-1',
          title: 'лабораторная работа',
          completed: false,
        },
      ],
      createdAt: createdIso,
      completedAt: createdIso,
    },
    {
      id: 'task-seed-3',
      title: 'РГР',
      folderId: 'folder-trpo',
      dueDate: toLocalDateTimeString(t3Date),
      completed: false,
      order: 2,
      subtasks: [
        {
          id: 'sub-seed-3-1',
          title: 'доделать',
          completed: false,
        },
      ],
      createdAt: createdIso,
      completedAt: null,
    },
    {
      id: 'task-seed-4',
      title: 'Прога',
      folderId: 'folder-proga',
      dueDate: toLocalDateTimeString(t4Date),
      completed: false,
      order: 3,
      subtasks: [
        {
          id: 'sub-seed-4-1',
          title: 'исследование',
          completed: true,
        },
        {
          id: 'sub-seed-4-2',
          title: 'работа',
          completed: false,
        },
      ],
      createdAt: createdIso,
      completedAt: null,
    },
  ];
}

export function createInitialNoteFolders(): NoteFolder[] {
  const created = new Date().toISOString();
  return [
    { id: 'nfolder-lectures', name: 'Лекции', color: 'blue', createdAt: created },
    { id: 'nfolder-summaries', name: 'Конспекты', color: 'emerald', createdAt: created },
    { id: 'nfolder-personal', name: 'Личное', color: 'amber', createdAt: created },
  ];
}

export function createInitialNotes(): Note[] {
  const now = new Date();
  const isoNow = now.toISOString();
  const earlier = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString();

  const dueSoon = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  dueSoon.setHours(20, 0, 0, 0);

  return [
    {
      id: 'note-seed-1',
      title: 'План подготовки к сессии',
      content:
        'Главный фокус этой недели — закрыть долги заранее.\nЗакрыть лабораторные по физике\nПроверить расчётную часть в РГР по TRPO\nПовторить билеты по дискретной математике\nСдать итоговую лабораторную по физике',
      blocks: [
        {
          id: 'blk-s1-1',
          type: 'paragraph',
          runs: [
            { text: 'Главный фокус этой недели — ' },
            { text: 'закрыть долги заранее', bold: true, highlight: 'rgba(245, 158, 11, 0.28)' },
            { text: ', чтобы оставить минимум день запаса перед каждой сдачей.' },
          ],
        },
        {
          id: 'blk-s1-2',
          type: 'checklist',
          checked: true,
          runs: [{ text: 'Закрыть лабораторные по физике' }],
        },
        {
          id: 'blk-s1-3',
          type: 'checklist',
          checked: false,
          runs: [{ text: 'Проверить расчётную часть в РГР по TRPO' }],
        },
        {
          id: 'blk-s1-4',
          type: 'checklist',
          checked: false,
          runs: [{ text: 'Повторить билеты по дискретной математике', italic: true }],
        },
        {
          id: 'blk-s1-5',
          type: 'task',
          taskData: {
            title: 'Сдать итоговую лабораторную по физике',
            dueDate: toLocalDateTimeString(dueSoon),
            completed: false,
            linkedTaskId: null,
            subtasks: [
              { id: 'nsub-1', title: 'Оформить графики и выводы', completed: true },
              { id: 'nsub-2', title: 'Загрузить отчёт преподавателю', completed: false },
            ],
          },
        },
      ],
      folderId: 'nfolder-summaries',
      pinned: true,
      createdAt: earlier,
      updatedAt: isoNow,
    },
    {
      id: 'note-seed-2',
      title: 'Заметки с лекции по TRPO',
      content:
        'Основные принципы архитектуры\nРазделение ответственности (SRP)\nЯвные контракты между модулями\nТрассируемость требований от ТЗ к тестам',
      blocks: [
        {
          id: 'blk-s2-1',
          type: 'heading',
          runs: [{ text: 'Основные принципы архитектуры' }],
        },
        {
          id: 'blk-s2-2',
          type: 'bullet',
          bulletStyle: 'star',
          runs: [
            { text: 'Разделение ответственности (SRP)', bold: true, color: '#60A5FA' },
            { text: ' — каждый модуль отвечает за одну задачу' },
          ],
        },
        {
          id: 'blk-s2-3',
          type: 'bullet',
          bulletStyle: 'dot',
          runs: [{ text: 'Явные контракты между модулями' }],
        },
        {
          id: 'blk-s2-4',
          type: 'bullet',
          bulletStyle: 'square',
          runs: [{ text: 'Трассируемость требований от ТЗ к тестам' }],
        },
      ],
      folderId: 'nfolder-lectures',
      pinned: false,
      createdAt: yesterday,
      updatedAt: earlier,
    },
    {
      id: 'note-seed-3',
      title: 'Идеи для пет-проекта',
      content:
        'Быстрый локальный планировщик на MacBook с горячими клавишами, папками и заметками.\nМгновенный старт и работа офлайн\nЧистая тёмная тема macOS',
      blocks: [
        {
          id: 'blk-s3-1',
          type: 'paragraph',
          runs: [
            { text: 'Быстрый локальный планировщик на MacBook с ' },
            { text: 'горячими клавишами', color: '#34D399', bold: true },
            { text: ', папками и заметками.' },
          ],
        },
        {
          id: 'blk-s3-2',
          type: 'bullet',
          bulletStyle: 'heart',
          runs: [{ text: 'Мгновенный старт и работа офлайн' }],
        },
        {
          id: 'blk-s3-3',
          type: 'bullet',
          bulletStyle: 'heart',
          runs: [{ text: 'Чистая тёмная тема macOS' }],
        },
      ],
      folderId: 'nfolder-personal',
      pinned: false,
      createdAt: yesterday,
      updatedAt: yesterday,
    },
  ];
}
