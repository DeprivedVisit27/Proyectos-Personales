(function () {
  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W, H, frame = 0;
  var dots = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  var COLORS = [
    [0, 200, 255],
    [120, 80, 255],
    [0, 230, 160],
  ];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    init();
  }

  function init() {
    var count = Math.floor((W * H) / 18000);
    dots = [];
    for (var i = 0; i < count; i++) {
      dots.push({
        x:  rand(0, W),
        y:  rand(0, H),
        vx: rand(-0.35, 0.35),
        vy: rand(-0.35, 0.35),
        r:  rand(2, 3.5),
        c:  COLORS[Math.floor(Math.random() * COLORS.length)],
        pulse: rand(0, Math.PI * 2),
      });
    }
  }

  function draw() {
    frame++;

    /* fully transparent — dot grid CSS shows through */
    ctx.clearRect(0, 0, W, H);

    /* move dots, bounce off walls */
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > W) d.vx *= -1;
      if (d.y < 0 || d.y > H) d.vy *= -1;
      d.pulse += 0.022;
    }

    /* connections */
    ctx.lineWidth = 0.7;
    for (var a = 0; a < dots.length - 1; a++) {
      for (var b = a + 1; b < dots.length; b++) {
        var dx   = dots[a].x - dots[b].x;
        var dy   = dots[a].y - dots[b].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          var op = (1 - dist / 160) * 0.5;
          var c  = dots[a].c;
          ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + op + ')';
          ctx.beginPath();
          ctx.moveTo(dots[a].x, dots[a].y);
          ctx.lineTo(dots[b].x, dots[b].y);
          ctx.stroke();
        }
      }
    }

    /* dots with glow */
    for (var k = 0; k < dots.length; k++) {
      var dot = dots[k];
      var c   = dot.c;
      var pulsedR = dot.r * (0.85 + 0.15 * Math.sin(dot.pulse));
      ctx.shadowColor = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',1)';
      ctx.shadowBlur  = 16;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, pulsedR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.95)';
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();
