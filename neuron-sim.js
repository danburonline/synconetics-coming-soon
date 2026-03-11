var WIDTH = 440;
var HEIGHT = 400;
var CENTER = { x: 220, y: 200 };

class MorphologyTree {
  constructor() {
    this.nodes = [];
    this.segments = [];
    this.bounds = new Set();
  }

  clear() {
    this.nodes = [];
    this.segments = [];
    this.bounds.clear();
  }

  generate() {
    this.clear();
    var somaRadius = 15;
    this.nodes.push({ x: CENTER.x, y: CENTER.y, r: somaRadius, type: 'soma' });
    this._register(CENTER.x, CENTER.y, somaRadius);

    var axonAngle = Math.random() * Math.PI * 2;
    this._growBranch(CENTER.x, CENTER.y, axonAngle, 80, 6, 'axon', 4);

    var numDendrites = 4 + Math.floor(Math.random() * 3);
    for (var i = 0; i < numDendrites; i++) {
      var angle = (Math.PI * 2 * i) / numDendrites + (Math.random() * 0.5 - 0.25);
      if (Math.abs(angle - axonAngle) > 0.5) {
        this._growBranch(CENTER.x, CENTER.y, angle, 40, 5, 'dendrite', 3);
      }
    }
  }

  _growBranch(x, y, angle, length, width, type, depth) {
    if (depth <= 0) return;
    var endX = x + Math.cos(angle) * length;
    var endY = y + Math.sin(angle) * length;

    this.segments.push({
      start: { x: x, y: y },
      end: { x: endX, y: endY },
      width: width,
      type: type,
      angle: angle,
      length: length,
    });
    this._registerLine(x, y, endX, endY, width);
    this.nodes.push({ x: endX, y: endY, r: width, type: 'node' });

    var subBranches = Math.floor(Math.random() * 2) + 1;
    for (var i = 0; i < subBranches; i++) {
      var newAngle = angle + (Math.random() * 1.0 - 0.5);
      this._growBranch(endX, endY, newAngle, length * 0.8, Math.max(1, width * 0.7), type, depth - 1);
    }
  }

  _register(x, y, r) {
    var rInt = Math.ceil(r);
    for (var dx = -rInt; dx <= rInt; dx += 4) {
      for (var dy = -rInt; dy <= rInt; dy += 4) {
        if (dx * dx + dy * dy <= r * r) {
          var k = String(Math.floor((x + dx) / 4)) + ',' + String(Math.floor((y + dy) / 4));
          this.bounds.add(k);
        }
      }
    }
  }

  _registerLine(x1, y1, x2, y2, width) {
    var steps = Math.ceil(dist({ x: x1, y: y1 }, { x: x2, y: y2 }) / 2);
    for (var i = 0; i <= steps; i++) {
      this._register(x1 + (x2 - x1) * (i / steps), y1 + (y2 - y1) * (i / steps), width);
    }
  }

  contains(x, y) {
    return this.bounds.has(String(Math.floor(x / 4)) + ',' + String(Math.floor(y / 4)));
  }
}

class BioEngine {
  constructor() {
    this.particles = [];
    this.finished = false;
  }

  reset() {
    this.particles = [];
    this.finished = false;
  }

  spawn(count) {
    if (typeof count === 'undefined') count = 1;
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: CENTER.x,
        y: CENTER.y,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        life: 100,
        history: [],
        dead: false,
      });
    }
  }

  update(scaffolds, _targetTree) {
    var active = 0;

    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      if (p.dead) continue;
      active++;

      var influenceX = 0;
      var influenceY = 0;
      var guided = false;
      var blocked = false;

      for (var j = 0; j < scaffolds.length; j++) {
        var s = scaffolds[j];
        var dx = p.x - s.x;
        var dy = p.y - s.y;
        var lx = dx * Math.cos(-s.angle) - dy * Math.sin(-s.angle);
        var ly = dx * Math.sin(-s.angle) + dy * Math.cos(-s.angle);

        if (Math.abs(lx) < s.w / 2 && Math.abs(ly) < s.h / 2) {
          if (s.type === 'blocker') {
            var nx = Math.cos(s.angle + 1.57);
            var ny = Math.sin(s.angle + 1.57);
            var dot = p.vx * nx + p.vy * ny;
            p.vx = (p.vx - 1.5 * dot * nx) * 0.5;
            p.vy = (p.vy - 1.5 * dot * ny) * 0.5;
            p.x += p.vx;
            p.y += p.vy;
            blocked = true;
            break;
          }
          guided = true;
          var sx = Math.cos(s.angle);
          var sy = Math.sin(s.angle);
          var dotGuide = p.vx * sx + p.vy * sy;
          var dir = dotGuide >= 0 ? 1 : -1;
          influenceX += sx * dir;
          influenceY += sy * dir;
        }
      }

      if (blocked) continue;

      if (guided) {
        p.vx = p.vx * 0.6 + influenceX * 1.2;
        p.vy = p.vy * 0.6 + influenceY * 1.2;
      } else {
        p.vx += (Math.random() - 0.5) * 1.5;
        p.vy += (Math.random() - 0.5) * 1.5;
      }

      var speed = guided ? 3.0 : 1.0;
      var mag = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (mag > 0) {
        p.vx = (p.vx / mag) * speed;
        p.vy = (p.vy / mag) * speed;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (Math.random() < 0.2) p.history.push({ x: p.x, y: p.y });
      if (p.history.length > 50) p.history.shift();

      if (p.x < 0 || p.x > WIDTH || p.y < 0 || p.y > HEIGHT) p.dead = true;
      if (Math.random() < 0.01) p.dead = true;
    }

    if (active < 300 && !this.finished) this.spawn(5);
  }
}

class HeuristicScanner {
  constructor() {
    this.scaffolds = [];
  }

  reset() {
    this.scaffolds = [];
  }

  step(targetTree) {
    for (var i = 0; i < 50; i++) {
      var x = Math.random() * WIDTH;
      var y = Math.random() * HEIGHT;
      var angle = Math.random() * Math.PI * 2;

      var crowded = false;
      for (var c = 0; c < this.scaffolds.length; c++) {
        if (dist({ x: x, y: y }, this.scaffolds[c]) < 4) {
          crowded = true;
          break;
        }
      }
      if (crowded) continue;

      if (targetTree.contains(x, y)) {
        this.scaffolds.push({
          x: x,
          y: y,
          w: 6,
          h: 6,
          angle: angle,
          type: 'guide',
        });
        continue;
      }

      var nearTarget = false;
      for (var dx = -8; dx <= 8; dx += 4) {
        for (var dy = -8; dy <= 8; dy += 4) {
          if (targetTree.contains(x + dx, y + dy)) {
            nearTarget = true;
            break;
          }
        }
        if (nearTarget) break;
      }

      if (nearTarget) {
        this.scaffolds.push({
          x: x,
          y: y,
          w: 5,
          h: 5,
          angle: angle,
          type: 'blocker',
        });
      }
    }

    return this.scaffolds;
  }
}

class GeneticOptimizer {
  constructor() {
    this.population = [];
    this.bestGenome = [];
  }

  reset() {
    this.population = [];
    this.bestGenome = [];
  }

  _randomScaffold() {
    return {
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      w: 20,
      h: 5,
      angle: Math.random() * Math.PI * 2,
      type: 'guide',
    };
  }

  _cloneGenome(genome) {
    var out = [];
    for (var i = 0; i < genome.length; i++) {
      var s = genome[i];
      out.push({ x: s.x, y: s.y, w: s.w, h: s.h, angle: s.angle, type: s.type });
    }
    return out;
  }

  _initialisePopulation() {
    this.population = [];
    for (var i = 0; i < 12; i++) {
      var genome = [];
      for (var j = 0; j < 8; j++) genome.push(this._randomScaffold());
      this.population.push(genome);
    }
  }

  _scoreGenome(genome, targetTree) {
    var score = 0;
    for (var i = 0; i < genome.length; i++) {
      var s = genome[i];
      var onTarget = targetTree.contains(s.x, s.y);
      if (s.type === 'guide') {
        if (onTarget) score += 22;
        else score -= 5;
      } else if (s.type === 'blocker') {
        if (onTarget) score -= 20;
        else if (dist({ x: s.x, y: s.y }, CENTER) < 100) score += 1;
      }
    }
    return score;
  }

  step(targetTree) {
    if (this.population.length === 0) this._initialisePopulation();

    var scored = [];
    for (var i = 0; i < this.population.length; i++) {
      scored.push({
        genome: this.population[i],
        score: this._scoreGenome(this.population[i], targetTree),
      });
    }

    scored.sort(function (a, b) {
      return b.score - a.score;
    });

    var top = scored.slice(0, 4);
    this.bestGenome = this._cloneGenome(top[0].genome);

    var nextPopulation = [];
    for (var p = 0; p < 12; p++) {
      var parent = top[Math.floor(Math.random() * top.length)].genome;
      var child = this._cloneGenome(parent);
      var baseLength = child.length;
      for (var j = 0; j < baseLength; j++) {
        if (Math.random() < 0.3) {
          child.push(this._randomScaffold());
        } else {
          child[j].x += Math.random() * 10 - 5;
          child[j].y += Math.random() * 10 - 5;
          child[j].angle += Math.random() * 0.2 - 0.1;
        }
      }
      nextPopulation.push(child);
    }

    this.population = nextPopulation;
    return this.bestGenome;
  }
}

class DiffusionBuilder {
  constructor() {
    this.scaffolds = [];
  }

  reset() {
    this.scaffolds = [];
  }

  step(targetTree) {
    if (!targetTree.segments || targetTree.segments.length === 0) return this.scaffolds;

    for (var i = 0; i < 5; i++) {
      var idx = Math.floor(Math.random() * targetTree.segments.length);
      var seg = targetTree.segments[idx];
      var midX = (seg.start.x + seg.end.x) / 2;
      var midY = (seg.start.y + seg.end.y) / 2;

      var crowded = false;
      for (var c = 0; c < this.scaffolds.length; c++) {
        if (dist({ x: midX, y: midY }, this.scaffolds[c]) < 8) {
          crowded = true;
          break;
        }
      }
      if (crowded) continue;

      this.scaffolds.push({
        x: midX,
        y: midY,
        w: 14,
        h: 4,
        angle: seg.angle,
        type: 'guide',
      });

      var anglePerp = seg.angle + 1.57;
      this.scaffolds.push({
        x: midX + Math.cos(anglePerp) * 20,
        y: midY + Math.sin(anglePerp) * 20,
        w: 8,
        h: 2,
        angle: seg.angle,
        type: 'blocker',
      });
      this.scaffolds.push({
        x: midX - Math.cos(anglePerp) * 20,
        y: midY - Math.sin(anglePerp) * 20,
        w: 8,
        h: 2,
        angle: seg.angle,
        type: 'blocker',
      });
    }

    return this.scaffolds;
  }
}

class HybridArchitect {
  constructor() {
    this.segIndex = 0;
    this.agentPos = { x: CENTER.x, y: CENTER.y };
    this.localPop = [];
    this.lockedScaffolds = [];
  }

  reset() {
    this.segIndex = 0;
    this.agentPos = { x: CENTER.x, y: CENTER.y };
    this.localPop = [];
    this.lockedScaffolds = [];
  }

  step(targetTree) {
    if (this.segIndex >= targetTree.segments.length) return this.lockedScaffolds;
    var seg = targetTree.segments[this.segIndex];
    var mx = (seg.start.x + seg.end.x) / 2;
    var my = (seg.start.y + seg.end.y) / 2;
    this.agentPos = { x: mx, y: my };

    if (this.localPop.length === 0) {
      for (var i = 0; i < 10; i++) {
        this.localPop.push({
          x: mx + (Math.random() - 0.5) * 2,
          y: my + (Math.random() - 0.5) * 2,
          w: seg.length + 5,
          h: 5,
          angle: seg.angle + (Math.random() - 0.5) * 0.2,
          type: 'guide',
        });
      }
    }

    var best = this.localPop.reduce(function (prev, curr) {
      return Math.abs(curr.angle - seg.angle) < Math.abs(prev.angle - seg.angle) ? curr : prev;
    });

    this.localPop = this.localPop.map(function (c) {
      if (c === best) return c;
      return {
        x: mx + (Math.random() - 0.5) * 2,
        y: my + (Math.random() - 0.5) * 2,
        w: seg.length + 5,
        h: 5,
        angle: seg.angle + (Math.random() - 0.5) * 0.1,
        type: 'guide',
      };
    });

    if (Math.random() < 0.1) {
      this.lockedScaffolds.push(best);
      if (seg.width < 5) {
        var anglePerp = seg.angle + 1.57;
        this.lockedScaffolds.push({
          x: seg.start.x + Math.cos(anglePerp) * 12,
          y: seg.start.y + Math.sin(anglePerp) * 12,
          w: 8,
          h: 2,
          angle: seg.angle,
          type: 'blocker',
        });
        this.lockedScaffolds.push({
          x: seg.start.x - Math.cos(anglePerp) * 12,
          y: seg.start.y - Math.sin(anglePerp) * 12,
          w: 8,
          h: 2,
          angle: seg.angle,
          type: 'blocker',
        });
      }
      this.segIndex++;
      this.localPop = [];
    }

    return this.lockedScaffolds.concat([best]);
  }
}

var heuristic = new HeuristicScanner();
var genetic = new GeneticOptimizer();
var diffusion = new DiffusionBuilder();
var hybrid = new HybridArchitect();
var activeAlgoName = 'heuristic';
var algoMap = { heuristic: heuristic, genetic: genetic, diffusion: diffusion, hybrid: hybrid };
var algoCost = { heuristic: 5, genetic: 150, diffusion: 60, hybrid: 15 };
var algoLabels = { heuristic: 'Stochastic Refinement', genetic: 'Global Evolution', diffusion: 'Denoising Diffusion', hybrid: 'Guided Scaffolding' };

var phase = 'design';
var isRunning = false;
var isInView = false;
var prefersReducedMotion = false;

var iterations = 0;
var computeCost = 0;
var scaffoldCount = 0;
var score = '0';

var leftCanvas = null;
var rightCanvas = null;
var container = null;

var statIterations = null;
var statScaffolds = null;
var statCompute = null;
var statFidelity = null;

var btnGenerate = null;
var btnRun = null;
var btnGrow = null;
var btnReset = null;
var badgeAlgo = null;

var morphTree = new MorphologyTree();
var bioSim = new BioEngine();
var scaffolds = [];

var requestRef = 0;
var visibilityObserver = null;

function updateStats() {
  if (statIterations) statIterations.textContent = String(iterations);
  if (statScaffolds) statScaffolds.textContent = String(scaffoldCount);
  if (statCompute) statCompute.textContent = String(computeCost);
  if (statFidelity) statFidelity.textContent = String(score) + '%';
}

function updateGrowButton() {
  if (!btnGrow) return;
  if (phase === 'grow' && isRunning) {
    btnGrow.textContent = 'Stop';
    btnGrow.removeAttribute('disabled');
  } else {
    btnGrow.textContent = 'Grow';
    if (scaffoldCount > 0 && (!isRunning || phase !== 'design')) {
      btnGrow.removeAttribute('disabled');
    } else {
      btnGrow.setAttribute('disabled', 'disabled');
    }
  }
}

function setPhase(nextPhase) {
  phase = nextPhase;
  var badge = document.getElementById('neuron-badge-phase');
  if (badge) badge.textContent = nextPhase === 'design' ? 'Design' : nextPhase === 'grow' ? 'Growth' : 'Complete';
  updateGrowButton();
}

function drawLeftPanel() {
  if (!leftCanvas) return;
  var ctx = leftCanvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = COLORS.bgPrimary;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  var tree = morphTree;
  for (var i = 0; i < tree.segments.length; i++) {
    var seg = tree.segments[i];
    ctx.beginPath();
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = seg.width;
    ctx.lineCap = 'round';
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.stroke();
  }

  for (var j = 0; j < tree.nodes.length; j++) {
    var n = tree.nodes[j];
    ctx.beginPath();
    ctx.fillStyle = COLORS.accentMedium;
    ctx.arc(n.x, n.y, n.r / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = 'italic 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Target Morphology (Simplified Model)', WIDTH / 2, HEIGHT - 40);
  ctx.fillText('* Real biological growth is more chaotic', WIDTH / 2, HEIGHT - 25);
  ctx.textAlign = 'left';
}

function drawRightPanel() {
  if (!rightCanvas) return;
  var ctx = rightCanvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = COLORS.bgPrimary;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (phase !== 'clean') {
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; gx < WIDTH; gx += 40) {
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, HEIGHT);
    }
    for (var gy = 0; gy < HEIGHT; gy += 40) {
      ctx.moveTo(0, gy);
      ctx.lineTo(WIDTH, gy);
    }
    ctx.stroke();
  }

  if (phase !== 'clean') {
    for (var i = 0; i < scaffolds.length; i++) {
      var s = scaffolds[i];
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.fillStyle = s.type === 'blocker' ? COLORS.blockerRed : COLORS.guideSlate;
      ctx.strokeStyle = s.type === 'blocker' ? COLORS.blockerBorderRed : COLORS.guideSlateDark;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(-s.w / 2, -s.h / 2, s.w, s.h);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  if (phase === 'grow' || phase === 'clean') {
    var tree = morphTree;
    for (var pIndex = 0; pIndex < bioSim.particles.length; pIndex++) {
      var p = bioSim.particles[pIndex];
      if (p.dead) continue;
      if (p.history.length > 1) {
        ctx.beginPath();
        var color = phase === 'clean' ? COLORS.neuronGreen : tree.contains(p.x, p.y) ? COLORS.neuronGreen : COLORS.leakRed;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.moveTo(p.history[0].x, p.history[0].y);
        for (var h = 0; h < p.history.length; h++) {
          var pt = p.history[h];
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }
    }
  }

  if (phase === 'design') {
    var algo = algoMap[activeAlgoName];
    var pos = algo.agentPos || (activeAlgoName === 'hybrid' ? hybrid.agentPos : null);
    if (pos) {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.fillStyle = COLORS.hybridAmber;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(5, 5);
      ctx.lineTo(-5, 5);
      ctx.fill();
      ctx.restore();
    }
  }
}

function resetSim() {
  isRunning = false;
  setPhase('design');
  scaffolds = [];
  bioSim.reset();
  heuristic.reset();
  genetic.reset();
  diffusion.reset();
  hybrid.reset();
  iterations = 0;
  computeCost = 0;
  scaffoldCount = 0;
  score = '0';
  updateGrowButton();
  updateStats();
  drawRightPanel();
}

function generateNewTarget() {
  morphTree.generate();
  drawLeftPanel();
  resetSim();
  isRunning = false;
  setPhase('design');
  if (btnRun) {
    btnRun.textContent = 'Run';
    btnRun.removeAttribute('disabled');
  }
  updateGrowButton();
}

function canAnimate() {
  return isInView && !prefersReducedMotion;
}

function animate() {
  if (!canAnimate()) return;

  if (isRunning) {
    if (phase === 'design') {
      iterations += 1;
      var algo = algoMap[activeAlgoName];
      var result = algo.step(morphTree);
      scaffolds = result;
      computeCost += algoCost[activeAlgoName];
      scaffoldCount = scaffolds.length;
      updateGrowButton();
      updateStats();
    } else if (phase === 'grow') {
      bioSim.update(scaffolds, morphTree);
      var hits = 0;
      var total = 0;
      for (var pIndex = 0; pIndex < bioSim.particles.length; pIndex++) {
        var p = bioSim.particles[pIndex];
        if (p.dead) continue;
        total++;
        if (morphTree.contains(p.x, p.y)) hits++;
      }
      var s = total > 0 ? (hits / total) * 100 : 0;
      score = s.toFixed(1);
      updateStats();
    }
  }

  drawRightPanel();
  requestRef = requestAnimationFrame(animate);
}

function refreshAnimationState() {
  if (!canAnimate()) {
    cancelAnimationFrame(requestRef);
    drawRightPanel();
    return;
  }
  cancelAnimationFrame(requestRef);
  requestRef = requestAnimationFrame(animate);
}

function wireEvents() {
  if (btnGenerate) {
    btnGenerate.addEventListener('click', function () {
      generateNewTarget();
    });
  }

  if (btnRun) {
    btnRun.addEventListener('click', function () {
      if (phase !== 'design') return;
      if (isRunning) {
        isRunning = false;
        btnRun.textContent = 'Run';
        updateGrowButton();
      } else {
        isRunning = true;
        btnRun.textContent = 'Stop';
        refreshAnimationState();
      }
    });
  }

  if (btnGrow) {
    btnGrow.addEventListener('click', function () {
      if (phase === 'grow' && isRunning) {
        isRunning = false;
        setPhase('clean');
      } else if (scaffoldCount > 0) {
        isRunning = true;
        setPhase('grow');
        btnRun.textContent = 'Run';
        btnRun.setAttribute('disabled', 'disabled');
        refreshAnimationState();
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', function () {
      resetSim();
      if (btnRun) {
        btnRun.textContent = 'Run';
        btnRun.removeAttribute('disabled');
      }
    });
  }

  var algoCards = document.querySelectorAll('.demo-algo-card');
  for (var i = 0; i < algoCards.length; i++) {
    algoCards[i].addEventListener('click', function () {
      var algoName = this.getAttribute('data-algo');
      if (!algoName || algoName === activeAlgoName) return;
      activeAlgoName = algoName;
      algoMap[activeAlgoName].reset();
      scaffolds = [];
      scaffoldCount = 0;
      iterations = 0;
      computeCost = 0;
      for (var j = 0; j < algoCards.length; j++) {
        algoCards[j].classList.remove('active');
      }
      this.classList.add('active');
      if (badgeAlgo) badgeAlgo.textContent = algoLabels[activeAlgoName];
      updateStats();
      drawRightPanel();
    });
  }
}

function initDomRefs() {
  container = document.getElementById('neuron-demo-container');
  leftCanvas = document.getElementById('neuron-canvas-left');
  rightCanvas = document.getElementById('neuron-canvas-right');

  statIterations = document.getElementById('neuron-stat-iterations');
  statScaffolds = document.getElementById('neuron-stat-scaffolds');
  statCompute = document.getElementById('neuron-stat-compute');
  statFidelity = document.getElementById('neuron-stat-fidelity');

  btnGenerate = document.getElementById('neuron-btn-target');
  btnRun = document.getElementById('neuron-btn-run');
  btnGrow = document.getElementById('neuron-btn-grow');
  btnReset = document.getElementById('neuron-btn-reset');
  badgeAlgo = document.getElementById('neuron-badge-algo');
}

function bootstrapSimulation() {
  if (!leftCanvas || !rightCanvas) return;

  morphTree.generate();

  updateGrowButton();
  updateStats();

  drawLeftPanel();
  drawRightPanel();

  wireEvents();

  prefersReducedMotion = detectReducedMotion(function (matches) {
    prefersReducedMotion = matches;
    refreshAnimationState();
  });

  if (container) {
    visibilityObserver = createVisibilityObserver(container, function (visible) {
      isInView = visible;
      refreshAnimationState();
    }, 0.08);
  } else {
    isInView = true;
    refreshAnimationState();
  }

  refreshAnimationState();

  window.addEventListener('beforeunload', function () {
    cancelAnimationFrame(requestRef);
    if (visibilityObserver) visibilityObserver.disconnect();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initDomRefs();
  bootstrapSimulation();
});
