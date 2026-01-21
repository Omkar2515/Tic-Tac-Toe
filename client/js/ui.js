export function renderBoard(board, boardEl, onCellClick) {
  // Clear board
  boardEl.innerHTML = "";

  // Ensure grid styling (defensive)
  boardEl.style.display = "grid";
  boardEl.style.gridTemplateColumns = "repeat(3, 1fr)";
  boardEl.style.gap = "10px";

  board.forEach((value, index) => {
    const cell = document.createElement("div");

    cell.textContent = value;
    cell.dataset.index = index;

    // Explicit cell styling so it is ALWAYS visible
    cell.style.height = "90px";
    cell.style.background = "#94B4C1";
    cell.style.borderRadius = "10px";
    cell.style.display = "flex";
    cell.style.alignItems = "center";
    cell.style.justifyContent = "center";
    cell.style.fontSize = "36px";
    cell.style.cursor = "pointer";
    cell.style.userSelect = "none";

    cell.onclick = () => onCellClick(index);

    boardEl.appendChild(cell);
  });
}

export function clearAnimations(boardEl) {
  if (!boardEl) return;
  [...boardEl.children].forEach(cell => {
    cell.style.animation = "none";
  });
}
