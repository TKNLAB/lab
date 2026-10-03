// <rb-sprite>: pixel Rakesh. Types at a laptop; waves (with a wink) every few seconds and on hover.
(function () {
  if (customElements.get('rb-sprite')) return;
  const C = { H: '#231a16', h: '#4a3a33', S: '#e2c3ab', s: '#c9a58c', E: '#120c0a', e: '#ffffff', B: '#2e1f18', W: '#d3dee8', w: '#a8b7c6', D: '#ffffff', L: '#8f97a3', l: '#5d6470', G: '#e6b667' };
  const BASE = [
    '........hhhhhh......',
    '......HhhhhhhHHH....',
    '.....HHHHHHHHHHHH...',
    '.....HHSSSSSSHH.....',
    '.....sSSSSSSSSs.....',
    '.....sSSESSESSs.....',
    '......SSSSSSSS......',
    '......SSSSSSSS......',
    '......SSSSSSSS......',
    '.......SSSSSS.......',
    '........SSSS........',
    '....wWWWDWWDWWWw....',
    '...wWWWWDWWDWWWWw...',
    '...wWWWWDWWDWWWWw...',
    '..LLLLLLLLLLLLLLLL..',
    '..LLLLLLLLLLLLLLLL..',
    '..LLLLLLLGGLLLLLLL..',
    '..LLLLLLLLLLLLLLLL..',
    '.llllllllllllllllll.'
  ];
  const px = (list, c) => list.map(([x, y]) => [x, y, c]);
  const TYPE = [px([[6, 13], [7, 13]], 'S'), px([[12, 13], [13, 13]], 'S')];
  const SPARK = [[], px([[18, 12]], 'G'), px([[18, 10]], 'G'), px([[19, 8]], 'G')];
  const ARM = px([[16, 11], [17, 11], [17, 10], [17, 9]], 'W');
  const WAVE = [
    ARM.concat(px([[17, 7], [17, 8], [18, 7], [18, 8], [18, 6]], 'S')),
    ARM.concat(px([[18, 7], [18, 8], [19, 7], [19, 8], [19, 6]], 'S'))
  ];
  const WINK = px([[9, 8], [10, 8]], 'B');
  const SC = 2, Wd = 20, Ht = BASE.length;

  class RbSprite extends HTMLElement {
    connectedCallback() {
      if (this._cv) return;
      const cv = document.createElement('canvas');
      cv.width = Wd * SC; cv.height = Ht * SC;
      cv.style.cssText = 'display:block;width:100%;height:100%;image-rendering:pixelated;';
      this.appendChild(cv);
      const bb = document.createElement('span');
      bb.textContent = 'hi!';
      bb.style.cssText = "position:absolute;right:100%;top:2px;margin-right:3px;padding:1px 5px;border-radius:6px 6px 0 6px;background:#e8ecf3;color:#0d1422;font:600 9px/1.4 'Geist Mono',monospace;letter-spacing:0.04em;opacity:0;transform:translateY(3px) scale(.9);transform-origin:right bottom;transition:opacity .25s,transform .25s;pointer-events:none;white-space:nowrap;";
      this.appendChild(bb); this._bb = bb;
      this._cv = cv; this._ctx = cv.getContext('2d');
      this._t = 0; this._wave = 0; this._vis = true;
      this._rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.addEventListener('mouseenter', () => { this._wave = Math.max(this._wave, 12); });
      this.draw();
      if (this._rm) return;
      if ('IntersectionObserver' in window) {
        this._io = new IntersectionObserver(es => { this._vis = es[0].isIntersecting; if (this._vis) this._wave = Math.max(this._wave, 8); });
        this._io.observe(this);
      }
      this._iv = setInterval(() => {
        if (!this._vis || document.hidden) return;
        this._t++;
        if (this._wave > 0) this._wave--;
        else if (this._t % 20 === 0) this._wave = 12;
        this.draw();
      }, 170);
    }
    disconnectedCallback() { clearInterval(this._iv); if (this._io) this._io.disconnect(); this._cv = null; this.innerHTML = ''; }
    draw() {
      const g = this._ctx; if (!g) return;
      g.clearRect(0, 0, Wd * SC, Ht * SC);
      const dot = (x, y, k) => { g.fillStyle = C[k]; g.fillRect(x * SC, y * SC, SC, SC); };
      BASE.forEach((row, y) => { for (let x = 0; x < Wd; x++) if (row[x] !== '.') dot(x, y, row[x]); });
      let extra;
      if (this._wave > 0) extra = WAVE[this._wave % 2].concat(TYPE[0], this._wave > 0 ? WINK : []);
      else extra = TYPE[this._t % 2].concat(SPARK[this._t % 4], this._t % 23 === 0 ? px([[8, 5], [11, 5]], 'S') : []);
      if (this._bb) { const on = this._wave > 0; this._bb.style.opacity = on ? '1' : '0'; this._bb.style.transform = on ? 'none' : 'translateY(3px) scale(.9)'; }
      extra.forEach(([x, y, k]) => dot(x, y, k));
    }
  }
  customElements.define('rb-sprite', RbSprite);
})();
