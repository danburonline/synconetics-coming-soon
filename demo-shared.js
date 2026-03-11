// Shared utilities for Synconetics interactive demos
// eslint-disable-next-line no-unused-vars
var COLORS = {
  bgPrimary: '#f6f3ef',
  bgSecondary: '#fbf9f6',
  textPrimary: '#1f1c18',
  textSecondary: '#5f5a53',
  border: '#e4ded6',
  accent: '#d1662f',
  accentHover: '#bf5b28',
  accentLight: 'rgba(209, 102, 47, 0.08)',
  accentMedium: 'rgba(209, 102, 47, 0.4)',
  accentTranslucent: 'rgba(209, 102, 47, 0.15)',
  neuronGreen: '#22c55e',
  neuronGreenLight: 'rgba(34, 197, 94, 0.3)',
  guideSlate: '#64748b',
  guideSlateDark: '#334155',
  blockerRed: '#f87171',
  blockerBorderRed: '#b91c1c',
  leakRed: '#ef4444',
  crashRed: '#dc2626',
  builderPurple: '#7c3aed',
  hybridAmber: '#f59e0b',
  ensemblePurple: '#7e22ce',
  ensemblePurpleLight: 'rgba(107, 33, 168, 0.15)',
  ensembleZone: 'rgba(147, 51, 234, 0.03)',
  ensembleZoneBorder: '#9333ea',
  white: '#ffffff',
  gridLine: '#e2e8f0',
  overlayBg: 'rgba(31, 28, 24, 0.85)',
};

function dist(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function createVisibilityObserver(element, callback, threshold) {
  if (typeof threshold === 'undefined') threshold = 0.08;
  var observer = new IntersectionObserver(
    function (entries) {
      var entry = entries[0];
      if (entry) callback(entry.isIntersecting);
    },
    { threshold: threshold },
  );
  observer.observe(element);
  return observer;
}

function detectReducedMotion(callback) {
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var update = function () {
    callback(mq.matches);
  };
  update();
  mq.addEventListener('change', update);
  return mq.matches;
}
