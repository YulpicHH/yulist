import {
  BulletStyle,
  NOTE_HIGHLIGHT_COLORS,
  NOTE_TEXT_COLORS,
  NoteBlock,
  TextRun,
} from '../types/todo';

export function createBlockId(prefix = 'blk'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Convert hex '#60A5FA' to canonical lowercase rgb tuple for matching browser computed styles
function hexToRgbTuple(hex: string): string | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return `${r},${g},${b}`;
}

function extractRgbTuple(cssColor: string): string | null {
  const trimmed = cssColor.trim().toLowerCase();
  if (!trimmed || trimmed === 'transparent' || trimmed === 'inherit' || trimmed === 'initial') {
    return null;
  }
  if (trimmed.startsWith('#')) {
    return hexToRgbTuple(trimmed);
  }
  const match = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return null;
  return `${match[1]},${match[2]},${match[3]}`;
}

const ALLOWED_TEXT_COLOR_BY_RGB = new Map<string, string>();
NOTE_TEXT_COLORS.forEach((c) => {
  if (!c.value) return;
  const tuple = hexToRgbTuple(c.value);
  if (tuple) ALLOWED_TEXT_COLOR_BY_RGB.set(tuple, c.value);
});

const ALLOWED_HIGHLIGHT_BY_RGB = new Map<string, string>();
NOTE_HIGHLIGHT_COLORS.forEach((c) => {
  if (!c.value) return;
  const tuple = extractRgbTuple(c.value);
  if (tuple) ALLOWED_HIGHLIGHT_BY_RGB.set(tuple, c.value);
});

export function normalizeAllowedTextColor(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const tuple = extractRgbTuple(raw);
  if (!tuple) return undefined;
  return ALLOWED_TEXT_COLOR_BY_RGB.get(tuple);
}

export function normalizeAllowedHighlightColor(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === 'rgba(0, 0, 0, 0)' || trimmed === 'transparent') return undefined;
  const tuple = extractRgbTuple(trimmed);
  if (!tuple) return undefined;
  return ALLOWED_HIGHLIGHT_BY_RGB.get(tuple);
}

/** Merge adjacent runs that share identical formatting */
export function normalizeRuns(runs: TextRun[]): TextRun[] {
  const merged: TextRun[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const clean: TextRun = { text: run.text };
    if (run.bold) clean.bold = true;
    if (run.italic) clean.italic = true;
    if (run.underline) clean.underline = true;
    if (run.strike) clean.strike = true;
    const validColor = normalizeAllowedTextColor(run.color);
    if (validColor) clean.color = validColor;
    const validHighlight = normalizeAllowedHighlightColor(run.highlight);
    if (validHighlight) clean.highlight = validHighlight;

    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.bold === clean.bold &&
      prev.italic === clean.italic &&
      prev.underline === clean.underline &&
      prev.strike === clean.strike &&
      prev.color === clean.color &&
      prev.highlight === clean.highlight
    ) {
      prev.text += clean.text;
    } else {
      merged.push(clean);
    }
  }
  return merged;
}

/**
 * Safely renders structured TextRun[] into a DOM element using ONLY document.createElement
 * and textContent (zero innerHTML / zero unsafe HTML parsing).
 */
export function renderRunsToElement(el: HTMLElement, runs: TextRun[] | undefined): void {
  const fragment = document.createDocumentFragment();
  const normalized = normalizeRuns(runs ?? []);

  for (const run of normalized) {
    const hasFormatting =
      run.bold || run.italic || run.underline || run.strike || run.color || run.highlight;

    if (!hasFormatting) {
      fragment.appendChild(document.createTextNode(run.text));
      continue;
    }

    const span = document.createElement('span');
    span.textContent = run.text;

    if (run.bold) span.style.fontWeight = '700';
    if (run.italic) span.style.fontStyle = 'italic';

    const decorations: string[] = [];
    if (run.underline) decorations.push('underline');
    if (run.strike) decorations.push('line-through');
    if (decorations.length > 0) {
      span.style.textDecoration = decorations.join(' ');
    }

    if (run.color) {
      span.style.color = run.color;
    }

    if (run.highlight) {
      span.style.backgroundColor = run.highlight;
      span.style.borderRadius = '3px';
      span.style.padding = '0 2px';
    }

    fragment.appendChild(span);
  }

  el.replaceChildren(fragment);
}

interface InheritedFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  highlight?: string;
}

function walkNodeToRuns(node: Node, inherited: InheritedFormat, out: TextRun[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (text.length > 0) {
      out.push({
        text,
        ...inherited,
      });
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();

  if (tag === 'BR') {
    return;
  }

  const next: InheritedFormat = { ...inherited };

  if (tag === 'B' || tag === 'STRONG') next.bold = true;
  if (tag === 'I' || tag === 'EM') next.italic = true;
  if (tag === 'U') next.underline = true;
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') next.strike = true;

  if (tag === 'FONT') {
    const attrColor = el.getAttribute('color');
    const normalized = normalizeAllowedTextColor(attrColor);
    if (normalized) next.color = normalized;
  }

  const style = el.style;
  if (style) {
    if (style.fontWeight === 'bold' || style.fontWeight === '700' || style.fontWeight === '600') {
      next.bold = true;
    } else if (style.fontWeight === 'normal' || style.fontWeight === '400') {
      next.bold = false;
    }

    if (style.fontStyle === 'italic') {
      next.italic = true;
    } else if (style.fontStyle === 'normal') {
      next.italic = false;
    }

    const deco = (style.textDecorationLine || style.textDecoration || '').toLowerCase();
    if (deco.includes('underline')) next.underline = true;
    if (deco.includes('line-through')) next.strike = true;

    if (style.color) {
      const validColor = normalizeAllowedTextColor(style.color);
      if (validColor) {
        next.color = validColor;
      } else if (style.color === 'inherit' || style.color === 'rgb(226, 232, 240)') {
        next.color = undefined;
      }
    }

    if (style.backgroundColor) {
      const validHl = normalizeAllowedHighlightColor(style.backgroundColor);
      if (validHl) {
        next.highlight = validHl;
      } else if (
        style.backgroundColor === 'transparent' ||
        style.backgroundColor === 'rgba(0, 0, 0, 0)'
      ) {
        next.highlight = undefined;
      }
    }
  }

  for (let i = 0; i < el.childNodes.length; i += 1) {
    walkNodeToRuns(el.childNodes[i], next, out);
  }
}

/** Parse a contentEditable DOM element back into clean, normalized TextRun[] */
export function parseElementToRuns(el: HTMLElement): TextRun[] {
  const raw: TextRun[] = [];
  for (let i = 0; i < el.childNodes.length; i += 1) {
    walkNodeToRuns(el.childNodes[i], {}, raw);
  }
  return normalizeRuns(raw);
}

export function getRunsPlainText(runs: TextRun[] | undefined): string {
  if (!runs || runs.length === 0) return '';
  return runs.map((r) => r.text).join('');
}

export function extractNotePlainText(blocks: NoteBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.type === 'task' && block.taskData) {
      if (block.taskData.title.trim()) {
        lines.push(block.taskData.title.trim());
      }
      for (const sub of block.taskData.subtasks) {
        if (sub.title.trim()) lines.push(sub.title.trim());
      }
    } else {
      const text = getRunsPlainText(block.runs).trim();
      if (text) lines.push(text);
    }
  }
  return lines.join('\n');
}

export function migratePlainTextToBlocks(content: string): NoteBlock[] {
  const rawLines = content.split('\n');
  if (rawLines.length === 0 || (rawLines.length === 1 && !rawLines[0])) {
    return [{ id: createBlockId(), type: 'paragraph', runs: [] }];
  }

  return rawLines.map((line) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^([-•*★▪♥])\s+(.*)$/);
    if (bulletMatch) {
      const sym = bulletMatch[1];
      let bulletStyle: BulletStyle = 'dot';
      if (sym === '★' || sym === '*') bulletStyle = 'star';
      else if (sym === '▪') bulletStyle = 'square';
      else if (sym === '♥') bulletStyle = 'heart';
      return {
        id: createBlockId(),
        type: 'bullet',
        bulletStyle,
        runs: bulletMatch[2] ? [{ text: bulletMatch[2] }] : [],
      };
    }

    return {
      id: createBlockId(),
      type: 'paragraph',
      runs: line ? [{ text: line }] : [],
    };
  });
}

export interface NoteBlockStats {
  checklistTotal: number;
  checklistDone: number;
  taskTotal: number;
  taskDone: number;
}

export function getNoteBlockStats(blocks: NoteBlock[]): NoteBlockStats {
  let checklistTotal = 0;
  let checklistDone = 0;
  let taskTotal = 0;
  let taskDone = 0;

  for (const block of blocks) {
    if (block.type === 'checklist') {
      checklistTotal += 1;
      if (block.checked) checklistDone += 1;
    } else if (block.type === 'task' && block.taskData) {
      taskTotal += 1;
      if (block.taskData.completed) taskDone += 1;
    }
  }

  return { checklistTotal, checklistDone, taskTotal, taskDone };
}
