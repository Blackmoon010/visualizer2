/* BLACKMOON 0-1-0 Canvas Render Engine */
(function(window) {
  const canvas = document.getElementById("visualizer-canvas");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Particle pool
  const particles = Array.from({ length: 240 }, () => ({
    x: (Math.random() - 0.5) * window.innerWidth,
    y: (Math.random() - 0.5) * window.innerHeight,
    z: Math.random() * 1000,
    angle: Math.random() * Math.PI * 2,
    radius: Math.random() * 400 + 50
  }));

  let globalTick = 0;

  // Render loop
  function renderLoop() {
    requestAnimationFrame(renderLoop);

    let bassAvg = 0;
    if (window.AudioEngine && window.AudioEngine.isReady()) {
      bassAvg = window.AudioEngine.getBassAverage();
    }

    const params = window.VisualizerParams || { mode: "vortex", reactivity: 1.5, hue: 180 };
    const effectiveBass = bassAvg * params.reactivity;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.fillStyle = "rgba(10, 10, 15, 0.25)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    globalTick += 0.01 + (effectiveBass * 0.04);

    if (params.mode === "vortex") {
      ctx.save();
      ctx.translate(cx, cy);
      particles.forEach((p, i) => {
        p.angle += 0.005 + (effectiveBass * 0.02);
        const r = p.radius + Math.sin(globalTick + i) * 30 * effectiveBass;
        const px = Math.cos(p.angle) * r;
        const py = Math.sin(p.angle) * r;

        const hue = (params.hue + (i * 0.5) + (effectiveBass * 60)) % 360;
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.3 + effectiveBass * 0.7})`;
        ctx.lineWidth = 1 + effectiveBass * 3;

        ctx.beginPath();
        ctx.arc(px, py, 2 + effectiveBass * 6, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();

    } else if (params.mode === "nebula") {
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + globalTick * 0.5;
        const dist = 120 + Math.sin(globalTick + i) * 80 * effectiveBass;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;

        const grad = ctx.createRadialGradient(x, y, 10, x, y, 180 + effectiveBass * 100);
        const hue = (params.hue + i * 25) % 360;
        grad.addColorStop(0, `hsla(${hue}, 90%, 55%, ${0.25 + effectiveBass * 0.3})`);
        grad.addColorStop(1, "rgba(10, 10, 15, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 200 + effectiveBass * 100, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

    } else if (params.mode === "starfield") {
      ctx.save();
      ctx.translate(cx, cy);
      particles.forEach((p) => {
        p.z -= 4 + (effectiveBass * 20);
        if (p.z <= 0) {
          p.z = 1000;
          p.x = (Math.random() - 0.5) * canvas.width * 2;
          p.y = (Math.random() - 0.5) * canvas.height * 2;
        }

        const k = 250 / p.z;
        const px = p.x * k;
        const py = p.y * k;
        const size = Math.max(1, (1 - p.z / 1000) * 5 * (1 + effectiveBass));

        const hue = (params.hue + (1 - p.z / 1000) * 80) % 360;
        ctx.fillStyle = `hsla(${hue}, 85%, 65%, ${1 - p.z / 1000})`;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  renderLoop();
})(window);