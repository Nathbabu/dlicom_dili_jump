// ==========================================================================
// DILI JUMP - ULTRA-SNAPPY 60 FPS ARCADE ENGINE
// Powered by Guaranteed Reachable Platforms, 3 Recovery Lives & Difficulty Tuning
// ==========================================================================

const DIFFICULTY_CONFIGS = {
  normal: {
    name: 'NORMAL',
    lives: 3,
    multiplier: 1.0,
    padWidth: 84,
    minPadWidth: 70,
    minGap: 48,
    maxGap: 64,
    movingChance: 0.10,
    movingSpeed: 1.8,
    glassChance: 0.08,
    springChance: 0.12,
    rocketChance: 0.04,
    crystalChance: 0.24,
    gravity: 0.46
  },
  medium: {
    name: 'MEDIUM',
    lives: 2,
    multiplier: 1.0,
    padWidth: 78,
    minPadWidth: 64,
    minGap: 50,
    maxGap: 68,
    movingChance: 0.18,
    movingSpeed: 2.2,
    glassChance: 0.10,
    springChance: 0.10,
    rocketChance: 0.035,
    crystalChance: 0.20,
    gravity: 0.46
  },
  hard: {
    name: 'HARD',
    lives: 1,
    multiplier: 1.5,
    padWidth: 65,
    minPadWidth: 48,
    minGap: 52,
    maxGap: 70,
    movingChance: 0.44,
    movingSpeed: 3.6,
    glassChance: 0.16,
    springChance: 0.07,
    rocketChance: 0.02,
    crystalChance: 0.16,
    gravity: 0.49
  }
};

class DiliGameEngine {
  constructor(canvas, onGameOver, onScoreUpdate, onLivesUpdate, onRecordBreak) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.onGameOver = onGameOver;
    this.onScoreUpdate = onScoreUpdate;
    this.onLivesUpdate = onLivesUpdate;
    this.onRecordBreak = onRecordBreak;
    this.targetRecord = 0;
    this.recordBrokenAlertShown = false;

    this.animator = new MascotAnimator();
    this.particles = new ParticleSystem();

    this.width = canvas.width = 460;
    this.height = canvas.height = 700;

    // Detect mobile touch
    this.isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;

    // Difficulty Setting
    this.difficultyKey = 'normal';
    this.diffConfig = DIFFICULTY_CONFIGS.normal;

    // Snappy Player Physics
    this.player = {
      x: this.width / 2 - 30,
      y: this.height - 180,
      width: 58,
      height: 64,
      vx: 0,
      vy: 0,
      speed: 6.4,
      jumpForce: -11.4     // High buoyant clearance (~141px peak) ensuring zero unreachable jumps
    };

    // Lives & Recovery
    this.maxLives = 3;
    this.lives = 3;
    this.reviveInvulnerableTimer = 0;
    this.emergencyRescueActive = false;

    // World & Scoring
    this.cameraY = 0;
    this.highestY = this.player.y;
    this.rawScore = 0;
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
    this.isPaused = false;
    this.lastTime = 0;
  }

  setTargetRecord(record) {
    this.targetRecord = record || 0;
    this.recordBrokenAlertShown = false;
  }

  setDifficulty(diffKey) {
    if (DIFFICULTY_CONFIGS[diffKey]) {
      this.difficultyKey = diffKey;
      this.diffConfig = DIFFICULTY_CONFIGS[diffKey];
      this.maxLives = this.diffConfig.lives;
      this.lives = this.maxLives;
    }
  }

  pause() {
    if (!this.running || this.isPaused) return;
    this.isPaused = true;
    SoundEngine.pause();
  }

  resume() {
    if (!this.running || !this.isPaused) return;
    this.isPaused = false;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
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
      if (this.isPaused) return;
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
    this.isPaused = false;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  reset() {
    this.diffConfig = DIFFICULTY_CONFIGS[this.difficultyKey] || DIFFICULTY_CONFIGS.normal;
    this.maxLives = this.diffConfig.lives;
    this.lives = this.maxLives;
    this.reviveInvulnerableTimer = 0;
    this.emergencyRescueActive = false;

    this.player.x = this.width / 2 - 30;
    this.player.y = this.height - 150;
    this.player.vx = 0;
    this.player.vy = this.player.jumpForce;
    this.cameraY = 0;
    this.highestY = this.player.y;
    this.rawScore = 0;
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.crystals = 0;
    this.rocketTimer = 0;

    this.particles.clear();
    this.generateInitialPlatforms();

    if (this.onLivesUpdate) {
      this.onLivesUpdate(this.lives, this.maxLives);
    }
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
      type: 'standard',
      vx: 0,
      broken: false
    });

    let currentY = this.height - 140;
    while (currentY > -1000) {
      this.spawnPlatform(currentY);
      const gap = Math.floor(Math.random() * (this.diffConfig.maxGap - this.diffConfig.minGap) + this.diffConfig.minGap);
      currentY -= gap;
    }
  }

        spawnPlatform(y) {
    const cfg = this.diffConfig;
    let padWidth = cfg.padWidth;
    let movingSpeed = cfg.movingSpeed;
    let movingChance = cfg.movingChance;

    // Hardcore Dynamic Escalation: Platforms get narrower and faster as score climbs!
    if (this.difficultyKey === 'hard') {
      if (this.rawScore > 200) { padWidth = Math.max(cfg.minPadWidth, padWidth - 4); movingSpeed += 0.3; movingChance += 0.04; }
      if (this.rawScore > 500) { padWidth = Math.max(cfg.minPadWidth, padWidth - 7); movingSpeed += 0.5; movingChance += 0.06; }
      if (this.rawScore > 900) { padWidth = Math.max(cfg.minPadWidth, padWidth - 10); movingSpeed += 0.7; movingChance += 0.08; }
    } else {
      if (this.rawScore > 150) padWidth = Math.max(cfg.minPadWidth, padWidth - 6);
      if (this.rawScore > 400) padWidth = Math.max(cfg.minPadWidth, padWidth - 10);
    }

    // GUARANTEED REACHABILITY (40px min to 135px max step)
    // Ensures platforms are ALWAYS 100% reachable within 21 frames of steering!
    const lastPlat = this.platforms.length > 0 ? this.platforms[this.platforms.length - 1] : null;
    let x;

    if (lastPlat) {
      const minStep = 40;
      const maxStep = 135;
      const canGoLeft = (lastPlat.x - minStep) >= 16;
      const canGoRight = (lastPlat.x + minStep + padWidth) <= (this.width - 16);

      let goLeft = Math.random() < 0.5;
      if (!canGoLeft) goLeft = false;
      if (!canGoRight) goLeft = true;

      if (goLeft) {
        const minX = Math.max(16, lastPlat.x - maxStep);
        const maxX = Math.max(minX, lastPlat.x - minStep);
        x = Math.random() * (maxX - minX) + minX;
      } else {
        const minX = Math.min(this.width - padWidth - 16, lastPlat.x + minStep);
        const maxX = Math.min(this.width - padWidth - 16, lastPlat.x + maxStep);
        x = Math.random() * (maxX - minX) + minX;
      }
    } else {
      x = Math.random() * (this.width - padWidth - 32) + 16;
    }

    const rand = Math.random();
    let type = 'standard';
    // Prevent consecutive glass traps
    const lastWasGlass = lastPlat && lastPlat.type === 'glass';
    if (!lastWasGlass && rand < movingChance) {
      type = 'moving';
    } else if (!lastWasGlass && rand < movingChance + cfg.glassChance) {
      type = 'glass';
    }

    const platform = {
      x: Math.round(x),
      y: y,
      width: padWidth,
      height: 14,
      type: type,
      vx: type === 'moving' ? (Math.random() > 0.5 ? movingSpeed : -movingSpeed) : 0,
      broken: false
    };
    this.platforms.push(platform);

    // Items
    if (type !== 'glass') {
      const itemRand = Math.random();
      if (itemRand < cfg.springChance) {
        this.items.push({ type: 'spring', x: x + padWidth / 2 - 10, y: y - 16, width: 20, height: 16 });
      } else if (itemRand < cfg.springChance + cfg.rocketChance) {
        this.items.push({ type: 'rocket', x: x + padWidth / 2 - 11, y: y - 22, width: 22, height: 22 });
      } else if (itemRand < cfg.springChance + cfg.rocketChance + cfg.crystalChance) {
        this.items.push({ type: 'crystal', x: x + padWidth / 2 - 9, y: y - 20, width: 18, height: 18 });
      }
    }
  }

  loop(currentTime) {
    if (!this.running) return;
    if (this.isPaused) return;

    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Normalization factor (Target 60 FPS)
    const dt = Math.min(0.04, Math.max(0.008, rawDt));
    const timeScale = dt * 60;

    this.update(timeScale, dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  update(timeScale, dt) {
    const p = this.player;

    // Timers
    if (this.reviveInvulnerableTimer > 0) {
      this.reviveInvulnerableTimer -= dt;
    }

    // 1. Snappy Horizontal Movement
    if (this.keys.left) {
      p.vx = -p.speed;
    } else if (this.keys.right) {
      p.vx = p.speed;
    } else {
      p.vx *= Math.pow(0.72, timeScale);
    }
    p.x += p.vx * timeScale;

    // Screen Wrap Magic
    if (p.x < -p.width / 2) p.x = this.width - p.width / 2;
    if (p.x > this.width - p.width / 2) p.x = -p.width / 2;

    // 2. Rocket vs Snappy Gravity
    if (this.rocketTimer > 0) {
      this.rocketTimer -= dt;
      p.vy = -12.0;
      this.particles.emitThruster(p.x + p.width / 2, p.y + p.height, '#00f3ff', 2);
    } else {
      p.vy += (this.diffConfig.gravity || 0.46) * timeScale; // Mode-specific snappy gravity
    }
    p.y += p.vy * timeScale;

    // 3. Platform Landing Detection (Falling Downward ONLY onto VISIBLE platforms)
    if (p.vy > 0 && this.rocketTimer <= 0) {
      for (let i = 0; i < this.platforms.length; i++) {
        const plat = this.platforms[i];
        if (plat.broken) continue;

        // BUG FIX: Never land on platforms below the visible screen viewport!
        if (plat.y > this.cameraY + this.height - 8) continue;

        if (
          p.x + p.width - 10 > plat.x &&
          p.x + 10 < plat.x + plat.width &&
          p.y + p.height >= plat.y &&
          p.y + p.height <= plat.y + 24
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

    // 4. Items Pickup
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (
        p.x + p.width > item.x - 5 &&
        p.x < item.x + item.width + 5 &&
        p.y + p.height > item.y - 5 &&
        p.y < item.y + item.height + 5
      ) {
        if (item.type === 'spring' && p.vy > 0) {
          p.vy = p.jumpForce * 1.45;
          this.animator.triggerSpringStretch();
          SoundEngine.spring();
          this.particles.emitBounceDust(item.x + item.width / 2, item.y, '#facc15');
          this.items.splice(i, 1);
        } else if (item.type === 'rocket') {
          this.rocketTimer = 0.70;
          SoundEngine.jetpack();
          this.items.splice(i, 1);
        } else if (item.type === 'crystal') {
          this.crystals++;
          this.rawScore += 5;
          this.score = Math.floor(this.rawScore * this.diffConfig.multiplier);
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

    // 6. Camera Smooth Fast Follow
    const targetCameraY = p.y - this.height * 0.46;
    if (targetCameraY < this.cameraY) {
      this.cameraY += (targetCameraY - this.cameraY) * Math.min(1, 0.22 * timeScale);
    }

    if (p.y < this.highestY) {
      const diff = Math.floor((this.highestY - p.y) / 9);
      if (diff > 0) {
        this.rawScore += diff;
        this.score = Math.floor(this.rawScore * this.diffConfig.multiplier);
        this.highestY = p.y;
        if (this.onScoreUpdate) {
          this.onScoreUpdate(this.score, this.combo);
        }

        // Live In-Game Record Break Alert!
        if (!this.recordBrokenAlertShown && this.targetRecord > 50 && this.score > this.targetRecord) {
          this.recordBrokenAlertShown = true;
          if (this.onRecordBreak) {
            this.onRecordBreak(this.score);
          }
        }
      }
    }

    // 7. Spawning Above Camera (Guaranteed Reachable Distance)
    const topVisibleY = this.cameraY;
    const highestPlat = this.platforms.reduce((min, p) => p.y < min ? p.y : min, this.height);
    if (highestPlat > topVisibleY - 450) {
      const gap = Math.floor(Math.random() * (this.diffConfig.maxGap - this.diffConfig.minGap) + this.diffConfig.minGap);
      this.spawnPlatform(highestPlat - gap);
    }

    // 8. Strict Cleanup Below Screen
    this.platforms = this.platforms.filter(plat => plat.y < this.cameraY + this.height + 25);
    this.items = this.items.filter(item => item.y < this.cameraY + this.height + 25);

    // 9. Animator Update
    this.animator.update(p.vx, p.vy, this.rocketTimer > 0);

    // 10. RECOVERY CHANCES & STRICT FALL DEATH (Bug Fix & 3 Lives System)
    if (p.y - this.cameraY > this.height + 15) {
      if (this.lives > 1) {
        this.triggerRecoveryRescue();
      } else {
        this.lives = 0;
        if (this.onLivesUpdate) this.onLivesUpdate(0, this.maxLives);
        this.triggerGameOver();
      }
    }
  }

  // Emergency Recovery Drone Rescue System
  triggerRecoveryRescue() {
    this.lives--;
    if (this.onLivesUpdate) {
      this.onLivesUpdate(this.lives, this.maxLives);
    }

    SoundEngine.revive();

    // Spawn an Emergency Holographic Platform right at the bottom threshold
    const padWidth = 100;
    const rescueX = Math.max(15, Math.min(this.width - padWidth - 15, this.player.x - 20));
    const rescueY = this.cameraY + this.height - 75;

    this.platforms.push({
      x: rescueX,
      y: rescueY,
      width: padWidth,
      height: 14,
      type: 'standard',
      vx: 0,
      broken: false
    });

    // Reposition player safely on the rescue platform and launch upward
    this.player.x = rescueX + padWidth / 2 - this.player.width / 2;
    this.player.y = rescueY - this.player.height - 4;
    this.player.vy = this.player.jumpForce * 1.15;
    this.animator.triggerBounceSquash();

    // 1.8 seconds invulnerability & shield glow
    this.reviveInvulnerableTimer = 1.8;

    // Burst of gold particles
    this.particles.emitBounceDust(rescueX + padWidth / 2, rescueY, '#facc15');

    // Trigger visual banner
    const banner = document.getElementById('hud-recovery-banner');
    if (banner) {
      banner.textContent = `⚡ RECOVERY USED! ${this.lives} ${this.lives === 1 ? 'LIFE' : 'LIVES'} REMAINING ⚡`;
      banner.classList.add('show');
      if (this._bannerTimeout) clearTimeout(this._bannerTimeout);
      this._bannerTimeout = setTimeout(() => banner.classList.remove('show'), 2200);
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
        suitColor: this.animator.activeSuit,
        difficulty: this.difficultyKey
      });
    }
  }

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

    // 3. Platform Drawing
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

    // 6. Draw Dili Mascot (Bulletproof rendering)
    const drawPlayerY = this.player.y - this.cameraY;
    this.animator.draw(
      ctx,
      this.player.x,
      drawPlayerY,
      this.player.width,
      this.player.height
    );

    // 7. Invulnerability Energy Shield Bubble (When Recovery Active)
    if (this.reviveInvulnerableTimer > 0) {
      ctx.save();
      const shieldPulse = Math.sin(performance.now() * 0.015) * 4;
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        this.player.x + this.player.width / 2,
        drawPlayerY + this.player.height / 2,
        this.player.width / 1.5 + shieldPulse,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 243, 255, 0.12)';
      ctx.fill();
      ctx.restore();
    }

    // 8. Bottom Danger Boundary Laser (Red Line Visual Feedback)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.fillRect(0, this.height - 3, this.width, 3);
  }
}
