// ==========================================================================
// DILI JUMP - ULTRA-PERFORMANCE 60 FPS DELTA-TIME ENGINE
// Mathematically identical speed on Mobile (60Hz), PC (144Hz), and Tablets!
// ==========================================================================

class DiliGameEngine {
  constructor(canvas, onGameOver, onScoreUpdate) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.onGameOver = onGameOver;
    this.onScoreUpdate = onScoreUpdate;

    this.animator = new MascotAnimator();
    this.particles = new ParticleSystem();

    this.width = canvas.width = 460;
    this.height = canvas.height = 700;

    // Detect mobile touch
    this.isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;

    // Player State
    this.player = {
      x: this.width / 2 - 30,
      y: this.height - 180,
      width: 58,
      height: 64,
      vx: 0,
      vy: 0,
      speed: this.isMobile ? 6.5 : 5.6, // Snappy mobile response
      jumpForce: -13.2
    };

    // World & Scoring
    this.cameraY = 0;
    this.highestY = this.player.y;
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.crystals = 0;
    this.rocketTimer = 0;

    this.platforms = [];
    this.items = [];

    this.keys = { left: false, right: false };
    this.bindControls();

    this.running = false;
    this.lastTime = 0;
  }

  bindControls() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
    });

    const handlePointerDown = (clientX) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = clientX - rect.left;
      if (clickX < rect.width / 2) {
        this.keys.left = true;
        this.keys.right = false;
      } else {
        this.keys.right = true;
        this.keys.left = false;
      }
    };

    this.canvas.addEventListener('mousedown', (e) => handlePointerDown(e.clientX));
    window.addEventListener('mouseup', () => { this.keys.left = false; this.keys.right = false; });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) handlePointerDown(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchend', () => { this.keys.left = false; this.keys.right = false; });
  }

  start() {
    this.reset();
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  reset() {
    this.player.x = this.width / 2 - 30;
    this.player.y = this.height - 150;
    this.player.vx = 0;
    this.player.vy = this.player.jumpForce;
    this.cameraY = 0;
    this.highestY = this.player.y;
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.crystals = 0;
    this.rocketTimer = 0;

    this.particles.clear();
    this.generateInitialPlatforms();
  }

  generateInitialPlatforms() {
    this.platforms = [];
    this.items = [];

    // Starting platform under player
    this.platforms.push({
      x: this.width / 2 - 45,
      y: this.height - 75,
      width: 90,
      height: 14,
      type: 'standard'
    });

    let currentY = this.height - 140;
    while (currentY > -1000) {
      this.spawnPlatform(currentY);
      currentY -= Math.floor(Math.random() * 30 + 55);
    }
  }

  spawnPlatform(y) {
    let padWidth = 85;
    let movingChance = 0.12;
    let glassChance = 0.15;

    if (this.score > 100) { padWidth = 78; movingChance = 0.25; glassChance = 0.22; }
    if (this.score > 300) { padWidth = 70; movingChance = 0.35; glassChance = 0.30; }
    if (this.score > 600) { padWidth = 65; movingChance = 0.45; glassChance = 0.35; }

    const x = Math.random() * (this.width - padWidth - 25) + 12;

    const rand = Math.random();
    let type = 'standard';
    if (rand < movingChance) type = 'moving';
    else if (rand < movingChance + glassChance) type = 'glass';

    const platform = {
      x: x,
      y: y,
      width: padWidth,
      height: 14,
      type: type,
      vx: type === 'moving' ? (Math.random() > 0.5 ? 2.0 : -2.0) : 0,
      broken: false
    };
    this.platforms.push(platform);

    if (type !== 'glass') {
      const itemRand = Math.random();
      if (itemRand < 0.10) {
        this.items.push({ type: 'spring', x: x + padWidth / 2 - 10, y: y - 16, width: 20, height: 16 });
      } else if (itemRand < 0.14) {
        this.items.push({ type: 'rocket', x: x + padWidth / 2 - 11, y: y - 22, width: 22, height: 22 });
      } else if (itemRand < 0.28) {
        this.items.push({ type: 'crystal', x: x + padWidth / 2 - 9, y: y - 20, width: 18, height: 18 });
      }
    }
  }

  loop(currentTime) {
    if (!this.running) return;
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Normalization factor (Target 60 FPS = dt 0.0166s)
    const dt = Math.min(0.05, Math.max(0.005, rawDt));
    const timeScale = dt * 60; // Exactly 1.0 at 60 FPS, 2.0 at 30 FPS, ensuring zero slow-motion!

    this.update(timeScale, dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  update(timeScale, dt) {
    const p = this.player;

    // 1. Time-normalized Horizontal Movement
    if (this.keys.left) {
      p.vx = -p.speed;
    } else if (this.keys.right) {
      p.vx = p.speed;
    } else {
      p.vx *= Math.pow(0.78, timeScale);
    }
    p.x += p.vx * timeScale;

    // Screen Wrap Magic
    if (p.x < -p.width / 2) p.x = this.width - p.width / 2;
    if (p.x > this.width - p.width / 2) p.x = -p.width / 2;

    // 2. Rocket vs Time-normalized Gravity
    if (this.rocketTimer > 0) {
      this.rocketTimer -= dt;
      p.vy = -10.5;
      this.particles.emitThruster(p.x + p.width / 2, p.y + p.height, '#00f3ff', 2);
    } else {
      p.vy += 0.42 * timeScale; // Constant real-world gravity
    }
    p.y += p.vy * timeScale;

    // 3. Platform Landing Detection (Falling Downward)
    if (p.vy > 0 && this.rocketTimer <= 0) {
      for (let i = 0; i < this.platforms.length; i++) {
        const plat = this.platforms[i];
        if (plat.broken) continue;

        if (
          p.x + p.width - 10 > plat.x &&
          p.x + 10 < plat.x + plat.width &&
          p.y + p.height >= plat.y &&
          p.y + p.height <= plat.y + 22
        ) {
          if (plat.type === 'glass') {
            plat.broken = true;
            SoundEngine.shatter();
            this.particles.emitBounceDust(plat.x + plat.width / 2, plat.y, '#ef4444');
          } else {
            p.vy = p.jumpForce;
            this.animator.triggerBounceSquash();
            SoundEngine.bounce(this.combo);
            this.particles.emitBounceDust(plat.x + plat.width / 2, plat.y, this.animator.getSuitConfig().color);
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
          }
          break;
        }
      }
    }

    // 4. Items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (
        p.x + p.width > item.x - 5 &&
        p.x < item.x + item.width + 5 &&
        p.y + p.height > item.y - 5 &&
        p.y < item.y + item.height + 5
      ) {
        if (item.type === 'spring' && p.vy > 0) {
          p.vy = p.jumpForce * 1.35;
          this.animator.triggerSpringStretch();
          SoundEngine.spring();
          this.particles.emitBounceDust(item.x + item.width / 2, item.y, '#facc15');
          this.items.splice(i, 1);
        } else if (item.type === 'rocket') {
          this.rocketTimer = 0.65;
          SoundEngine.jetpack();
          this.items.splice(i, 1);
        } else if (item.type === 'crystal') {
          this.crystals++;
          this.score += 5;
          SoundEngine.crystal();
          this.particles.emitCrystalSparkles(item.x + item.width / 2, item.y + item.height / 2, '#00f3ff');
          this.items.splice(i, 1);
        }
      }
    }

    // 5. Moving Platforms
    for (const plat of this.platforms) {
      if (plat.type === 'moving') {
        plat.x += plat.vx * timeScale;
        if (plat.x <= 12 || plat.x + plat.width >= this.width - 12) {
          plat.vx *= -1;
        }
      }
    }

    // 6. Camera Smooth Follow
    const targetCameraY = p.y - this.height * 0.46;
    if (targetCameraY < this.cameraY) {
      this.cameraY += (targetCameraY - this.cameraY) * Math.min(1, 0.16 * timeScale);
    }

    if (p.y < this.highestY) {
      const diff = Math.floor((this.highestY - p.y) / 10);
      if (diff > 0) {
        this.score += diff;
        this.highestY = p.y;
        if (this.onScoreUpdate) {
          this.onScoreUpdate(this.score, this.combo);
        }
      }
    }

    // 7. Spawning Above Camera
    const topVisibleY = this.cameraY;
    const highestPlat = this.platforms.reduce((min, p) => p.y < min ? p.y : min, this.height);
    if (highestPlat > topVisibleY - 450) {
      this.spawnPlatform(highestPlat - Math.floor(Math.random() * 30 + 55));
    }

    // 8. Cleanup Below
    this.platforms = this.platforms.filter(plat => plat.y < this.cameraY + this.height + 80);
    this.items = this.items.filter(item => item.y < this.cameraY + this.height + 80);

    // 9. Animator Update
    this.animator.update(p.vx, p.vy, this.rocketTimer > 0);

    // 10. Fall Check
    if (p.y - this.cameraY > this.height + 70) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.running = false;
    SoundEngine.gameOver();
    if (this.onGameOver) {
      this.onGameOver({
        score: this.score,
        maxCombo: this.maxCombo,
        crystals: this.crystals,
        suitColor: this.animator.activeSuit
      });
    }
  }

  // ULTRA-FAST 60 FPS MOBILE RENDERER (Clean, Crisp Vector Neon)
  render() {
    const ctx = this.ctx;

    // 1. Fast Background Fill
    ctx.fillStyle = '#060813';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Subtle Grid
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const offsetY = -this.cameraY % gridSize;
    for (let y = offsetY; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // 3. Fast High-Performance Platform Drawing (No laggy GPU Gaussian blurs!)
    for (const plat of this.platforms) {
      if (plat.broken) continue;

      const drawY = plat.y - this.cameraY;

      // Glow halo
      ctx.fillStyle = plat.type === 'standard' ? 'rgba(0, 255, 194, 0.25)' : (plat.type === 'moving' ? 'rgba(0, 243, 255, 0.25)' : 'rgba(239, 68, 68, 0.25)');
      ctx.beginPath();
      ctx.roundRect(plat.x - 2, drawY - 2, plat.width + 4, plat.height + 4, 8);
      ctx.fill();

      // Main Solid Neon Pad
      ctx.fillStyle = plat.type === 'standard' ? '#00ffc2' : (plat.type === 'moving' ? '#00f3ff' : '#ef4444');
      ctx.beginPath();
      ctx.roundRect(plat.x, drawY, plat.width, plat.height, 6);
      ctx.fill();

      // Glossy Top Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillRect(plat.x + 4, drawY + 2, plat.width - 8, 2);
    }

    // 4. Items (Springs, Rockets, Crystals)
    for (const item of this.items) {
      const drawY = item.y - this.cameraY;

      if (item.type === 'spring') {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.roundRect(item.x, drawY, item.width, item.height, 4);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '900 10px sans-serif';
        ctx.fillText('⚡', item.x + 4, drawY + 12);
      } else if (item.type === 'rocket') {
        ctx.fillStyle = '#00f3ff';
        ctx.beginPath();
        ctx.roundRect(item.x, drawY, item.width, item.height, 5);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '900 11px sans-serif';
        ctx.fillText('🚀', item.x + 3, drawY + 16);
      } else if (item.type === 'crystal') {
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(item.x + item.width / 2, drawY);
        ctx.lineTo(item.x + item.width, drawY + item.height / 2);
        ctx.lineTo(item.x + item.width / 2, drawY + item.height);
        ctx.lineTo(item.x, drawY + item.height / 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 5. Particles
    this.particles.updateAndDraw(ctx, this.cameraY);

    // 6. Draw Dili Mascot (Mario Action Sprite)
    this.animator.draw(
      ctx,
      this.player.x,
      this.player.y - this.cameraY,
      this.player.width,
      this.player.height
    );
  }
}
