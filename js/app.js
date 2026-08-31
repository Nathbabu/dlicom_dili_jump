// ==========================================================================
// DILI JUMP - MASTER UI & LEADERBOARD CONTROLLER
// ==========================================================================

(function() {
  const canvas = document.getElementById('game-canvas');
  let game = null;

  // UI Screen Elements
  const startScreen = document.getElementById('start-screen');
  const gameOverScreen = document.getElementById('game-over-screen');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  const hudElement = document.getElementById('game-hud');

  // Input & Buttons
  const pilotInput = document.getElementById('pilot-name-input');
  const btnLaunch = document.getElementById('btn-launch-game');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnReturnHome = document.getElementById('btn-return-home');
  const btnShareX = document.getElementById('btn-share-x');
  const btnOpenLeaderboard = document.getElementById('btn-open-leaderboard');
  const btnQuickLeaderboard = document.getElementById('btn-quick-leaderboard');
  const btnGameoverLeaderboard = document.getElementById('btn-gameover-leaderboard');
  const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
  const btnCloseLeaderboardFoot = document.getElementById('btn-close-leaderboard-foot');
  const btnMute = document.getElementById('btn-toggle-audio');

  // Mascot Preview & Color Chips
  const mascotAvatarImg = document.getElementById('mascot-avatar-preview');
  const colorChips = document.querySelectorAll('.color-chip');

  let selectedSuit = 'mint';
  let pilotName = localStorage.getItem('dili_jump_pilot') || '';
  if (pilotName) {
    if (pilotName.startsWith('Pilot_')) {
      pilotName = pilotName.replace('Pilot_', 'Dili_');
      localStorage.setItem('dili_jump_pilot', pilotName);
    }
    pilotInput.value = pilotName;
  }

  // Bind On-Screen Touch Buttons
  const btnTouchLeft = document.getElementById('btn-touch-left');
  const btnTouchRight = document.getElementById('btn-touch-right');

  if (btnTouchLeft && btnTouchRight) {
    const pressLeft = (e) => { e.preventDefault(); if (game) game.keys.left = true; };
    const releaseLeft = (e) => { e.preventDefault(); if (game) game.keys.left = false; };
    const pressRight = (e) => { e.preventDefault(); if (game) game.keys.right = true; };
    const releaseRight = (e) => { e.preventDefault(); if (game) game.keys.right = false; };

    btnTouchLeft.addEventListener('mousedown', pressLeft);
    btnTouchLeft.addEventListener('mouseup', releaseLeft);
    btnTouchLeft.addEventListener('touchstart', pressLeft, { passive: false });
    btnTouchLeft.addEventListener('touchend', releaseLeft, { passive: false });

    btnTouchRight.addEventListener('mousedown', pressRight);
    btnTouchRight.addEventListener('mouseup', releaseRight);
    btnTouchRight.addEventListener('touchstart', pressRight, { passive: false });
    btnTouchRight.addEventListener('touchend', releaseRight, { passive: false });
  }

  // Initialize Game Instance
  game = new DiliGameEngine(canvas, handleGameOver, handleScoreUpdate);

  // 1. Color Customizer Chips (Guaranteed Image Sync)
  colorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      SoundEngine.click();
      colorChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      selectedSuit = chip.dataset.suit || 'mint';
      game.animator.setSuit(selectedSuit);

      const suitConfig = game.animator.getSuitConfig();
      document.documentElement.style.setProperty('--accent-color', suitConfig.color);
      document.documentElement.style.setProperty('--accent-glow', suitConfig.color + '66');

      if (mascotAvatarImg) {
        mascotAvatarImg.src = `/assets/characters/dili-jump-cutout-${selectedSuit}.png`;
      }
    });
  });

  // 2. Launch Game Button
  btnLaunch.addEventListener('click', () => {
    SoundEngine.click();
    const entered = pilotInput.value.trim() || 'Dili_' + Math.floor(Math.random() * 8999 + 1000);
    pilotName = entered;
    localStorage.setItem('dili_jump_pilot', pilotName);

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hudElement.classList.remove('hidden');

    game.animator.setSuit(selectedSuit);
    game.start();
  });

  // 3. Play Again Button
  btnPlayAgain.addEventListener('click', () => {
    SoundEngine.click();
    gameOverScreen.classList.add('hidden');
    hudElement.classList.remove('hidden');
    game.start();
  });

  // 4. Return to Main Menu Button
  if (btnReturnHome) {
    btnReturnHome.addEventListener('click', () => {
      SoundEngine.click();
      gameOverScreen.classList.add('hidden');
      hudElement.classList.add('hidden');
      startScreen.classList.remove('hidden');
    });
  }

  // 5. In-Game HUD Real-time Score Updates
  function handleScoreUpdate(score, combo) {
    const hudScore = document.getElementById('hud-score-val');
    const hudAlt = document.getElementById('hud-altitude-val');
    if (hudScore) hudScore.textContent = score;
    if (hudAlt) hudAlt.textContent = score + ' PTS';

    const comboEl = document.getElementById('hud-combo-val');
    if (comboEl) {
      if (combo > 1) {
        comboEl.textContent = 'x' + combo + ' COMBO!';
        comboEl.style.display = 'block';
      } else {
        comboEl.style.display = 'none';
      }
    }
  }

  // 6. Game Over Handler (Upstash Redis Persistent Sync)
  async function handleGameOver(stats) {
    hudElement.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    const finalAlt = document.getElementById('final-altitude-val');
    const finalScr = document.getElementById('final-score-val');
    const finalCmb = document.getElementById('final-combo-val');
    const finalCrys = document.getElementById('final-crystals-val');

    if (finalAlt) finalAlt.textContent = stats.score + ' PTS';
    if (finalScr) finalScr.textContent = stats.score;
    if (finalCmb) finalCmb.textContent = 'x' + stats.maxCombo;
    if (finalCrys) finalCrys.textContent = stats.crystals;

    // Submit to Upstash Redis Leaderboard (Globally synced 24/7)
    try {
      const res = await fetch('/api/score/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pilot: pilotName || ('Dili_' + Math.floor(Math.random() * 8999 + 1000)),
          score: stats.score,
          altitude: stats.score,
          suitColor: stats.suitColor,
          maxCombo: stats.maxCombo,
          crystals: stats.crystals
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rank) {
          const rankEl = document.getElementById('final-rank-badge');
          if (rankEl) rankEl.textContent = 'GLOBAL RANK #' + data.rank;
        }
      }
    } catch (e) {
      console.warn('Could not submit score:', e.message);
    }
  }

  // 7. Share on X / Twitter
  btnShareX.addEventListener('click', () => {
    SoundEngine.click();
    const finalScore = document.getElementById('final-altitude-val')?.textContent || '0 PTS';
    const tweetText = `Scored ${finalScore} in DILI JUMP with @DlicomApp! 🚀🐰\n\nPilot: ${pilotName}\n\nCan you beat my score on the global leaderboard?\n\n#Dlicom #DiliJump #Web3Gaming`;
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(window.location.origin)}`;
    window.open(intentUrl, '_blank');
  });

  // 8. Open Leaderboard (From all 3 entrypoints)
  const openLeaderboard = () => {
    SoundEngine.click();
    leaderboardModal.classList.remove('hidden');
    fetchAndRenderLeaderboard();
  };

  if (btnOpenLeaderboard) btnOpenLeaderboard.addEventListener('click', openLeaderboard);
  if (btnQuickLeaderboard) btnQuickLeaderboard.addEventListener('click', openLeaderboard);
  if (btnGameoverLeaderboard) btnGameoverLeaderboard.addEventListener('click', openLeaderboard);

  const closeLeaderboard = () => {
    SoundEngine.click();
    leaderboardModal.classList.add('hidden');
  };

  if (btnCloseLeaderboard) btnCloseLeaderboard.addEventListener('click', closeLeaderboard);
  if (btnCloseLeaderboardFoot) btnCloseLeaderboardFoot.addEventListener('click', closeLeaderboard);

  async function fetchAndRenderLeaderboard() {
    const listBody = document.getElementById('leaderboard-rows');
    if (!listBody) return;
    listBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#64748b;">Loading Global Ranks...</td></tr>';

    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      const rows = data.leaderboard || [];

      if (rows.length === 0) {
        listBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#64748b;">No flights recorded yet. Be the first!</td></tr>';
        return;
      }

      listBody.innerHTML = rows.map((entry, idx) => {
        const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : ''));
        const medal = idx === 0 ? '👑 ' : (idx === 1 ? '🥈 ' : (idx === 2 ? '🥉 ' : ''));
        return `
          <tr>
            <td class="${rankClass}">${medal}#${idx + 1}</td>
            <td style="font-weight:700;color:#fff;">${escapeHtml(entry.pilot)}</td>
            <td style="color:var(--neon-cyan);font-weight:800;">${(entry.score || 0).toLocaleString()} PTS</td>
            <td style="color:#94a3b8;font-size:11px;">${entry.crystals || 0} 💎</td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      listBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#ef4444;">Failed to load leaderboard.</td></tr>';
    }
  }

  // 9. Audio Toggle
  btnMute.addEventListener('click', () => {
    const isMuted = SoundEngine.toggleMute();
    btnMute.textContent = isMuted ? '🔇' : '🔊';
  });

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
  }

})();
