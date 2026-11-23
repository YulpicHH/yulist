import { Folder, Task } from '../types/todo';
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
