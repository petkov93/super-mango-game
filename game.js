/* =============================================================
   MANGO — NIGHT RUNNER
   Milestone 1: run, jump, camera, phone controls.

   Everything you might want to tweak lives in TUNING and LEVEL.
   ============================================================= */

const BASE_W = 960;
const BASE_H = 540;
const TILE = 54;
const COLS = 40;
const ROWS = 10;
const WORLD_W = COLS * TILE; // 2160
const WORLD_H = ROWS * TILE; // 540

// ---- The "feel" numbers. These matter more than any graphic. ----
const TUNING = {
  gravity: 2000,        // how hard the world pulls Mango down
  holdGravityScale: 0.4,// less gravity while rising + holding jump
  fastFallExtra: 520,   // extra gravity while falling = snappy landings
  maxFallSpeed: 1250,
  jumpVelocity: -620,   // bigger number = higher jump
  jumpCut: -250,        // releasing early clips the jump to this speed
  coyoteTime: 0.10,     // grace seconds to still jump after leaving a ledge
  jumpBuffer: 0.12,     // remembers a jump pressed just before landing
  maxSpeed: 300,        // full joystick push
  groundAccel: 0.30,    // how fast speed changes on the ground
  airAccel: 0.15,       // ...and in the air
  stopAccel: 0.34,      // how fast Mango stops when the stick is released
};

// ---- The test level. Edit these numbers to change the layout. ----
const LEVEL = {
  ground: [
    { from: 0, to: 16 },   // street, left part
    { from: 20, to: 39 },  // street, right part (gap at 17-19)
  ],
  platforms: [
    { col: 6,  row: 6, len: 3 },
    { col: 10, row: 5, len: 2 },
    { col: 14, row: 6, len: 2 },
    { col: 22, row: 6, len: 3 },
    { col: 26, row: 5, len: 2 },
    { col: 30, row: 4, len: 2 },
    { col: 35, row: 6, len: 3 },
  ],
  lamps: [8, 24, 33],
  startCol: 4,

  // col/row are tiles; row 7 sits just above the street
  loot: [
    { col: 8, row: 7, type: 'coin' },
    { col: 9, row: 7, type: 'coin' },
    { col: 10, row: 7, type: 'coin' },
    { col: 6, row: 5, type: 'coin' },
    { col: 7, row: 5, type: 'coin' },
    { col: 8, row: 5, type: 'coin' },
    { col: 10, row: 4, type: 'coin' },
    { col: 11, row: 4, type: 'coin' },
    { col: 14, row: 5, type: 'scrap' },
    { col: 15, row: 5, type: 'scrap' },
    { col: 17, row: 6, type: 'coin' },
    { col: 18, row: 6, type: 'coin' },
    { col: 19, row: 6, type: 'coin' },
    { col: 22, row: 5, type: 'coin' },
    { col: 23, row: 5, type: 'coin' },
    { col: 24, row: 5, type: 'coin' },
    { col: 26, row: 4, type: 'scrap' },
    { col: 27, row: 4, type: 'scrap' },
    { col: 30, row: 3, type: 'diamond' },
    { col: 35, row: 5, type: 'coin' },
    { col: 36, row: 5, type: 'coin' },
    { col: 37, row: 5, type: 'coin' },
  ],

  officer: { col: 27, from: 23, to: 31 },
};

const GROUND_TOP = 8 * TILE; // y of the street surface

// =============================================================
// tiny helpers
// =============================================================

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  draw(tex.getContext(), w, h);
  tex.refresh();
}

// Draws a pixel-art grid: one array entry per row, one character per pixel.
function gridTexture(scene, key, rows, palette, px) {
  canvasTexture(scene, key, rows[0].length * px, rows.length * px, (ctx) => {
    ctx.clearRect(0, 0, rows[0].length * px, rows.length * px);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const colour = palette[row[x]];
        if (!colour) continue;
        ctx.fillStyle = colour;
        ctx.fillRect(x * px, y * px, px, px);
      }
    });
  });
}

// =============================================================
// Mango himself (16 rows x 12 columns of pixels, drawn at 3x)
// =============================================================

// o = outline (makes him readable against any background)
const MANGO_PALETTE = {
  '.': null,
  o: '#0a0c12', // outline
  h: '#262834', // hat
  H: '#3a3d4d', // hat highlight
  s: '#b98249', // skin
  e: '#f7f3e7', // eye white
  p: '#14161d', // pupil
  m: '#1b1d26', // moustache
  v: '#d59a2e', // shirt
  V: '#f0b64a', // shirt highlight
  t: '#3b4252', // trousers
  k: '#4a5164', // shoes
};

// 14 wide x 18 tall pixels, drawn big enough to be a whole tile high
const MANGO_HEAD = [
  '.....oooo.....',
  '...ooHHHHoo...',
  '..oHHhhhhHHo..',
  '..ohhhhhhhho..',
  '.ohhhhhhhhhho.',
  '.oooooooooooo.',
  '..osssssssso..',
  '..osssssssso..',
  '..osepsspeso..',
  '..osssssssso..',
  '..ommmmmmmmo..',
  '...ommmmmmo...',
  '....osssso....',
  '...ovvvvvvo...',
];

const MANGO_FRAMES = {
  'mango-idle': [
    ...MANGO_HEAD,
    '..osvvvvvvso..',
    '..osvvvvvvso..',
    '...otttttto...',
    '..okko..okko..',
  ],
  'mango-walk1': [
    ...MANGO_HEAD,
    '..osvvvvvvso..',
    '..osvvvvvvso..',
    '..otttttto....',
    '..okko...okko.',
  ],
  'mango-walk2': [
    ...MANGO_HEAD,
    '..osvvvvvvso..',
    '..osvvvvvvso..',
    '..otttttto....',
    '.okko...okko..',
  ],
  'mango-jump': [
    ...MANGO_HEAD,
    '..osvvvvvvso..',
    '.osvvvvvvvvso.',
    '...otttttto...',
    '.okko....okko.',
  ],
};

// ---- the law -------------------------------------------------

const OFFICER_PALETTE = {
  '.': null,
  o: '#0a0c12',
  C: '#3f5b96', // cap / uniform highlight
  c: '#2f4573', // uniform
  b: '#e8c25a', // cap badge
  s: '#d9a077', // skin
  e: '#f7f3e7',
  p: '#14161d',
  m: '#3a2a1c', // moustache
  t: '#1d2740', // trousers
  k: '#11151f', // boots
};

const OFFICER_TOP = [
  '.....oooo.....',
  '...ooCCCCoo...',
  '..oCCCCCCCCo..',
  '..occccbbcco..',
  '..oooooooooo..',
  '..osssssssso..',
  '..osssssssso..',
  '..osssssssso..',
  '..osepsspeso..',
  '..osssssssso..',
  '..ommmmmmmmo..',
  '...osssssso...',
  '...occcccco...',
  '..osccccccso..',
  '..osccccccso..',
  '...otttttto...',
];

const OFFICER_FRAMES = {
  'officer-idle': [...OFFICER_TOP, '...otttttto...', '..okko..okko..'],
  'officer-walk1': [...OFFICER_TOP, '...otttttto...', '..okko...okko.'],
  'officer-walk2': [...OFFICER_TOP, '...otttttto...', '.okko...okko..'],
};

// ---- things worth taking --------------------------------------

const COIN_GRID = [
  '..oooo..',
  '.oCCCCo.',
  'oCCCwwCo',
  'oCCwwCCo',
  'oCCwwCCo',
  'oCCCwwCo',
  '.ocCCco.',
  '..oooo..',
];

const SCRAP_GRID = [
  '..oooo..',
  '.oAAAAo.',
  'oAAAAAAo',
  'oAAooAAo',
  'oAAooAAo',
  'oAAAAAAo',
  '.oAAAAo.',
  '..oooo..',
];

const DIAMOND_GRID = [
  '..oooo..',
  '.oDDDDo.',
  'oDwwwwDo',
  'oDDwwDDo',
  '.oDDDDo.',
  '..oDDo..',
  '...oo...',
];

const LOOT_STYLES = {
  coin: { texture: 'coin', value: 10 },
  scrap: { texture: 'scrap', value: 25 },
  diamond: { texture: 'diamond', value: 100 },
};

// =============================================================
// the scene
// =============================================================

class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  create() {
    this.score = 0;
    this.invulnUntil = 0;
    this.makeTextures();
    this.buildBackdrop();
    this.buildLevel();
    this.buildPlayer();
    this.buildLoot();
    this.buildOfficer();
    this.buildControls();
    this.buildHint();
    this.buildHud();

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor('#070912');
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cameras.main.setDeadzone(150, 120);

    this.coyote = 0;
    this.facing = 1;
  }

  // ------------------------------------------------------------
  // art
  // ------------------------------------------------------------

  makeTextures() {
    for (const [key, rows] of Object.entries(MANGO_FRAMES)) {
      gridTexture(this, key, rows, MANGO_PALETTE, 3);
    }
    for (const [key, rows] of Object.entries(OFFICER_FRAMES)) {
      gridTexture(this, key, rows, OFFICER_PALETTE, 3);
    }

    gridTexture(this, 'coin', COIN_GRID, {
      '.': null, o: '#6b4a12', C: '#f2b52e', c: '#c98f1e', w: '#ffe9a8',
    }, 3);
    gridTexture(this, 'scrap', SCRAP_GRID, {
      '.': null, o: '#1b2029', A: '#9aa7bd', a: '#6d7a91',
    }, 3);
    gridTexture(this, 'diamond', DIAMOND_GRID, {
      '.': null, o: '#12505e', D: '#5ee0f0', w: '#d8fbff',
    }, 3);

    // three little stars that spin over a conked officer
    canvasTexture(this, 'dizzy', 34, 12, (ctx) => {
      ctx.fillStyle = '#ffe066';
      [6, 17, 28].forEach((cx, i) => {
        const cy = 6 + (i % 2) * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 5);
        ctx.lineTo(cx + 4, cy);
        ctx.lineTo(cx, cy + 5);
        ctx.lineTo(cx - 4, cy);
        ctx.closePath();
        ctx.fill();
      });
    });

    // street block
    canvasTexture(this, 'tile-ground', TILE, TILE, (ctx) => {
      const rnd = mulberry32(11);
      ctx.fillStyle = '#1b1e29';
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#262b39'; // kerb
      ctx.fillRect(0, 0, TILE, 8);
      ctx.fillStyle = '#343b4d';
      ctx.fillRect(0, 0, TILE, 3);
      ctx.fillStyle = '#141722';
      ctx.fillRect(0, TILE - 8, TILE, 8);
      ctx.fillStyle = '#222634';
      for (let i = 0; i < 26; i++) {
        ctx.fillRect(Math.floor(rnd() * TILE), 10 + Math.floor(rnd() * (TILE - 20)), 3, 3);
      }
      ctx.fillStyle = '#12151e';
      ctx.fillRect(TILE / 2 - 1, 8, 2, TILE - 16);
    });

    // floating platform: steel grating
    canvasTexture(this, 'tile-platform', TILE, TILE, (ctx) => {
      ctx.fillStyle = '#242a3a';
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#333c52';
      ctx.fillRect(3, 3, TILE - 6, TILE - 6);
      ctx.fillStyle = '#4b5876';
      ctx.fillRect(3, 3, TILE - 6, 4); // top edge catches the light
      ctx.fillStyle = '#1c2130';
      for (let y = 16; y < TILE - 8; y += 12) {
        ctx.fillRect(6, y, TILE - 12, 4);
      }
      ctx.fillStyle = '#6d7c9e';
      ctx.fillRect(6, 8, 3, 3);
      ctx.fillRect(TILE - 9, 8, 3, 3);
      ctx.fillRect(6, TILE - 9, 3, 3);
      ctx.fillRect(TILE - 9, TILE - 9, 3, 3);
    });

    // street lamp
    canvasTexture(this, 'lamp', 44, 178, (ctx) => {
      const glow = ctx.createRadialGradient(22, 26, 2, 22, 26, 30);
      glow.addColorStop(0, 'rgba(255,214,140,0.55)');
      glow.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(22, 26, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#232838';
      ctx.fillRect(19, 26, 6, 152);
      ctx.fillStyle = '#151925';
      ctx.fillRect(19, 26, 2, 152);
      ctx.fillStyle = '#2f3648';
      ctx.fillRect(12, 18, 20, 10);
      ctx.fillStyle = '#ffd98a';
      ctx.fillRect(15, 24, 14, 4);
    });

    // sky: gradient, stars, moon
    canvasTexture(this, 'sky', BASE_W, BASE_H, (ctx) => {
      const sky = ctx.createLinearGradient(0, 0, 0, BASE_H);
      sky.addColorStop(0, '#070912');
      sky.addColorStop(0.45, '#0f1322');
      sky.addColorStop(0.76, '#1c1b33');
      sky.addColorStop(1, '#2b2139');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, BASE_W, BASE_H);

      const rnd = mulberry32(1337);
      for (let i = 0; i < 110; i++) {
        const x = Math.round(rnd() * BASE_W);
        const y = Math.round(rnd() * 250);
        ctx.fillStyle = `rgba(214,226,255,${0.2 + rnd() * 0.6})`;
        const s = rnd() > 0.87 ? 2 : 1;
        ctx.fillRect(x, y, s, s);
      }

      const mx = 764;
      const my = 102;
      const mr = 42;
      const halo = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.6);
      halo.addColorStop(0, 'rgba(206,224,255,0.18)');
      halo.addColorStop(1, 'rgba(206,224,255,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mx, my, mr * 3.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e9eff9';
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9d5e8';
      ctx.beginPath();
      ctx.arc(mx - 13, my - 9, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx + 12, my + 11, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx + 3, my - 18, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    this.makeSkyline('skyline-far', 1920, 300, {
      seed: 7,
      colour: '#191d2e',
      minHeight: 100,
      windows: false,
    });
    this.makeSkyline('skyline-near', 1920, 250, {
      seed: 23,
      colour: '#0d101b',
      minHeight: 80,
      windows: true,
    });
  }

  makeSkyline(key, w, h, opts) {
    canvasTexture(this, key, w, h, (ctx) => {
      const rnd = mulberry32(opts.seed);
      let x = -20;
      while (x < w) {
        const bw = 44 + Math.floor(rnd() * 96);
        const bh = opts.minHeight + Math.floor(rnd() * (h - opts.minHeight));
        const y = h - bh;

        ctx.fillStyle = opts.colour;
        ctx.fillRect(x, y, bw, bh);
        if (rnd() > 0.55) ctx.fillRect(x + Math.round(bw * 0.28), y - 9, 7, 9);

        if (opts.windows) {
          const cols = Math.floor((bw - 14) / 13);
          const rows = Math.floor((bh - 16) / 17);
          for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
              if (rnd() > 0.7) {
                const a = 0.3 + rnd() * 0.55;
                ctx.fillStyle =
                  rnd() > 0.86
                    ? `rgba(150,205,255,${a})`
                    : `rgba(246,201,112,${a})`;
                ctx.fillRect(x + 9 + c * 13, y + 12 + r * 17, 5, 7);
              }
            }
          }
        }
        x += bw + Math.floor(rnd() * 16);
      }
    });
  }

  // ------------------------------------------------------------
  // world
  // ------------------------------------------------------------

  buildBackdrop() {
    this.add.image(0, 0, 'sky').setOrigin(0, 0).setScrollFactor(0).setDepth(-40);

    this.farLayer = this.add
      .tileSprite(0, GROUND_TOP - 300, BASE_W, 300, 'skyline-far')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-30);

    this.nearLayer = this.add
      .tileSprite(0, GROUND_TOP - 250, BASE_W, 250, 'skyline-near')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-20);
  }

  buildLevel() {
    this.platforms = this.physics.add.staticGroup();

    for (const segment of LEVEL.ground) {
      for (let col = segment.from; col <= segment.to; col++) {
        this.addTile(col, 8, 'tile-ground');
        this.addTile(col, 9, 'tile-ground');
      }
    }

    for (const p of LEVEL.platforms) {
      for (let i = 0; i < p.len; i++) this.addTile(p.col + i, p.row, 'tile-platform');
    }

    for (const col of LEVEL.lamps) {
      this.add
        .image(col * TILE + TILE / 2, GROUND_TOP + 6, 'lamp')
        .setOrigin(0.5, 1)
        .setDepth(4);
    }
  }

  addTile(col, row, key) {
    const tile = this.platforms.create(col * TILE + TILE / 2, row * TILE + TILE / 2, key);
    tile.setDepth(6);
    tile.refreshBody();
    return tile;
  }

  buildPlayer() {
    const x = LEVEL.startCol * TILE + TILE / 2;
    this.player = this.physics.add.sprite(x, GROUND_TOP - 120, 'mango-idle');
    this.player.setDepth(20);
    // the sprite is 42 x 54 drawn pixels; the body is the solid middle of him
    this.player.body.setSize(26, 50);
    this.player.body.setOffset(8, 4);
    this.player.body.setMaxVelocity(900, TUNING.maxFallSpeed);

    this.anims.create({
      key: 'idle',
      frames: [{ key: 'mango-idle' }],
      frameRate: 1,
    });
    this.anims.create({
      key: 'walk',
      frames: [{ key: 'mango-walk1' }, { key: 'mango-walk2' }],
      frameRate: 9,
      repeat: -1,
    });
    this.anims.create({
      key: 'jump',
      frames: [{ key: 'mango-jump' }],
      frameRate: 1,
    });
    this.player.play('idle');

    this.physics.add.collider(this.player, this.platforms);
  }

  // ------------------------------------------------------------
  // controls: virtual stick + jump button (and keyboard for testing)
  // ------------------------------------------------------------

  buildControls() {
    this.stick = {
      baseX: 132,
      baseY: BASE_H - 132,
      radius: 78,
      knobX: 132,
      knobY: BASE_H - 132,
      knobRadius: 32,
    };
    this.jumpButton = { x: BASE_W - 122, y: BASE_H - 122, radius: 62 };

    this.ctl = { axis: 0, jumpHeld: false, jumpBuffer: 0 };
    this.pointers = { stick: null, jump: null };
    this.ui = this.add.graphics().setScrollFactor(0).setDepth(100);

    this.input.on('pointerdown', (p) => this.onPointerDown(p));
    this.input.on('pointermove', (p) => this.onPointerMove(p));
    this.input.on('pointerup', (p) => this.onPointerUp(p));
    this.input.on('pointerupoutside', (p) => this.onPointerUp(p));

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      a: 'A',
      d: 'D',
      jump: 'SPACE',
      jump2: 'UP',
      w: 'W',
    });

    this.game.events.on('blur', () => this.releaseAll());
  }

  onPointerDown(p) {
    const jb = this.jumpButton;
    const onJump = Phaser.Math.Distance.Between(p.x, p.y, jb.x, jb.y) < jb.radius + 26;

    if (onJump) {
      this.pointers.jump = p.id;
      this.pressJump();
      return;
    }
    if (this.pointers.stick === null && p.x < BASE_W * 0.55) {
      this.pointers.stick = p.id;
      this.updateStick(p);
    }
  }

  onPointerMove(p) {
    if (p.id === this.pointers.stick) this.updateStick(p);
  }

  onPointerUp(p) {
    if (p.id === this.pointers.stick) {
      this.pointers.stick = null;
      this.ctl.axis = 0;
      this.stick.knobX = this.stick.baseX;
      this.stick.knobY = this.stick.baseY;
    }
    if (p.id === this.pointers.jump) {
      this.pointers.jump = null;
      this.releaseJump();
    }
  }

  updateStick(p) {
    const s = this.stick;
    const dx = p.x - s.baseX;
    const dy = p.y - s.baseY;
    const dist = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(dist, s.radius);
    s.knobX = s.baseX + (dx / dist) * clamped;
    s.knobY = s.baseY + (dy / dist) * clamped;

    const dead = 0.18;
    let raw = Phaser.Math.Clamp(dx / s.radius, -1, 1);
    const mag = Math.abs(raw);
    if (mag < dead) raw = 0;
    else raw = Math.sign(raw) * ((mag - dead) / (1 - dead));
    this.ctl.axis = raw;
  }

  pressJump() {
    this.ctl.jumpHeld = true;
    this.ctl.jumpBuffer = TUNING.jumpBuffer;
  }

  releaseJump() {
    this.ctl.jumpHeld = false;
    if (this.player && this.player.body.velocity.y < TUNING.jumpCut) {
      this.player.body.velocity.y = TUNING.jumpCut;
    }
  }

  releaseAll() {
    this.pointers.stick = null;
    this.pointers.jump = null;
    this.ctl.axis = 0;
    this.ctl.jumpHeld = false;
    this.stick.knobX = this.stick.baseX;
    this.stick.knobY = this.stick.baseY;
  }

  readKeyboard() {
    if (!this.keys) return 0;
    let axis = 0;
    if (this.keys.left.isDown || this.keys.a.isDown) axis -= 1;
    if (this.keys.right.isDown || this.keys.d.isDown) axis += 1;

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jump2) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w)
    ) {
      this.pressJump();
    }
    if (
      Phaser.Input.Keyboard.JustUp(this.keys.jump) ||
      Phaser.Input.Keyboard.JustUp(this.keys.jump2) ||
      Phaser.Input.Keyboard.JustUp(this.keys.w)
    ) {
      this.releaseJump();
    }
    return axis;
  }

  buildHint() {
    this.hint = this.add
      .text(
        BASE_W / 2,
        38,
        'DRAG LEFT TO MOVE   ·   HOLD RIGHT TO JUMP HIGHER',
        {
          fontFamily: '"Courier New", ui-monospace, monospace',
          fontSize: '17px',
          color: '#efe6d2',
          backgroundColor: 'rgba(8,10,18,0.55)',
          padding: { x: 14, y: 8 },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0);

    this.tweens.add({
      targets: this.hint,
      alpha: 1,
      duration: 500,
      delay: 500,
      onComplete: () => {
        this.tweens.add({
          targets: this.hint,
          alpha: 0,
          duration: 900,
          delay: 4200,
        });
      },
    });
  }

  // ------------------------------------------------------------
  // the loop
  // ------------------------------------------------------------

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;

    const keyAxis = this.readKeyboard();
    const axis = this.pointers.stick !== null ? this.ctl.axis : keyAxis;

    this.updatePlayer(dt, axis);
    this.updateOfficer(time);
    this.drawControls();
    this.followCamera();
  }

  updatePlayer(dt, axis) {
    const body = this.player.body;
    const onGround = body.blocked.down || body.touching.down;

    // coyote time: a moment of grace after walking off a ledge
    this.coyote = onGround ? TUNING.coyoteTime : Math.max(0, this.coyote - dt);
    this.ctl.jumpBuffer = Math.max(0, this.ctl.jumpBuffer - dt);

    if (this.ctl.jumpBuffer > 0 && this.coyote > 0) {
      body.velocity.y = TUNING.jumpVelocity;
      this.ctl.jumpBuffer = 0;
      this.coyote = 0;
    }

    // gravity shaping: lighter while rising and holding, heavier while falling
    if (body.velocity.y < 0) {
      this.player.setGravityY(this.ctl.jumpHeld ? -TUNING.gravity * TUNING.holdGravityScale : 0);
    } else {
      this.player.setGravityY(TUNING.fastFallExtra);
    }

    // horizontal movement, smoothed so it feels weighty
    const target = axis * TUNING.maxSpeed;
    let accel;
    if (Math.abs(axis) < 0.01) accel = onGround ? TUNING.stopAccel : 0.06;
    else accel = onGround ? TUNING.groundAccel : TUNING.airAccel;
    body.velocity.x = Phaser.Math.Linear(body.velocity.x, target, accel);

    if (axis > 0.05) this.facing = 1;
    else if (axis < -0.05) this.facing = -1;
    this.player.setFlipX(this.facing < 0);

    // animation
    if (!onGround) {
      this.player.play('jump', true);
    } else if (Math.abs(body.velocity.x) > 22) {
      this.player.play('walk', true);
      this.player.anims.timeScale = Phaser.Math.Clamp(
        Math.abs(body.velocity.x) / TUNING.maxSpeed,
        0.55,
        1.4
      );
    } else {
      this.player.play('idle', true);
    }

    // keep him on the map horizontally; falling off the bottom respawns
    if (this.player.x < 20) {
      this.player.x = 20;
      body.velocity.x = Math.max(0, body.velocity.x);
    } else if (this.player.x > WORLD_W - 20) {
      this.player.x = WORLD_W - 20;
      body.velocity.x = Math.min(0, body.velocity.x);
    }
    if (this.player.y > WORLD_H + 140) this.respawn();
  }

  respawn() {
    this.player.setPosition(LEVEL.startCol * TILE + TILE / 2, GROUND_TOP - 120);
    this.player.body.setVelocity(0, 0);
  }

  // ------------------------------------------------------------
  // loot, score and the law
  // ------------------------------------------------------------

  buildLoot() {
    this.loot = this.physics.add.staticGroup();

    for (const item of LEVEL.loot) {
      const style = LOOT_STYLES[item.type];
      const x = item.col * TILE + TILE / 2;
      const y = item.row * TILE + TILE / 2;
      const sprite = this.loot.create(x, y, style.texture);
      sprite.setDepth(12);
      sprite.setData('value', style.value);

      if (item.type === 'coin') {
        // coins spin by squashing sideways, like the old ones
        this.tweens.add({
          targets: sprite,
          scaleX: 0.25,
          duration: 620 + (item.col % 3) * 90,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else if (item.type === 'diamond') {
        this.tweens.add({
          targets: sprite,
          scale: 1.18,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else {
        this.tweens.add({
          targets: sprite,
          angle: 8,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    this.physics.add.overlap(this.player, this.loot, (_player, item) => this.collect(item));
  }

  collect(item) {
    if (!item.active) return;
    const value = item.getData('value') || 10;
    this.score += value;
    this.refreshScore();

    const pop = this.add
      .text(item.x, item.y - 12, '+' + value, {
        fontFamily: '"Courier New", ui-monospace, monospace',
        fontSize: '18px',
        color: '#ffe9a8',
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: pop,
      y: pop.y - 40,
      alpha: 0,
      duration: 650,
      ease: 'Quad.easeOut',
      onComplete: () => pop.destroy(),
    });

    this.tweens.killTweensOf(item);
    item.destroy();
  }

  buildOfficer() {
    const cfg = LEVEL.officer;
    const x = cfg.col * TILE + TILE / 2;

    this.officer = this.physics.add.sprite(x, GROUND_TOP - 70, 'officer-idle');
    this.officer.setDepth(18);
    this.officer.body.setSize(26, 50);
    this.officer.body.setOffset(8, 4);
    this.officer.body.setMaxVelocity(900, TUNING.maxFallSpeed);
    this.physics.add.collider(this.officer, this.platforms);

    this.anims.create({
      key: 'officer-walk',
      frames: [{ key: 'officer-walk1' }, { key: 'officer-walk2' }],
      frameRate: 7,
      repeat: -1,
    });
    this.officer.play('officer-walk');

    this.dizzy = this.add.image(0, 0, 'dizzy').setDepth(30).setVisible(false);

    this.officerState = {
      dir: 1,
      from: cfg.from * TILE,
      to: cfg.to * TILE,
      stunnedUntil: 0,
    };

    this.physics.add.overlap(this.player, this.officer, () => this.touchOfficer());
  }

  updateOfficer(time) {
    const o = this.officer;
    const st = this.officerState;
    if (!o) return;

    // conked: sit there with stars over his head
    if (st.stunnedUntil > time) {
      o.setVelocityX(0);
      this.dizzy.setPosition(o.x, o.y - 44 + Math.sin(time / 110) * 3);
      return;
    }
    if (this.dizzy.visible) {
      this.dizzy.setVisible(false);
      o.clearTint();
    }

    const gap = Math.abs(this.player.x - o.x);
    const sameLevel = Math.abs(this.player.y - o.y) < 120;
    const chasing = gap < 300 && sameLevel;

    if (chasing) {
      st.dir = this.player.x > o.x ? 1 : -1;
      o.setVelocityX(st.dir * 150);
      o.anims.timeScale = 1.6;
    } else {
      if (o.x <= st.from) st.dir = 1;
      if (o.x >= st.to) st.dir = -1;
      o.setVelocityX(st.dir * 62);
      o.anims.timeScale = 0.9;
    }

    // never walk off his beat
    if (o.x < st.from && o.body.velocity.x < 0) o.setVelocityX(0);
    if (o.x > st.to && o.body.velocity.x > 0) o.setVelocityX(0);
    o.setFlipX(st.dir < 0);

    if (!o.anims.isPlaying) o.play('officer-walk', true);
  }

  touchOfficer() {
    const now = this.time.now;
    const pb = this.player.body;

    if (this.officerState.stunnedUntil > now) return;
    if (now < this.invulnUntil) return;

    // landing on his head from above = cartoon conk, nobody gets hurt
    const fromAbove = pb.velocity.y > 60 && pb.bottom <= this.officer.body.top + 16;

    if (fromAbove) {
      this.officerState.stunnedUntil = now + 3200;
      this.officer.setVelocityX(0);
      this.officer.setTint(0x9fd6ff);
      this.officer.anims.stop();
      this.officer.setTexture('officer-idle');
      this.dizzy.setVisible(true);
      pb.velocity.y = -430;
      this.score += 50;
      this.refreshScore();
      this.showToast('BONK! +50', 0xffe066);
      this.cameras.main.shake(120, 0.004);
    } else {
      this.caught();
    }
  }

  caught() {
    this.invulnUntil = this.time.now + 1800;
    this.player.setVelocity(0, 0);
    this.cameras.main.flash(200, 220, 70, 70);
    this.cameras.main.shake(200, 0.008);
    this.showToast('TAGGED!', 0xff8080);

    this.tweens.add({
      targets: this.player,
      alpha: 0.15,
      duration: 90,
      yoyo: true,
      repeat: 3,
    });

    // sent back to the top of the street, loot kept
    this.time.delayedCall(320, () => {
      this.respawn();
      this.player.setAlpha(1);
    });
  }

  buildHud() {
    this.add.image(34, 36, 'coin').setScrollFactor(0).setDepth(100).setScale(0.9);
    this.scoreText = this.add
      .text(52, 20, '0', {
        fontFamily: '"Courier New", ui-monospace, monospace',
        fontSize: '28px',
        color: '#ffe9a8',
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.refreshScore();
  }

  refreshScore() {
    this.scoreText.setText(String(this.score));
    this.tweens.killTweensOf(this.scoreText);
    this.scoreText.setScale(1.25);
    this.tweens.add({
      targets: this.scoreText,
      scale: 1,
      duration: 180,
      ease: 'Quad.easeOut',
    });
  }

  showToast(message, colour = 0xffffff) {
    const toast = this.add
      .text(BASE_W / 2, 128, message, {
        fontFamily: '"Courier New", ui-monospace, monospace',
        fontSize: '30px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(120)
      .setTint(colour);
    this.tweens.add({
      targets: toast,
      y: 96,
      alpha: 0,
      duration: 950,
      ease: 'Quad.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

  followCamera() {
    const cam = this.cameras.main;
    this.farLayer.tilePositionX = cam.scrollX * 0.15;
    this.nearLayer.tilePositionX = cam.scrollX * 0.4;
  }

  drawControls() {
    const g = this.ui;
    const s = this.stick;
    const jb = this.jumpButton;
    const stickActive = this.pointers.stick !== null;
    const pressed = this.ctl.jumpHeld;

    g.clear();

    // joystick base
    g.fillStyle(0xffffff, stickActive ? 0.09 : 0.05);
    g.fillCircle(s.baseX, s.baseY, s.radius);
    g.lineStyle(2, 0xffffff, 0.16);
    g.strokeCircle(s.baseX, s.baseY, s.radius);

    // joystick knob
    g.fillStyle(0xffd98a, stickActive ? 0.3 : 0.16);
    g.fillCircle(s.knobX, s.knobY, s.knobRadius);
    g.lineStyle(2, 0xffd98a, stickActive ? 0.6 : 0.3);
    g.strokeCircle(s.knobX, s.knobY, s.knobRadius);

    // jump button
    g.fillStyle(0xffd98a, pressed ? 0.45 : 0.2);
    g.fillCircle(jb.x, jb.y, jb.radius);
    g.lineStyle(3, 0xffd98a, pressed ? 0.95 : 0.55);
    g.strokeCircle(jb.x, jb.y, jb.radius);

    // up-arrow glyph
    g.fillStyle(0xfff3d4, pressed ? 0.95 : 0.7);
    g.fillTriangle(jb.x, jb.y - 26, jb.x - 21, jb.y + 8, jb.x + 21, jb.y + 8);
    g.fillRect(jb.x - 8, jb.y + 6, 16, 17);
  }
}

// =============================================================
// boot
// =============================================================

// window.MANGO is a dev hook: open the browser console and poke at the game
window.MANGO = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: BASE_W,
  height: BASE_H,
  backgroundColor: '#070912',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: TUNING.gravity },
      debug: false,
    },
  },
  scene: [GameScene],
});
