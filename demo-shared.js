// Shared utilities for Synconetics interactive demos
// eslint-disable-next-line no-unused-vars
// Canvas and document colours share the same CSS theme.
var demoTheme = window.getComputedStyle(document.documentElement);
function themeColour(property, fallback) {
  return demoTheme.getPropertyValue(property).trim() || fallback;
}
function withOpacity(hex, opacity) {
  var value = parseInt(hex.replace('#', ''), 16);
  return 'rgba(' + ((value >> 16) & 255) + ', ' + ((value >> 8) & 255) + ', ' + (value & 255) + ', ' + opacity + ')';
}
var CANVAS_FONT = demoTheme.getPropertyValue('--sans').trim() || 'sans-serif';
var signalColour = themeColour('--canvas-signal', '#557ba5');
var ensembleColour = themeColour('--canvas-ensemble', '#648eaf');
var hazardColour = themeColour('--canvas-hazard', '#a77b70');
var accentColour = themeColour('--link-primary', '#4d6d94');
var COLORS = {
  bgPrimary: themeColour('--bg-primary', '#fafbfc'),
  bgSecondary: themeColour('--canvas-bg', '#fcfdfe'),
  textPrimary: themeColour('--text-primary', '#243144'),
  textSecondary: themeColour('--text-secondary', '#5d6b7e'),
  border: themeColour('--border', '#d2dce9'),
  accent: accentColour,
  accentHover: '#3d5b80',
  accentLight: withOpacity(accentColour, 0.08),
  accentMedium: withOpacity(accentColour, 0.28),
  accentTranslucent: withOpacity(accentColour, 0.15),
  neuronGreen: signalColour,
  neuronGreenLight: withOpacity(signalColour, 0.25),
  guideSlate: themeColour('--canvas-guide', '#a5bad4'),
  guideSlateDark: themeColour('--canvas-guide-stroke', '#6c8caf'),
  blockerRed: themeColour('--canvas-hazard-fill', '#ddc5bb'),
  blockerBorderRed: hazardColour,
  leakRed: hazardColour,
  crashRed: hazardColour,
  hazardTrail: withOpacity(hazardColour, 0.2),
  builderPurple: signalColour,
  hybridAmber: signalColour,
  ensemblePurple: ensembleColour,
  ensemblePurpleLight: withOpacity(ensembleColour, 0.15),
  ensembleZone: withOpacity(ensembleColour, 0.035),
  ensembleZoneBorder: themeColour('--canvas-zone', '#acbfd8'),
  white: '#ffffff',
  gridLine: themeColour('--canvas-grid', '#edf0f4'),
  overlayBg: 'rgba(36, 49, 68, 0.85)',
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
