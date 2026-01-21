export const wins = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

export function checkWinner(board, player) {
  return wins.find(w => w.every(i => board[i] === player));
}

export function minimax(board, player) {
  if (checkWinner(board, "X")) return { score: -10 };
  if (checkWinner(board, "O")) return { score: 10 };
  if (board.every(c => c)) return { score: 0 };

  const moves = [];
  board.forEach((v,i) => {
    if (!v) {
      board[i] = player;
      const score = minimax(board, player === "O" ? "X" : "O").score;
      board[i] = "";
      moves.push({ index: i, score });
    }
  });

  return player === "O"
    ? moves.reduce((a,b)=>a.score>b.score?a:b)
    : moves.reduce((a,b)=>a.score<b.score?a:b);
}
