(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, frame = 0;
  let buildings = [], particles = [], nodes = [], streams = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    init();
  }

  function init() {
    const GROUND = H * 0.66;
    buildings = [];
    let x = -30;
    while (x < W + 120) {
      const w = 38 + Math.random() * 100;
      const h = 55 + Math.random() * (GROUND * 0.82);
      const wins = [];
      const cols = Math.max(1, Math.floor((w - 10) / 13));
      const rows = Math.max(1, Math.floor((h - 10) / 15));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > 0.32) {
            wins.push({
              cx: 6 + c * 13 + 5,
              cy: 8 + r * 15 + 5,
              lit: Math.random() > 0.22,
              color: Math.random() > 0.65 ? '0,210,255' : Math.random() > 0.5 ? '160,100,255' : '220,220,255',
              flicker: Math.random() < 0.12,
              phase: Math.random() * Math.PI * 2,
            });
          }
        }
      }
      buildings.push({ x, w, h, wins, accent: Math.random() > 0.72, antenna: Math.random() > 0.6 });
      x += w + 2 + Math.random() * 14;
    }

    particles = Array.from({ length: 80 }, () => mkParticle(true));
    nodes = Array.from({ length: 9 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.5,
      vx: (Math.random() - 0.5) * 0.14, vy: (Math.random() - 0.5) * 0.14,
      r: 1.5 + Math.random() * 2, alpha: 0.25 + Math.random() * 0.45,
    }));
    streams = Array.from({ length: 14 }, mkStream);
  }

  function mkParticle(scatter) {
    return {
      x: Math.random() * W, y: scatter ? Math.random() * H : H + 6,
      vx: (Math.random() - 0.5) * 0.22, vy: -(Math.random() * 0.45 + 0.08),
      size: Math.random() * 1.3 + 0.2, alpha: Math.random() * 0.35 + 0.05,
      color: Math.random() > 0.52 ? '0,210,255' : '255,255,255',
    };
  }

  function mkStream() {
    return {
      x: Math.random() * W, y: -Math.random() * 220,
      speed: 0.7 + Math.random() * 1.6, len: 35 + Math.random() * 130,
      alpha: 0.04 + Math.random() * 0.07,
      color: Math.random() > 0.55 ? '0,210,255' : '160,80,255',
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    frame++;
    const GROUND = H * 0.66;

    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#000008');
    sky.addColorStop(0.6, '#03051a');
    sky.addColorStop(1, '#080d28');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND);

    ctx.fillStyle = '#02020a';
    ctx.fillRect(0, GROUND, W, H - GROUND);

    drawGrid(GROUND);

    const hg = ctx.createLinearGradient(0, GROUND - 90, 0, GROUND + 60);
    hg.addColorStop(0, 'transparent');
    hg.addColorStop(0.35, 'rgba(0,160,255,0.08)');
    hg.addColorStop(0.55, 'rgba(120,20,255,0.06)');
    hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg;
    ctx.fillRect(0, GROUND - 90, W, 150);

    drawStreams();
    drawBuildings(GROUND);
    drawParticles();
    drawNodes();

    const period = 360, phase = frame % period;
    if (phase < 220) {
      const sy = (phase / 220) * H;
      const sg = ctx.createLinearGradient(0, sy - 4, 0, sy + 4);
      sg.addColorStop(0, 'transparent');
      sg.addColorStop(0.5, 'rgba(0,210,255,0.02)');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(0, sy - 4, W, 8);
    }

    requestAnimationFrame(draw);
  }

  function drawGrid(horizon) {
    const VP = W / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizon, W, H - horizon);
    ctx.clip();

    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const y = horizon + (H - horizon) * (t * t * t);
      ctx.strokeStyle = `rgba(0,200,255,${0.04 + t * 0.12})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const xB = t * W;
      const prox = 1 - Math.abs(t - 0.5) * 2;
      ctx.strokeStyle = `rgba(0,200,255,${0.03 + prox * 0.08})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(VP, horizon); ctx.lineTo(xB, H + 10); ctx.stroke();
    }
    ctx.restore();
  }

  function drawStreams() {
    streams.forEach(s => {
      s.y += s.speed;
      if (s.y - s.len > H) { s.x = Math.random() * W; s.y = -s.len; }
      const g = ctx.createLinearGradient(s.x, s.y - s.len, s.x, s.y);
      g.addColorStop(0, 'transparent');
      g.addColorStop(1, `rgba(${s.color},${s.alpha})`);
      ctx.strokeStyle = g; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - s.len); ctx.lineTo(s.x, s.y); ctx.stroke();
    });
  }

  function drawBuildings(ground) {
    buildings.forEach(b => {
      const bx = b.x, by = ground - b.h, bw = b.w, bh = b.h;

      ctx.fillStyle = '#0d0d22';
      ctx.fillRect(bx, by, bw, bh + 2);

      /* Subtle border right */
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, by, bw, bh);

      if (b.accent) {
        const eg = ctx.createLinearGradient(bx, 0, bx + 6, 0);
        eg.addColorStop(0, 'rgba(0,210,255,0.5)'); eg.addColorStop(1, 'transparent');
        ctx.fillStyle = eg; ctx.fillRect(bx, by, 6, bh);

        const tg = ctx.createLinearGradient(0, by, 0, by + 5);
        tg.addColorStop(0, 'rgba(0,210,255,0.35)'); tg.addColorStop(1, 'transparent');
        ctx.fillStyle = tg; ctx.fillRect(bx, by, bw, 5);
      }

      if (b.antenna) {
        ctx.strokeStyle = 'rgba(0,210,255,0.12)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2, by - 22); ctx.stroke();
        if (Math.floor(frame / 40) % 2 === 0) {
          ctx.beginPath(); ctx.arc(bx + bw / 2, by - 22, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,70,70,0.75)'; ctx.fill();
        }
      }

      b.wins.forEach(w => {
        if (!w.lit) return;
        if (w.flicker && Math.sin(frame * 0.08 + w.phase) < 0.2) return;
        const wx = bx + w.cx - 4, wy = by + w.cy - 3;
        ctx.shadowColor = `rgba(${w.color},1)`; ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(${w.color},0.55)`;
        ctx.fillRect(wx, wy, 7, 5);
        ctx.shadowBlur = 0;
      });
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -6) Object.assign(p, mkParticle(false));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`; ctx.fill();
    });
  }

  function drawNodes() {
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H * 0.58) n.vy *= -1;
    });
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 210) {
          ctx.strokeStyle = `rgba(0,210,255,${(1 - d / 210) * 0.055})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
        }
      }
    }
    nodes.forEach(n => {
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,210,255,${n.alpha * 0.45})`; ctx.fill();
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,210,255,${n.alpha * 0.15})`; ctx.lineWidth = 0.6; ctx.stroke();
    });
  }

  window.addEventListener('resize', resize);
  resize();
})();
