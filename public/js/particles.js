// ==========================================================================
// DILI JUMP - 60 FPS PARTICLE & TRAIL SYSTEM
// ==========================================================================

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // Add jetpack / jump thruster sparks
  emitThruster(x, y, color = '#00ffc2', count = 3) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() * 6),
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 4 + 2,
        color: color,
        alpha: 1,
        decay: Math.random() * 0.04 + 0.03
      });
    }
  }

  // Add platform bounce impact burst
  emitBounceDust(x, y, color = '#00ffc2') {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 2 + 1),
        size: Math.random() * 3 + 1.5,
        color: color,
        alpha: 1,
        decay: 0.05
      });
    }
  }

  // Add crystal collection sparkle
  emitCrystalSparkles(x, y, color = '#facc15') {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color: color,
        alpha: 1,
        decay: 0.04
      });
    }
  }

  // Update & draw all active particles
  updateAndDraw(ctx, cameraY = 0) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      p.size = Math.max(0.1, p.size * 0.96);

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y - cameraY, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
  }
}
