/*
 * Hugo — the CareCircle plush owl mascot.
 * Framework-free web component. No dependencies, no build step.
 *
 * USAGE:
 *   <script src="hugo.js"></script>
 *   <hugo-owl></hugo-owl>
 *   <hugo-owl mood="celebrate" palette="lavender" size="180"></hugo-owl>
 *
 * Attributes (all optional, all live-updatable from JS):
 *   mood    : happy | wave | celebrate | love | sleepy | wink | curious   (default happy)
 *   palette : mint | lavender | sky | peach                                (default mint)
 *   size    : pixel width/height, e.g. "160". Omit to fill its container.
 *   float   : "off" to disable the gentle floating motion.
 *
 * Change him from code:
 *   document.querySelector('hugo-owl').setAttribute('mood', 'celebrate');
 */
(function () {
  if (customElements.get('hugo-owl')) return;

  var PALETTES = {
    mint:     { bL: '#5FE0CB', bM: '#36C2AE', bD: '#0E8478', rim: '#9FF0E2', socket: '#1AA593', cheek: '#FF8A6F' },
    lavender: { bL: '#CDBEF6', bM: '#A78BE6', bD: '#6B4FB0', rim: '#E8DCFF', socket: '#8E73CF', cheek: '#FF9BB0' },
    sky:      { bL: '#86D6F5', bM: '#46B4E6', bD: '#1E6FA8', rim: '#C8EEFF', socket: '#3E9BCF', cheek: '#FF9E8A' },
    peach:    { bL: '#FFCBA6', bM: '#FF9E6F', bD: '#D9683E', rim: '#FFE2CE', socket: '#E87E54', cheek: '#F2607E' }
  };

  var EYE = {
    happy: ['open', 'open'], wave: ['open', 'open'], curious: ['open', 'open'],
    celebrate: ['arc', 'arc'], love: ['arc', 'arc'],
    wink: ['arc', 'open'], sleepy: ['sleepy', 'sleepy']
  };

  var KEYFRAMES =
    '@keyframes hugoBlink{0%,90%,100%{transform:scaleY(1)}94%,96%{transform:scaleY(0.1)}}' +
    '@keyframes hugoFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}' +
    '@keyframes hugoWave{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-26deg)}}';

  function eye(side, cx, kind, uid, pal, gaze) {
    var px = cx + gaze.dx, py = 130 + gaze.dy;
    if (kind === 'open') {
      var delay = side === 'L' ? '0.2s' : '0.32s';
      return (
        '<ellipse cx="' + cx + '" cy="130" rx="50" ry="51" fill="' + pal.socket + '" opacity="0.32"></ellipse>' +
        '<g style="transform-box:fill-box;transform-origin:center;animation:hugoBlink 5.2s ' + delay + ' infinite">' +
          '<circle cx="' + cx + '" cy="130" r="46" fill="url(#hpEye' + uid + ')"></circle>' +
          '<circle cx="' + px + '" cy="' + py + '" r="19" fill="#163F39"></circle>' +
          '<circle cx="' + (px - 7) + '" cy="' + (py - 7) + '" r="7" fill="#fff"></circle>' +
          '<circle cx="' + (px + 5) + '" cy="' + (py + 4) + '" r="3" fill="#fff" opacity="0.85"></circle>' +
        '</g>'
      );
    }
    if (kind === 'arc') {
      var ax = cx - 25;
      return '<path d="M' + ax + ' 132 q25 -28 50 0" stroke="#163F39" stroke-width="10" fill="none" stroke-linecap="round"></path>';
    }
    // sleepy
    var sx = cx - 25;
    return '<path d="M' + sx + ' 126 q25 22 50 0" stroke="#163F39" stroke-width="9" fill="none" stroke-linecap="round"></path>';
  }

  function svg(mood, paletteName, doFloat) {
    var pal = PALETTES[paletteName] || PALETTES.mint;
    var eyes = EYE[mood] || ['open', 'open'];
    var gaze = mood === 'curious' ? { dx: 7, dy: -2 } : { dx: 0, dy: 3 };
    var uid = '_' + paletteName + '_' + mood;
    var celebrate = mood === 'celebrate';
    var leftWingT = celebrate ? 'rotate(-30 50 140)' : '';
    var rightWingT = celebrate ? 'rotate(30 210 140)' : '';
    var leftWingStyle = mood === 'wave'
      ? 'transform-box:fill-box;transform-origin:52px 130px;animation:hugoWave 0.85s ease-in-out infinite'
      : '';
    var floatStyle = doFloat
      ? 'animation:hugoFloat 4.5s ease-in-out infinite;transform-box:fill-box;transform-origin:center bottom'
      : '';

    return '' +
'<svg viewBox="0 0 260 300" preserveAspectRatio="xMidYMid meet" style="display:block;width:100%;height:100%;overflow:visible">' +
'<defs>' +
  '<radialGradient id="hpBody' + uid + '" cx="0.38" cy="0.3" r="0.85"><stop offset="0" stop-color="' + pal.bL + '"/><stop offset="0.55" stop-color="' + pal.bM + '"/><stop offset="1" stop-color="' + pal.bD + '"/></radialGradient>' +
  '<radialGradient id="hpBelly' + uid + '" cx="0.42" cy="0.28" r="0.9"><stop offset="0" stop-color="#FFFDF6"/><stop offset="0.7" stop-color="#FBF0D9"/><stop offset="1" stop-color="#EFDCB8"/></radialGradient>' +
  '<radialGradient id="hpEye' + uid + '" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#E9F3F1"/></radialGradient>' +
  '<linearGradient id="hpWing' + uid + '" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="' + pal.bM + '"/><stop offset="1" stop-color="' + pal.bD + '"/></linearGradient>' +
  '<linearGradient id="hpBeak' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFCB5C"/><stop offset="1" stop-color="#F2A02E"/></linearGradient>' +
  '<filter id="hpFelt' + uid + '" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" result="na"/><feComposite in="na" in2="SourceGraphic" operator="in" result="grain"/><feBlend in="SourceGraphic" in2="grain" mode="multiply"/></filter>' +
  '<filter id="hpShadow' + uid + '" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#0B2E2A" flood-opacity="0.2"/></filter>' +
'</defs>' +
'<ellipse cx="130" cy="282" rx="62" ry="12" fill="#0B2E2A" opacity="0.14"></ellipse>' +
'<g style="' + floatStyle + '">' +
'<g filter="url(#hpShadow' + uid + ')">' +
  // tufts
  '<g transform="rotate(-16 110 74)"><path d="M110 76 C96 58 92 34 100 14 C112 30 120 52 118 74 C116 80 113 80 110 76 Z" fill="' + pal.bD + '"/><path d="M110 74 C99 58 96 38 101 20 C110 34 116 54 114 72 C113 78 112 78 110 74 Z" fill="' + pal.bM + '"/><path d="M108 70 C101 56 99 40 102 26" stroke="' + pal.bL + '" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.85"/></g>' +
  '<g transform="rotate(-40 119 76)"><path d="M119 78 C111 66 109 50 114 38 C122 48 126 62 125 76 C124 80 121 81 119 78 Z" fill="' + pal.bD + '"/><path d="M119 76 C113 66 111 52 115 42 C121 50 124 62 123 74 C122 78 120 79 119 76 Z" fill="' + pal.bM + '"/></g>' +
  '<g transform="rotate(26 150 74) translate(150 76) scale(1.2) translate(-150 -76)"><path d="M150 76 C164 58 168 34 160 14 C148 30 140 52 142 74 C144 80 147 80 150 76 Z" fill="' + pal.bD + '"/><path d="M150 74 C161 58 164 38 159 20 C150 34 144 54 146 72 C147 78 148 78 150 74 Z" fill="' + pal.bM + '"/><path d="M152 70 C159 56 161 40 158 26" stroke="' + pal.bL + '" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.85"/></g>' +
  '<g transform="rotate(6 142 76)"><path d="M142 78 C135 66 133 50 138 38 C146 48 150 62 149 76 C148 80 145 81 142 78 Z" fill="' + pal.bD + '"/><path d="M142 76 C136 66 134 52 138 42 C144 50 147 62 146 74 C145 78 143 79 142 76 Z" fill="' + pal.bM + '"/></g>' +
  // wings
  '<path d="M52 130 q-26 6 -22 56 q4 30 30 30 q12 -42 6 -84 q-6 -6 -14 -2 Z" fill="url(#hpWing' + uid + ')" transform="' + leftWingT + '" style="' + leftWingStyle + '"/>' +
  '<path d="M208 130 q26 6 22 56 q-4 30 -30 30 q-12 -42 -6 -84 q6 -6 14 -2 Z" fill="url(#hpWing' + uid + ')" transform="' + rightWingT + '"/>' +
  // body
  '<ellipse cx="130" cy="166" rx="98" ry="100" fill="url(#hpBody' + uid + ')" filter="url(#hpFelt' + uid + ')"/>' +
  '<path d="M70 96 q60 -42 120 0" stroke="' + pal.rim + '" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.5"/>' +
  // feet
  '<ellipse cx="112" cy="262" rx="15" ry="9" fill="#F2A02E"/><ellipse cx="148" cy="262" rx="15" ry="9" fill="#F2A02E"/>' +
  '<ellipse cx="112" cy="259" rx="15" ry="6" fill="#FFCB5C" opacity="0.7"/><ellipse cx="148" cy="259" rx="15" ry="6" fill="#FFCB5C" opacity="0.7"/>' +
  // belly
  '<ellipse cx="130" cy="192" rx="64" ry="68" fill="url(#hpBelly' + uid + ')" filter="url(#hpFelt' + uid + ')"/>' +
  '<path d="M130 214 c-9 -10 -25 -3 -25 8 c0 10 14 18 25 26 c11 -8 25 -16 25 -26 c0 -11 -16 -18 -25 -8 Z" fill="#FF8A6F" opacity="0.16"/>' +
  // cheeks
  '<circle cx="70" cy="172" r="17" fill="' + pal.cheek + '" opacity="0.45"/><circle cx="190" cy="172" r="17" fill="' + pal.cheek + '" opacity="0.45"/>' +
  // eyes
  eye('L', 95, eyes[0], uid, pal, gaze) +
  eye('R', 165, eyes[1], uid, pal, gaze) +
  // beak
  '<path d="M119 144 Q130 140 141 144 Q139 159 130 166 Q121 159 119 144 Z" fill="url(#hpBeak' + uid + ')"/>' +
  '<path d="M119 144 Q130 140 141 144 Q139 159 130 166 Q121 159 119 144 Z" fill="none" stroke="#D98A1F" stroke-width="2" stroke-linejoin="round"/>' +
  (celebrate ? '<path d="M114 170 q16 24 32 0 Z" fill="#E8607A"/>' : '') +
'</g></g></svg>';
  }

  var sheet = null;
  function ensureKeyframes() {
    if (sheet) return;
    sheet = document.createElement('style');
    sheet.textContent = KEYFRAMES;
    document.head.appendChild(sheet);
  }

  class HugoOwl extends HTMLElement {
    static get observedAttributes() { return ['mood', 'palette', 'size', 'float']; }
    connectedCallback() { ensureKeyframes(); this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var size = this.getAttribute('size');
      this.style.display = 'inline-block';
      this.style.lineHeight = '0';
      if (size) { this.style.width = size + 'px'; this.style.height = size + 'px'; }
      else if (!this.style.width) { this.style.width = '100%'; this.style.height = '100%'; }
      var doFloat = this.getAttribute('float') !== 'off';
      this.innerHTML = svg(
        this.getAttribute('mood') || 'happy',
        this.getAttribute('palette') || 'mint',
        doFloat
      );
    }
  }
  customElements.define('hugo-owl', HugoOwl);
})();
