(function () {
  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var W, H, COLS, ROWS;
  var BS = 22;
  var grid = [];

  var PIECES = [
    { cells: [[0,0],[1,0],[2,0],[3,0]], color: '#00ffff' },  // I
    { cells: [[0,0],[1,0],[0,1],[1,1]], color: '#ffff00' },  // O
    { cells: [[1,0],[0,1],[1,1],[2,1]], color: '#c792ea' },  // T
    { cells: [[1,0],[2,0],[0,1],[1,1]], color: '#00ff41' },  // S
    { cells: [[0,0],[1,0],[1,1],[2,1]], color: '#ff6ac1' },  // Z
    { cells: [[0,0],[0,1],[1,1],[2,1]], color: '#82aaff' },  // J
    { cells: [[2,0],[0,1],[1,1],[2,1]], color: '#f78c6c' },  // L
  ];

  function rotate(cells) {
    var maxR = 0;
    for (var i = 0; i < cells.length; i++) if (cells[i][1] > maxR) maxR = cells[i][1];
    return cells.map(function (c) { return [maxR - c[1], c[0]]; });
  }

  function initGrid() {
    COLS = Math.floor(W / BS);
    ROWS = Math.floor(H / BS);
    grid = [];
    for (var r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(null));
  }

  var falling = [];

  function spawnPiece(startY) {
    var p = PIECES[Math.floor(Math.random() * PIECES.length)];
    var cells = p.cells.map(function (c) { return c.slice(); });
    var rots = Math.floor(Math.random() * 4);
    for (var r = 0; r < rots; r++) cells = rotate(cells);

    var maxCol = 0;
    for (var i = 0; i < cells.length; i++) if (cells[i][0] > maxCol) maxCol = cells[i][0];
    var col = Math.floor(Math.random() * Math.max(1, COLS - maxCol - 1));

    return {
      cells: cells,
      color: p.color,
      col: col,
      y: startY !== undefined ? startY : -(4 + Math.floor(Math.random() * 10)) * BS,
      speed: 0.4 + Math.random() * 0.5,
      alpha: 0.5 + Math.random() * 0.35,
    };
  }

  function willCollide(piece, nextY) {
    for (var i = 0; i < piece.cells.length; i++) {
      var gc = piece.col + piece.cells[i][0];
      var gr = Math.floor((nextY + (piece.cells[i][1] + 1) * BS) / BS);
      if (gr >= ROWS) return true;
      if (gc < 0 || gc >= COLS) return true;
      if (gr >= 0 && gr < ROWS && grid[gr][gc]) return true;
    }
    return false;
  }

  function lockPiece(piece) {
    for (var i = 0; i < piece.cells.length; i++) {
      var gc = piece.col + piece.cells[i][0];
      var gr = Math.round(piece.y / BS) + piece.cells[i][1];
      gr = Math.max(0, Math.min(ROWS - 1, gr));
      if (gc >= 0 && gc < COLS) {
        grid[gr][gc] = { color: piece.color, alpha: piece.alpha };
      }
    }
  }

  function drawBlock(x, y, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillRect(x + 1, y + 1, BS - 2, BS - 2);
    ctx.shadowBlur = 0;

    // Top-left highlight
    ctx.globalAlpha = alpha * 0.45;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 2, y + 2, BS - 4, 3);
    ctx.fillRect(x + 2, y + 2, 3, BS - 4);

    // Bottom-right shadow
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 2, y + BS - 5, BS - 4, 3);
    ctx.fillRect(x + BS - 5, y + 2, 3, BS - 4);

    ctx.globalAlpha = 1;
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initGrid();
    var count = Math.max(4, Math.floor(W / 180));
    falling = [];
    for (var i = 0; i < count; i++) {
      falling.push(spawnPiece(Math.random() * H * 0.5));
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  var tick = 0;

  function frame() {
    tick++;

    if (tick % 2 === 0) {
      ctx.clearRect(0, 0, W, H);

      // Draw landed pieces and fade them out slowly
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var cell = grid[r][c];
          if (!cell) continue;
          drawBlock(c * BS, r * BS, cell.color, cell.alpha);
          cell.alpha -= 0.0008;
          if (cell.alpha <= 0) grid[r][c] = null;
        }
      }

      // Draw and move falling pieces
      for (var i = falling.length - 1; i >= 0; i--) {
        var p = falling[i];

        for (var j = 0; j < p.cells.length; j++) {
          drawBlock(
            (p.col + p.cells[j][0]) * BS,
            p.y + p.cells[j][1] * BS,
            p.color, p.alpha
          );
        }

        var nextY = p.y + p.speed;

        if (willCollide(p, nextY)) {
          lockPiece(p);
          falling.splice(i, 1);
        } else {
          p.y = nextY;
          if (p.y > H + BS * 6) falling.splice(i, 1);
        }
      }

      // Keep pieces flowing from the top
      var MAX = Math.max(4, Math.floor(W / 180));
      while (falling.length < MAX) falling.push(spawnPiece());
    }

    requestAnimationFrame(frame);
  }

  frame();
})();
