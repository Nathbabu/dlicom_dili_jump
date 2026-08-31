// ==========================================================================
// DILI JUMP - FAST ACTION SPRITE ANIMATOR (NO GPU BOTTLENECKS)
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
    this.squashX = 1.22;
    this.squashY = 0.80;
    this.currentPose = 'jump';
  }

  triggerSpringStretch() {
    this.squashX = 0.85;
    this.squashY = 1.22;
    this.currentPose = 'jump';
  }

  update(vx, vy, isRocket = false) {
    if (isRocket) {
      this.currentPose = 'rocket';
    } else if (vy < -1.5) {
      this.currentPose = 'jump';
    } else if (vy > 1.5) {
      this.currentPose = 'fall';
    } else {
      this.currentPose = 'jump';
    }

    this.squashX += (1 - this.squashX) * 0.2;
    this.squashY += (1 - this.squashY) * 0.2;

    if (vx < -0.3) {
      this.facingLeft = true;
      this.tiltAngle += (-0.20 - this.tiltAngle) * 0.25;
    } else if (vx > 0.3) {
      this.facingLeft = false;
      this.tiltAngle += (0.20 - this.tiltAngle) * 0.25;
    } else {
      this.tiltAngle += (0 - this.tiltAngle) * 0.25;
    }
  }

  draw(ctx, x, y, width = 62, height = 70) {
    const suitPoses = this.poses[this.activeSuit] || this.poses.mint;
    const img = (suitPoses && suitPoses[this.currentPose]) || (suitPoses && suitPoses.jump);

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    ctx.rotate(this.tiltAngle * (this.facingLeft ? -1 : 1));
    ctx.scale(this.squashX, this.squashY);

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
    }

    ctx.restore();
  }
}
