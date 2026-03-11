(function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function initialiseOCMVisualizer() {
    var container = document.getElementById('ocm-demo-container');
    var canvas = document.getElementById('ocm-canvas');
    var btnControl = document.getElementById('ocm-btn-control');
    var btnAdaptive = document.getElementById('ocm-btn-adaptive');
    var btnCatastrophic = document.getElementById('ocm-btn-catastrophic');
    var statusAEl = document.getElementById('ocm-status-a');
    var statusBEl = document.getElementById('ocm-status-b');
    var entropyBEl = document.getElementById('ocm-entropy-b');
    var stabilityDotEl = document.getElementById('ocm-stability-dot');
    var stabilityLineEl = document.getElementById('ocm-stability-line');

    if (
      !container ||
      !canvas ||
      !btnControl ||
      !btnAdaptive ||
      !btnCatastrophic ||
      !statusAEl ||
      !statusBEl ||
      !entropyBEl ||
      !stabilityDotEl ||
      !stabilityLineEl
    ) {
      return;
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    var scenario = 'adaptive';
    var isPlaying = true;
    var isInView = false;
    var prefersReducedMotion = false;
    var requestRef = 0;
    var isPlayingRef = true;

    var CANVAS_WIDTH = 800;
    var CANVAS_HEIGHT = 500;
    var BASE_PARTICLE_COUNT = 350;
    var PARTICLE_COUNT = window.innerWidth < 480 ? 150 : BASE_PARTICLE_COUNT;
    var START_X = 50;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    var simState = {
      singleParticle: { x: START_X, y: 0, vx: 0, vy: 0, active: true, crashed: false, trail: [] },
      cloudParticles: [],
      obstacles: [],
      time: 0,
    };

    var stats = {
      modelA_Status: 'ACTIVE',
      modelB_Deviation: 0,
      modelB_Status: 'STABLE',
    };

    var visibilityObserver = null;

    function setStats(nextOrUpdater) {
      if (typeof nextOrUpdater === 'function') {
        stats = nextOrUpdater(stats);
      } else {
        stats = nextOrUpdater;
      }
      updateDOMStats();
    }

    function updateDOMStats() {
      var modelBIndicator;
      if (scenario === 'catastrophic') {
        modelBIndicator = clamp(stats.modelB_Deviation * 3.0, 0, 100);
      } else if (scenario === 'adaptive') {
        modelBIndicator = clamp(stats.modelB_Deviation * 0.5, 0, 25);
      } else {
        modelBIndicator = clamp(stats.modelB_Deviation * 0.3, 0, 10);
      }

      statusAEl.textContent = stats.modelA_Status;
      statusBEl.textContent = stats.modelB_Status;
      entropyBEl.textContent = stats.modelB_Deviation.toFixed(2);

      stabilityLineEl.style.left = modelBIndicator + '%';
      stabilityDotEl.style.left = modelBIndicator + '%';
    }

    function setActiveScenarioButton(mode) {
      btnControl.classList.remove('active');
      btnAdaptive.classList.remove('active');
      btnCatastrophic.classList.remove('active');

      if (mode === 'ideal') btnControl.classList.add('active');
      if (mode === 'adaptive') btnAdaptive.classList.add('active');
      if (mode === 'catastrophic') btnCatastrophic.classList.add('active');
    }

    function resetSimulation(mode) {
      var state = simState;
      var START_Y_A = 120;
      var START_Y_B = 350;
      var i = 0;

      state.singleParticle = {
        x: START_X,
        y: START_Y_A,
        vx: 4.0,
        vy: 0,
        active: true,
        crashed: false,
        trail: [],
      };

      state.cloudParticles = [];
      for (i = 0; i < PARTICLE_COUNT; i++) {
        state.cloudParticles.push({
          x: START_X + (Math.random() * 20 - 10),
          y: START_Y_B + (Math.random() * 12 - 6),
          vx: 3 + Math.random() * 2.0,
          vy: Math.random() * 0.4 - 0.2,
          active: true,
          crashed: false,
          history: [],
        });
      }

      state.obstacles = [];

      if (mode === 'adaptive') {
        for (i = 0; i < 15; i++) {
          var offsetX = 180 + i * 40 + Math.random() * 40;
          var offsetY = Math.random() * 50 - 25;
          var size = 6 + Math.random() * 6;
          state.obstacles.push({
            x: offsetX,
            y: START_Y_A + offsetY,
            w: size,
            h: size,
            drift: 0,
            type: 'static',
          });
          state.obstacles.push({
            x: offsetX,
            y: START_Y_B + offsetY,
            w: size,
            h: size,
            drift: 0,
            type: 'static',
          });
        }
        for (i = 0; i < 3; i++) {
          var driftOffsetX = 300 + i * 150;
          state.obstacles.push({
            x: driftOffsetX,
            y: START_Y_A - 30,
            w: 10,
            h: 10,
            drift: 0.05,
            type: 'drift',
            basePath: START_Y_A,
          });
          state.obstacles.push({
            x: driftOffsetX,
            y: START_Y_B - 30,
            w: 10,
            h: 10,
            drift: 0.05,
            type: 'drift',
            basePath: START_Y_B,
          });
        }
      } else if (mode === 'catastrophic') {
        state.obstacles.push({ x: 300, y: 50, w: 20, h: 140, drift: 0, type: 'wall' });
        state.obstacles.push({ x: 500, y: 50, w: 20, h: 140, drift: 0, type: 'wall' });
        state.obstacles.push({ x: 300, y: 280, w: 20, h: 140, drift: 0, type: 'wall' });
        state.obstacles.push({ x: 500, y: 280, w: 20, h: 140, drift: 0, type: 'wall' });
      }

      state.time = 0;
      setStats({ modelA_Status: 'NOMINAL', modelB_Deviation: 0, modelB_Status: 'STABLE' });
    }

    function update() {
      var state = simState;
      var obs = null;
      var i = 0;

      for (i = 0; i < state.obstacles.length; i++) {
        obs = state.obstacles[i];
        if (obs.drift !== 0) {
          obs.y += Math.sin(state.time * 0.01) * 0.2;
        }
      }

      var sp = state.singleParticle;
      if (sp.active && !sp.crashed) {
        sp.trail.push({ x: sp.x, y: sp.y });
        if (sp.trail.length > 300) sp.trail.shift();
        sp.x += sp.vx;

        for (i = 0; i < state.obstacles.length; i++) {
          obs = state.obstacles[i];
          if (
            obs.y < 230 &&
            sp.x >= obs.x &&
            sp.x <= obs.x + obs.w &&
            sp.y >= obs.y &&
            sp.y <= obs.y + obs.h
          ) {
            sp.crashed = true;
            setStats(function (prev) {
              return {
                modelA_Status: 'FAILURE',
                modelB_Deviation: prev.modelB_Deviation,
                modelB_Status: prev.modelB_Status,
              };
            });
          }
        }

        if (sp.x > CANVAS_WIDTH + 50) {
          sp.x = START_X;
          sp.trail = [];
        }
      }

      var TARGET_Y_B = 350;
      var totalDeviation = 0;
      var activeCount = 0;

      for (i = 0; i < state.cloudParticles.length; i++) {
        var p = state.cloudParticles[i];

        if (p.x > CANVAS_WIDTH + 50) {
          p.x = START_X;
          p.y = TARGET_Y_B + (Math.random() * 10 - 5);
          p.history = [];
        }

        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 50) p.history.shift();

        p.x += p.vx;
        p.y += p.vy;

        var distFromCenter = TARGET_Y_B - p.y;
        var correctionForce = distFromCenter * 0.0025;
        p.vy += correctionForce;
        p.vy *= 0.99;

        for (var j = 0; j < state.obstacles.length; j++) {
          obs = state.obstacles[j];
          if (
            obs.y > 230 &&
            p.x >= obs.x &&
            p.x <= obs.x + obs.w &&
            p.y >= obs.y &&
            p.y <= obs.y + obs.h
          ) {
            var deflection = p.y > obs.y + obs.h / 2 ? 1 : -1;
            p.vy += deflection * (Math.random() * 1.5 + 0.5);
            p.x -= 3;
          }
        }

        if (!p.crashed) {
          totalDeviation += dist({ x: p.x, y: p.y }, { x: p.x, y: TARGET_Y_B });
          activeCount++;
        }
      }

      var avgDeviation = activeCount > 0 ? totalDeviation / activeCount : 0;
      var deviationMetric = Math.min(100, (avgDeviation / 50) * 100);

      setStats(function (prev) {
        var smoothed = prev.modelB_Deviation * 0.85 + deviationMetric * 0.15;
        var bStatus = 'STABLE';
        if (scenario === 'catastrophic') {
          if (smoothed > 15) bStatus = 'ADAPTING';
          if (smoothed > 35) bStatus = 'CRITICAL';
        } else if (scenario === 'adaptive') {
          if (smoothed > 30) bStatus = 'ADAPTING';
        }
        return {
          modelA_Status: prev.modelA_Status,
          modelB_Deviation: smoothed,
          modelB_Status: bStatus,
        };
      });

      state.time += 1;
    }

    function render() {
      var state = simState;

      ctx.fillStyle = COLORS.bgPrimary;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var x = 0; x < CANVAS_WIDTH; x += 50) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillRect(x, CANVAS_HEIGHT / 2 - 5, 1, 10);
      }
      for (var y = 0; y < CANVAS_HEIGHT; y += 50) {
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
      }
      ctx.stroke();

      ctx.strokeStyle = COLORS.textPrimary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT / 2);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
      ctx.stroke();

      var TARGET_Y_B = 350;
      var safeZoneWidth = 60;

      ctx.strokeStyle = COLORS.ensembleZoneBorder;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, TARGET_Y_B - safeZoneWidth);
      ctx.lineTo(CANVAS_WIDTH, TARGET_Y_B - safeZoneWidth);
      ctx.moveTo(0, TARGET_Y_B + safeZoneWidth);
      ctx.lineTo(CANVAS_WIDTH, TARGET_Y_B + safeZoneWidth);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = COLORS.ensembleZone;
      ctx.fillRect(0, TARGET_Y_B - safeZoneWidth, CANVAS_WIDTH, safeZoneWidth * 2);

      for (var i = 0; i < state.obstacles.length; i++) {
        var obs = state.obstacles[i];
        ctx.fillStyle = COLORS.textPrimary;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      }

      var sp = state.singleParticle;
      if (sp.trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = sp.crashed ? COLORS.crashRed : COLORS.neuronGreen;
        ctx.lineWidth = 2;
        ctx.moveTo(sp.trail[0].x, sp.trail[0].y);
        for (i = 0; i < sp.trail.length; i++) {
          ctx.lineTo(sp.trail[i].x, sp.trail[i].y);
        }
        ctx.stroke();
      }
      if (!sp.crashed) {
        ctx.fillStyle = COLORS.neuronGreen;
        ctx.fillRect(sp.x - 3, sp.y - 3, 6, 6);
      } else {
        ctx.strokeStyle = COLORS.crashRed;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sp.x - 5, sp.y - 5);
        ctx.lineTo(sp.x + 5, sp.y + 5);
        ctx.moveTo(sp.x + 5, sp.y - 5);
        ctx.lineTo(sp.x - 5, sp.y + 5);
        ctx.stroke();
      }

      for (i = 0; i < state.cloudParticles.length; i++) {
        var p = state.cloudParticles[i];
        if (p.history.length > 1) {
          ctx.beginPath();
          var deviationTrail = dist({ x: p.x, y: p.y }, { x: p.x, y: TARGET_Y_B });
          var isOutTrail = deviationTrail > safeZoneWidth;
          ctx.strokeStyle = isOutTrail ? 'rgba(220, 38, 38, 0.3)' : COLORS.ensemblePurpleLight;
          ctx.lineWidth = 1;
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (var h = 0; h < p.history.length; h++) {
            ctx.lineTo(p.history[h].x, p.history[h].y);
          }
          ctx.stroke();
        }

        var deviation = dist({ x: p.x, y: p.y }, { x: p.x, y: TARGET_Y_B });
        ctx.fillStyle = deviation > safeZoneWidth ? COLORS.crashRed : COLORS.ensemblePurple;
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
    }

    function animate() {
      if (isPlayingRef) {
        update();
        render();
        requestRef = requestAnimationFrame(animate);
      }
    }

    function refreshAnimationState() {
      var canAnimate = isPlaying && isInView && !prefersReducedMotion;

      if (canAnimate) {
        if (!isPlayingRef) {
          isPlayingRef = true;
        }
        if (!requestRef) requestRef = requestAnimationFrame(animate);
      } else {
        if (isPlayingRef) {
          isPlayingRef = false;
          cancelAnimationFrame(requestRef);
          requestRef = 0;
          render();
        }
      }
    }

    function switchScenario(mode) {
      scenario = mode;
      setActiveScenarioButton(mode);
      resetSimulation(mode);
      render();
    }

    btnControl.addEventListener('click', function () {
      switchScenario('ideal');
    });

    btnAdaptive.addEventListener('click', function () {
      switchScenario('adaptive');
    });

    btnCatastrophic.addEventListener('click', function () {
      switchScenario('catastrophic');
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === '1') switchScenario('ideal');
      if (e.key === '2') switchScenario('adaptive');
      if (e.key === '3') switchScenario('catastrophic');
    });

    detectReducedMotion(function (isReduced) {
      prefersReducedMotion = isReduced;
      refreshAnimationState();
    });

    visibilityObserver = createVisibilityObserver(container, function (inView) {
      isInView = inView;
      refreshAnimationState();
    }, 0.08);

    setActiveScenarioButton(scenario);
    resetSimulation(scenario);
    render();
    refreshAnimationState();

    window.addEventListener('beforeunload', function () {
      if (visibilityObserver) visibilityObserver.disconnect();
      cancelAnimationFrame(requestRef);
      requestRef = 0;
    });
  }

  document.addEventListener('DOMContentLoaded', initialiseOCMVisualizer);
})();
