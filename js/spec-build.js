/* ==========================================================================
   spec-build.js — 逐个组件生成 + 规格框 + 幽灵光标
   零依赖，直接 <script src="spec-build.js"></script> 即自动运行。

   用法：
     1) 给要“逐个生成”的元素加 data-build="标签文字"（顺序 = DOM 顺序）
     2) 引入 spec-build.css + spec-build.js
     3) 需要改参数时，在引入前设置 window.SPEC_BUILD_OPTIONS = {...}

   API：
     const sb = new SpecBuild(options); sb.start(); sb.replay(); sb.finish(); sb.destroy();
     window.specBuild  （自动实例）
   ========================================================================== */
(function (global) {
  'use strict';

  var AUTO_SCRIPT = document.currentScript;   // 必须在脚本执行时取，DOMContentLoaded 后为 null

  var DEFAULT_COLORS = ['#ff4b4b', '#ffb347', '#6ef2a0', '#5b7cfa', '#c58cff', '#57d9c1', '#ff7ab8', '#9ad1ff'];
  var DEFAULT_NAMES = ['atlas', 'nova', 'pixel', 'quill', 'wren', 'moss', 'ember', 'kite'];

  var DEFAULTS = {
    selector: '[data-build]',   // 目标元素
    speed: 1.9,                 // 全局速度倍率
    stepMs: 950,                // 每个组件占用的基准毫秒数（实际 = stepMs / speed）
    cursorCount: 8,             // 幽灵光标数量
    colors: DEFAULT_COLORS,
    names: DEFAULT_NAMES,
    hud: true,                  // 是否显示底部 HUD
    hudAgents: 18,              // HUD 上显示的 agent 数（纯装饰）
    settle: true,               // 完成后光标是否收进右下角并静止
    settleCorner: 'bottom-right',
    autoStart: true,
    startDelay: 900,            // 首帧延迟（等字体/布局稳定）
    scrollDelay: 620,           // 目标在视口外时，滚动后等待多久再测量
    altEvery: 4,                // 每 N 个组件用红色框（其余蓝色）
    onStep: null,               // (index, el) => void
    onComplete: null            // () => void
  };

  function css(el, prop) { return getComputedStyle(el).getPropertyValue(prop); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function SpecBuild(options) {
    this.opt = Object.assign({}, DEFAULTS, options || {});
    this.targets = [];
    this.ghosts = [];
    this.cursors = [];
    this.index = 0;
    this.paused = false;
    this.settled = false;
    this.timer = null;
    this.rafId = null;
    this.el = {};
    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onKey = this._onKey.bind(this);
    this._tick = this._tick.bind(this);
    this._mounted = false;
  }

  /* ---------------- 挂载 ---------------- */
  SpecBuild.prototype.mount = function () {
    if (this._mounted) return this;
    this._mounted = true;

    this.targets = Array.prototype.slice.call(document.querySelectorAll(this.opt.selector));
    if (!this.targets.length) {
      console.warn('[spec-build] 没有找到目标元素：', this.opt.selector);
      return this;
    }

    // 根标记：只有加了 sb-ready，目标元素才会被隐藏（JS 失效时页面照常显示）
    document.documentElement.classList.add('sb-ready');

    // 幽灵骨架层
    var ghostLayer = document.createElement('div');
    ghostLayer.className = 'sb-ghost-layer';
    document.body.appendChild(ghostLayer);

    // 标注框
    var overlay = document.createElement('div');
    overlay.className = 'sb-overlay';
    overlay.innerHTML =
      '<div class="sb-spec">' +
        '<i></i><i></i><i></i><i></i>' +
        '<span class="sb-tag"></span>' +
        '<span class="sb-dim">0 × 0</span>' +
      '</div>';
    document.body.appendChild(overlay);

    // 光标层
    var cursorLayer = document.createElement('div');
    cursorLayer.className = 'sb-cursor-layer';
    document.body.appendChild(cursorLayer);

    this.el = {
      ghostLayer: ghostLayer,
      overlay: overlay,
      spec: overlay.querySelector('.sb-spec'),
      tag: overlay.querySelector('.sb-tag'),
      dim: overlay.querySelector('.sb-dim'),
      cursorLayer: cursorLayer
    };

    this._createCursors();
    if (this.opt.hud) this._createHud();

    window.addEventListener('resize', this._onResize);
    document.addEventListener('keydown', this._onKey);

    if (this.opt.autoStart) this.start();
    return this;
  };

  /* ---------------- 光标 ---------------- */
  SpecBuild.prototype._createCursors = function () {
    var n = Math.max(0, this.opt.cursorCount | 0);

    for (var i = 0; i < n; i++) {
      var color = this.opt.colors[i % this.opt.colors.length];
      var name = this.opt.names[i % this.opt.names.length];

      var el = document.createElement('div');
      el.className = 'sb-cursor';
      el.style.color = color;
      el.innerHTML =
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="' + color + '" stroke="#0a0a0b" ' +
        'stroke-width="1.4" stroke-linejoin="round">' +
        '<path d="M4 2.5 L20.5 11.2 L12.6 12.7 L9.3 20.6 Z"/></svg>' +
        '<span class="sb-name" style="background:' + color + '">' + name + '</span>';
      this.el.cursorLayer.appendChild(el);

      var c = {
        el: el,
        x: window.innerWidth * (0.2 + Math.random() * 0.6),
        y: window.innerHeight * (0.3 + Math.random() * 0.4),
        tx: 0, ty: 0,
        speed: rand(0.09, 0.19),
        idle: i * 900,
        holdUntil: 0
      };
      this._retarget(c, null);
      el.style.opacity = '0.95';
      this.cursors.push(c);
    }

    if (!this.cursors.length) return;
    this._rafLast = performance.now();
    this.rafId = requestAnimationFrame(this._tick);
  };

  SpecBuild.prototype._retarget = function (c, rect) {
    if (rect) {
      c.tx = rect.left + rand(-28, rect.width + 28);
      c.ty = rect.top + rand(-18, rect.height + 18);
      c.holdUntil = performance.now() + 800;
    } else {
      c.tx = rand(60, window.innerWidth - 60);
      c.ty = rand(120, window.innerHeight - 120);
      c.holdUntil = 0;
    }
    c.speed = rand(0.08, 0.19);
  };

  SpecBuild.prototype._tick = function (t) {
    var dt = Math.min(48, t - this._rafLast);
    this._rafLast = t;
    var speed = this.opt.speed;

    for (var i = 0; i < this.cursors.length; i++) {
      var c = this.cursors[i];
      var k = 1 - Math.pow(1 - Math.min(0.55, c.speed * (speed / 1.9)), dt / 16.67);
      c.x += (c.tx - c.x) * k;
      c.y += (c.ty - c.y) * k;

      if (!this.settled && Math.hypot(c.tx - c.x, c.ty - c.y) < 12 && performance.now() > c.holdUntil) {
        this._retarget(c, null);
      }
      if (this.settled && Math.hypot(c.tx - c.x, c.ty - c.y) < 0.6) { c.x = c.tx; c.y = c.ty; }

      var jx = this.settled ? 0 : Math.sin((t + c.idle) / 380) * 1.1;
      var jy = this.settled ? 0 : Math.cos((t + c.idle) / 300) * 1.1;
      c.el.style.transform = 'translate3d(' + (c.x + jx).toFixed(1) + 'px,' + (c.y + jy).toFixed(1) + 'px,0)';
    }
    this.rafId = requestAnimationFrame(this._tick);
  };

  /* ---------------- HUD ---------------- */
  SpecBuild.prototype._createHud = function () {
    var hud = document.createElement('div');
    hud.className = 'sb-hud';
    hud.innerHTML =
      '<span class="sb-dots">' +
        '<i style="background:#ff4b4b"></i><i style="background:#ffb347"></i>' +
        '<i style="background:#6ef2a0"></i><i style="background:#5b7cfa"></i>' +
      '</span>' +
      '<span><b style="color:#e9e9e6">' + this.opt.hudAgents + '</b> agents</span>' +
      '<span class="sb-progress">0 / ' + this.targets.length + ' components</span>' +
      '<span class="sb-bar"><span></span></span>' +
      '<span class="sb-text-btn sb-speed" title="切换速度">×' + this.opt.speed + '</span>' +
      '<button class="sb-replay" title="重播">↻</button>' +
      '<button class="sb-pause" title="暂停 / 继续">❚❚</button>';

    document.body.appendChild(hud);

    var self = this;
    hud.querySelector('.sb-replay').addEventListener('click', function () { self.replay(); });
    hud.querySelector('.sb-pause').addEventListener('click', function () { self.toggle(); });
    hud.querySelector('.sb-speed').addEventListener('click', function () {
      var steps = [1, 1.9, 2.8, 4];
      var i = steps.indexOf(self.opt.speed);
      self.opt.speed = steps[(i + 1) % steps.length];
      this.textContent = '×' + self.opt.speed;
      if (!self.paused) self._schedule(200);
    });

    this.el.hud = hud;
  };

  SpecBuild.prototype._hudUpdate = function () {
    if (!this.el.hud) return;
    var p = this.el.hud.querySelector('.sb-progress');
    var b = this.el.hud.querySelector('.sb-bar span');
    p.textContent = this.index + ' / ' + this.targets.length + ' components';
    b.style.width = (this.targets.length ? (this.index / this.targets.length * 100) : 0) + '%';
  };

  /* ---------------- 骨架 ---------------- */
  SpecBuild.prototype._drawGhosts = function () {
    var layer = this.el.ghostLayer;
    layer.innerHTML = '';
    this.ghosts = this.targets.map(function (el) {
      var r = el.getBoundingClientRect();
      var g = document.createElement('div');
      g.className = 'sb-ghost';
      g.style.top = (r.top + window.scrollY) + 'px';
      g.style.left = (r.left + window.scrollX) + 'px';
      g.style.width = r.width + 'px';
      g.style.height = r.height + 'px';
      layer.appendChild(g);
      return g;
    });
  };

  SpecBuild.prototype._killGhost = function (i) {
    if (this.ghosts[i]) { this.ghosts[i].remove(); this.ghosts[i] = null; }
  };

  SpecBuild.prototype._markParent = function (el) {
    var parent = el.closest(".realm, .rule, .stele, .fate-slip");
    if (!parent) return;
    // 卡片背景不是生成目标，子部件出现时让卡片本身一起显现。
    parent.classList.add("sb-parent-visible");
    parent.classList.add("is-in");
  };

  SpecBuild.prototype._onResize = function () {
    if (this.settled) return;
    this._drawGhosts();
  };

  SpecBuild.prototype._onScroll = function () { /* 预留：可做视差 */ };

  SpecBuild.prototype._onKey = function (e) {
    var k = (e.key || '').toLowerCase();
    if (k === 'r') this.replay();
    if (k === 's') this.toggle();
    if (k === 'c' && this.el.cursorLayer) {
      this.el.cursorLayer.style.display = this.el.cursorLayer.style.display === 'none' ? '' : 'none';
    }
  };

  /* ---------------- 时间线 ---------------- */
  SpecBuild.prototype.start = function () {
    if (!this._mounted) this.mount();
    var self = this;
    clearTimeout(this.timer);
    this.paused = false;
    this.settled = false;
    this.index = 0;

    this.cursors.forEach(function (c) {
      c.el.classList.remove('sb-settled');
      c.holdUntil = 0;
      self._retarget(c, null);
    });
    this.targets.forEach(function (el) {
      el.classList.remove('sb-built', 'sb-building');
      var parent = el.closest(".realm, .rule, .stele, .fate-slip");
      if (parent) parent.classList.remove("sb-parent-visible");
    });
    if (this.el.spec) { this.el.spec.classList.remove('sb-on'); this.el.tag.textContent = ''; }
    this._hudUpdate();
    this._drawGhosts();
    this._schedule(this.opt.startDelay);
  };

  SpecBuild.prototype.replay = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.start();
  };

  SpecBuild.prototype.toggle = function () {
    this.paused = !this.paused;
    if (this.paused) clearTimeout(this.timer);
    else this._schedule(200);
    return this.paused;
  };

  SpecBuild.prototype._schedule = function (ms) {
    var self = this;
    clearTimeout(this.timer);
    if (this.paused) return;
    this.timer = setTimeout(function () { self._step(); }, Math.max(120, ms / this.opt.speed));
  };

  SpecBuild.prototype._place = function (r, label, alt) {
    var spec = this.el.spec;
    spec.classList.toggle('sb-alt', !!alt);
    spec.classList.add('sb-on');
    spec.style.top = r.top + 'px';
    spec.style.left = r.left + 'px';
    spec.style.width = r.width + 'px';
    spec.style.height = r.height + 'px';
    this.el.tag.textContent = label || '';
    this.el.dim.textContent = Math.round(r.width) + ' × ' + Math.round(r.height);
  };

  SpecBuild.prototype._gather = function (r) {
    var n = 2 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      this._retarget(this.cursors[(Math.random() * this.cursors.length) | 0], r);
    }
    var clicker = this.cursors[(Math.random() * this.cursors.length) | 0];
    if (!clicker) return;
    clicker.tx = r.left + r.width * rand(0.2, 0.8);
    clicker.ty = r.top + r.height * rand(0.3, 0.8);
    clicker.el.classList.remove('sb-pulse');
    void clicker.el.offsetWidth;
    clicker.el.classList.add('sb-pulse');
  };

  SpecBuild.prototype._makeSpec = function (r, label, alt) {
    var spec = this.el.spec.cloneNode(true);
    spec.classList.remove('sb-on', 'sb-alt');
    spec.classList.toggle('sb-alt', !!alt);
    spec.style.top = r.top + 'px';
    spec.style.left = r.left + 'px';
    spec.style.width = r.width + 'px';
    spec.style.height = r.height + 'px';
    spec.querySelector('.sb-tag').textContent = label || '';
    spec.querySelector('.sb-dim').textContent = Math.round(r.width) + ' 脳 ' + Math.round(r.height);
    this.el.overlay.appendChild(spec);
    spec.classList.add('sb-on');
    return spec;
  };

  SpecBuild.prototype._runRow = function (row) {
    var self = this;
    var specs = [];
    row.forEach(function (item, i) {
      var r = item.el.getBoundingClientRect();
      var alt = (self.index + i) % self.opt.altEvery === self.opt.altEvery - 1;
      self._markParent(item.el);
      specs.push(self._makeSpec(r, item.el.dataset.build, alt));
      var cursor = self.cursors[i % self.cursors.length];
      if (cursor) {
        cursor.tx = r.left + r.width * 0.5;
        cursor.ty = r.top + r.height * 0.5;
        cursor.holdUntil = performance.now() + 650;
        cursor.el.classList.remove('sb-pulse');
        void cursor.el.offsetWidth;
        cursor.el.classList.add('sb-pulse');
      }
      item.el.classList.add('sb-building');
    });
    setTimeout(function () {
      row.forEach(function (item) {
        item.el.classList.remove('sb-building');
        item.el.classList.add('sb-built');
        self._killGhost(item.index);
      });
      specs.forEach(function (spec) { spec.remove(); });
      self.index += row.length;
      self._hudUpdate();
      row.forEach(function (item) {
        if (typeof self.opt.onStep === 'function') self.opt.onStep(item.index, item.el);
      });
    }, 80);
  };

  SpecBuild.prototype._step = function () {
    if (this.paused) return;
    if (this.index >= this.targets.length) { this.finish(); return; }

    var self = this;
    var idx = this.index;
    var el = this.targets[idx];
    var r0 = el.getBoundingClientRect();
    var row = [];
    if (this.opt.parallelRows !== false) {
      for (var i = idx; i < this.targets.length; i++) {
        var ri = this.targets[i].getBoundingClientRect();
        if (i === idx || Math.abs(ri.top - r0.top) <= this.opt.rowTolerance) {
          row.push({ el: this.targets[i], index: i });
        } else {
          break;
        }
      }
    }
    var needScroll = r0.top < 90 || r0.bottom > window.innerHeight - 90;

    var run = function () {
      if (row.length > 1) {
        self._runRow(row);
        return;
      }
      var r = el.getBoundingClientRect();
      self._markParent(el);
      self._place(r, el.dataset.build, idx % self.opt.altEvery === self.opt.altEvery - 1);
      self._gather(r);
      el.classList.add('sb-building');
      setTimeout(function () {
        el.classList.remove('sb-building');
        el.classList.add('sb-built');
        self._killGhost(idx);
      }, 70);
      self.index++;
      self._hudUpdate();
      if (typeof self.opt.onStep === 'function') self.opt.onStep(idx, el);
    };

    if (needScroll) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(run, this.opt.scrollDelay);
      this._schedule(this.opt.stepMs + 560);
    } else {
      run();
      this._schedule(this.opt.stepMs);
    }
  };

  /* ---------------- 收尾 ---------------- */
  SpecBuild.prototype.finish = function () {
    if (this.el.spec) this.el.spec.classList.remove('sb-on');
    this.index = this.targets.length;
    this._hudUpdate();
    if (this.el.hud) {
      var p = this.el.hud.querySelector('.sb-progress');
      if (p) p.textContent = 'build complete ✓';
    }
    if (this.opt.settle) this._settleCursors();
    if (typeof this.opt.onComplete === 'function') this.opt.onComplete();
  };

  SpecBuild.prototype._settleCursors = function () {
    this.settled = true;
    var bx = window.innerWidth - 34;
    var by = window.innerHeight - 30;
    if (this.opt.settleCorner === 'bottom-left') { bx = 34; }
    if (this.opt.settleCorner === 'top-right') { by = 34; }
    if (this.opt.settleCorner === 'top-left') { bx = 34; by = 34; }

    this.cursors.forEach(function (c, i) {
      c.tx = bx - (i % 4) * 1.6;
      c.ty = by - Math.floor(i / 4) * 1.6;
      c.speed = 0.07;
      c.holdUntil = Infinity;
      c.el.classList.add('sb-settled');
    });
  };

  /* ---------------- 销毁 ---------------- */
  SpecBuild.prototype.destroy = function () {
    clearTimeout(this.timer);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('keydown', this._onKey);
    document.documentElement.classList.remove('sb-ready');
    this.targets.forEach(function (el) {
      el.classList.remove('sb-built', 'sb-building');
      var parent = el.closest(".realm, .rule, .stele, .fate-slip");
      if (parent) parent.classList.remove("sb-parent-visible");
    });
    ['ghostLayer', 'overlay', 'cursorLayer', 'hud'].forEach(function (k) {
      if (this.el[k] && this.el[k].parentNode) this.el[k].parentNode.removeChild(this.el[k]);
    }, this);
    this._mounted = false;
  };

  global.SpecBuild = SpecBuild;

  /* 自动初始化：<script src="spec-build.js"></script> 即可 */
  function autoInit() {
    if (AUTO_SCRIPT && AUTO_SCRIPT.dataset.auto === 'false') return;
    if (document.documentElement.hasAttribute('data-spec-build-manual')) return;
    var sb = new SpecBuild(global.SPEC_BUILD_OPTIONS || {});
    sb.mount();
    global.specBuild = sb;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})(window);
