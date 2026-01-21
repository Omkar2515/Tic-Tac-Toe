export function renderBoard(board, boardEl, onClick) {
  boardEl.innerHTML = "";
  board.forEach((v,i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = v;
    cell.onclick = () => onClick(i);
    boardEl.appendChild(cell);
  });
}

export function animateWin(boardEl, line) {
  [...boardEl.children].forEach((c,i)=>{
    c.classList.add(line.includes(i) ? "win" : "lose");
  });
}

export function clearAnimations(boardEl) {
  boardEl.classList.remove("draw");
  [...boardEl.children].forEach(c => c.classList.remove("win","lose"));
}
