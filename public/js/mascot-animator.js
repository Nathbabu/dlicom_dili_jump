// ==========================================================================
// DILI JUMP - BULLETPROOF ACTION SPRITE ANIMATOR (NEVER DISAPPEARS)
// ==========================================================================

const DILI_SUIT_PRESETS = {
  mint: { name: 'Neon Mint Cadet', color: '#00ffc2' },
  pink: { name: 'Cyber Pink Dliever', color: '#ec49c0' },
  lime: { name: 'Acid Lime Dcoded', color: '#d2e823' },
  cyan: { name: 'Sky Cyan Pilot', color: '#00f3ff' },
  purple: { name: 'Void Purple Apex', color: '#a855f7' },
  crimson: { name: 'Crimson Fury', color: '#ef4444' },
  gold: { name: 'Sovereign Gold DCO', color: '#facc15' },
  blue: { name: 'Cobalt Shield', color: '#38bdf8' }
};

class MascotAnimator {
  constructor() {
    this.activeSuit = 'mint';
    this.poses = {};
    this.currentPose = 'jump';

    this.squashX = 1;
    this.squashY = 1;
    this.tiltAngle = 0;
    this.facingLeft = false;

    this.preloadAllPoses();
  }

  preloadAllPoses() {
    const suits = Object.keys(DILI_SUIT_PRESETS);
    const poseTypes = ['jump', 'fall', 'rocket'];

    suits.forEach(suit => {
      this.poses[suit] = {};
      poseTypes.forEach(type => {
        const img = new Image();
        img.src = `/assets/characters/dili-${type}-cutout-${suit}.png`;
        this.poses[suit][type] = img;
      });
    });
  }

  setSuit(suitKey) {
    if (DILI_SUIT_PRESETS[suitKey]) {
      this.activeSuit = suitKey;
    }
  }

  getSuitConfig() {
    return DILI_SUIT_PRESETS[this.activeSuit] || DILI_SUIT_PRESETS.mint;
  }

  triggerBounceSquash() {
    this.squashX = 1.20;
    this.squashY = 0.82;
    this.currentPose = 'jump';
  }

  triggerSpringStretch() {
    this.squashX = 0.85;
    this.squashY = 1.20;
    this.currentPose = 'jump';
  }

  update(vx, vy, isRocket = false) {
    if (isRocket) {
      this.currentPose = 'rocket';
    } else if (vy < -1.0) {
      this.currentPose = 'jump';
    } else if (vy > 1.0) {
      this.currentPose = 'fall';
    } else {
      this.currentPose = 'jump';
    }

    this.squashX += (1 - this.squashX) * 0.22;
    this.squashY += (1 - this.squashY) * 0.22;

    if (vx < -0.3) {
      this.facingLeft = true;
      this.tiltAngle += (-0.18 - this.tiltAngle) * 0.25;
    } else if (vx > 0.3) {
      this.facingLeft = false;
      this.tiltAngle += (0.18 - this.tiltAngle) * 0.25;
    } else {
      this.tiltAngle += (0 - this.tiltAngle) * 0.25;
    }
  }

  draw(ctx, x, y, width = 62, height = 70) {
    const suitPoses = this.poses[this.activeSuit] || this.poses.mint || {};
    
    // Cascading Image Fallbacks so character NEVER disappears
    let img = suitPoses[this.currentPose];
    if (!img || !img.complete || img.naturalWidth === 0) {
      img = suitPoses.jump;
    }
    if (!img || !img.complete || img.naturalWidth === 0) {
      const mintPoses = this.poses.mint || {};
      img = mintPoses[this.currentPose] || mintPoses.jump;
    }

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    ctx.rotate(this.tiltAngle * (this.facingLeft ? -1 : 1));
    ctx.scale(this.squashX, this.squashY);

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
    } else {
      // Emergency Neon Vector Dili Mascot (Guaranteed 100% visible always)
      const config = this.getSuitConfig();
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, width / 2.2, height / 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ears
      ctx.fillRect(-15, -height / 1.8, 8, 16);
      ctx.fillRect(7, -height / 1.8, 8, 16);
    }

    ctx.restore();
  }
}
