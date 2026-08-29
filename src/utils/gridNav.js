// Excel-style arrow-key navigation between entry cells.
//
// Opt-in and DOM-based: an input only participates once it's given
// data-nav-group / data-nav-row / data-nav-col attributes and this
// handler wired to its onKeyDown. Nothing else in the app is affected.
//
// Behavior, matching a spreadsheet:
//   - Up/Down always jump to the nearest cell above/below in the same
//     column (same data-nav-group + data-nav-col), skipping over any
//     row that doesn't have a cell there (e.g. a collapsed section, or
//     a column that only exists on some rows).
//   - Left/Right jump to the adjacent cell in the same row, but only
//     when the caret is already at the start (Left) or end (Right) of
//     the field's text — so normal cursor movement while editing a
//     value is untouched, and the jump only kicks in once you've
//     reached the edge, the same way it feels in a spreadsheet cell
//     that's in edit mode.
//   - The destination cell's value is auto-selected on arrival, so
//     typing immediately overwrites it rather than appending.
//
// Rows/columns are just numbers you assign when rendering — they only
// need to be consistent within one data-nav-group, not globally
// unique or contiguous (a running counter across a filtered/collapsed
// list works fine).
export function handleGridArrowNav(e) {
  const key = e.key;
  if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight') {
    return;
  }

  const el = e.target;
  const group = el?.dataset?.navGroup;
  if (!group) return;

  const row = Number(el.dataset.navRow);
  const col = Number(el.dataset.navCol);
  if (Number.isNaN(row) || Number.isNaN(col)) return;

  const deltaRow = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0;
  const deltaCol = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0;

  if (deltaCol !== 0) {
    // Only hijack Left/Right once the caret is at the boundary text
    // is being edited normally otherwise. Elements without a text
    // selection concept (shouldn't occur here, but just in case)
    // fall through and navigate immediately.
    const hasSelection = typeof el.selectionStart === 'number';
    if (hasSelection) {
      const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
      const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
      if (deltaCol === -1 && !atStart) return;
      if (deltaCol === 1 && !atEnd) return;
    }
  }

  // Up/Down on a number input would otherwise trigger the native
  // spinner's increment/decrement — always suppress that for
  // grid-wired cells, whether or not a destination cell is found
  // (e.g. pressing Up on the top row).
  if (deltaRow !== 0) {
    e.preventDefault();
  }

  const candidates = document.querySelectorAll(`[data-nav-group="${group}"]`);
  let best = null;
  let bestDist = Infinity;

  candidates.forEach(cand => {
    if (cand === el) return;
    const cRow = Number(cand.dataset.navRow);
    const cCol = Number(cand.dataset.navCol);
    if (Number.isNaN(cRow) || Number.isNaN(cCol)) return;

    if (deltaRow !== 0) {
      if (cCol !== col) return;
      if (deltaRow === -1 && cRow >= row) return;
      if (deltaRow === 1 && cRow <= row) return;
      const dist = Math.abs(cRow - row);
      if (dist < bestDist) { bestDist = dist; best = cand; }
    } else {
      if (cRow !== row) return;
      if (deltaCol === -1 && cCol >= col) return;
      if (deltaCol === 1 && cCol <= col) return;
      const dist = Math.abs(cCol - col);
      if (dist < bestDist) { bestDist = dist; best = cand; }
    }
  });

  if (best) {
    e.preventDefault();
    best.focus();
    if (typeof best.select === 'function') {
      best.select();
    }
  }
}
