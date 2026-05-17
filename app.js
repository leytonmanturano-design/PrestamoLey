// =============================================
//  MundialStikers 2026 – Dark Premium Edition
//  Partículas + Stamp + Confeti + Celebración
// =============================================

const STORAGE_KEY = 'mundialStikers_2026';

function flagUrl(code) {
  if (code === 'gb-sct') return 'https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_Scotland.svg';
  if (code === 'gb-eng') return 'https://upload.wikimedia.org/wikipedia/en/b/be/Flag_of_England.svg';
  return `https://flagcdn.com/w40/${code}.png`;
}

const GRUPOS = [
  { letra:'A', equipos:[{nombre:'MÉXICO',code:'mx'},{nombre:'COREA DEL SUR',code:'kr'},{nombre:'SUDÁFRICA',code:'za'},{nombre:'REP. CHECA',code:'cz'}] },
  { letra:'B', equipos:[{nombre:'CANADÁ',code:'ca'},{nombre:'SUIZA',code:'ch'},{nombre:'QATAR',code:'qa'},{nombre:'BOSNIA Y HERZ.',code:'ba'}] },
  { letra:'C', equipos:[{nombre:'BRASIL',code:'br'},{nombre:'MARRUECOS',code:'ma'},{nombre:'ESCOCIA',code:'gb-sct'},{nombre:'HAITÍ',code:'ht'}] },
  { letra:'D', equipos:[{nombre:'USA',code:'us'},{nombre:'AUSTRALIA',code:'au'},{nombre:'PARAGUAY',code:'py'},{nombre:'TURQUÍA',code:'tr'}] },
  { letra:'E', equipos:[{nombre:'ALEMANIA',code:'de'},{nombre:'ECUADOR',code:'ec'},{nombre:'C. DE MARFIL',code:'ci'},{nombre:'CURAZAO',code:'cw'}] },
  { letra:'F', equipos:[{nombre:'HOLANDA',code:'nl'},{nombre:'JAPÓN',code:'jp'},{nombre:'TÚNEZ',code:'tn'},{nombre:'SUECIA',code:'se'}] },
  { letra:'G', equipos:[{nombre:'BÉLGICA',code:'be'},{nombre:'IRÁN',code:'ir'},{nombre:'EGIPTO',code:'eg'},{nombre:'NUEVA ZELANDA',code:'nz'}] },
  { letra:'H', equipos:[{nombre:'ESPAÑA',code:'es'},{nombre:'URUGUAY',code:'uy'},{nombre:'ARABIA SAUDITA',code:'sa'},{nombre:'CABO VERDE',code:'cv'}] },
  { letra:'I', equipos:[{nombre:'FRANCIA',code:'fr'},{nombre:'SENEGAL',code:'sn'},{nombre:'NORUEGA',code:'no'},{nombre:'IRAK',code:'iq'}] },
  { letra:'J', equipos:[{nombre:'ARGENTINA',code:'ar'},{nombre:'AUSTRIA',code:'at'},{nombre:'ARGELIA',code:'dz'},{nombre:'JORDANIA',code:'jo'}] },
  { letra:'K', equipos:[{nombre:'PORTUGAL',code:'pt'},{nombre:'COLOMBIA',code:'co'},{nombre:'UZBEKISTÁN',code:'uz'},{nombre:'RD CONGO',code:'cd'}] },
  { letra:'L', equipos:[{nombre:'INGLATERRA',code:'gb-eng'},{nombre:'CROACIA',code:'hr'},{nombre:'PANAMÁ',code:'pa'},{nombre:'GHANA',code:'gh'}] },
];

// =============================================
//  PARTÍCULAS DE FONDO (pelotas flotantes)
// =============================================
(function initParticles() {
  const canvas = document.getElementById('particlesCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H + H,
      r: 6 + Math.random() * 14,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(0.3 + Math.random() * 0.7),
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.02,
      alpha: 0.1 + Math.random() * 0.25,
    };
  }

  for (let i = 0; i < 28; i++) {
    const p = createParticle();
    p.y = Math.random() * H; // distribuir inicialmente
    particles.push(p);
  }

  function drawBall(ctx, x, y, r, rot, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);

    // base blanca
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212,160,23,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,160,23,0.3)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // líneas de balón
    ctx.strokeStyle = 'rgba(212,160,23,0.25)';
    ctx.lineWidth = 0.6;
    const lines = [
      [[-r*0.3,-r*0.9],[r*0.3,-r*0.5],[r*0.6,r*0.2],[-r*0.3,r*0.7],[-r*0.6,r*0.1]],
    ];
    ctx.beginPath();
    ctx.moveTo(-r*0.3,-r*0.9);
    ctx.bezierCurveTo(r*0.5,-r*0.5,r*0.7,r*0.3,-r*0.3,r*0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r*0.3,-r*0.5);
    ctx.bezierCurveTo(-r*0.3,-r*0.1,-r*0.6,r*0.4,-r*0.3,r*0.7);
    ctx.stroke();

    ctx.restore();
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      if (p.y + p.r < 0) {
        particles[i] = createParticle();
      }
      drawBall(ctx, p.x, p.y, p.r, p.rot, p.alpha);
    });
    requestAnimationFrame(loop);
  }
  loop();
})();

// =============================================
//  CONFETI DE GRUPO (al completar un grupo)
// =============================================
function lanzarConfettiGrupo(cardEl) {
  const canvas = document.createElement('canvas');
  canvas.className = 'group-confetti';
  cardEl.appendChild(canvas);

  const rect = cardEl.getBoundingClientRect();
  canvas.width  = cardEl.offsetWidth;
  canvas.height = cardEl.offsetHeight;

  const ctx = canvas.getContext('2d');
  const pieces = Array.from({length: 40}, () => ({
    x: Math.random() * canvas.width,
    y: -10,
    vx: (Math.random() - 0.5) * 3,
    vy: 1.5 + Math.random() * 2.5,
    color: ['#d4a017','#f5c842','#1abc9c','#e74c3c','#fff'][Math.floor(Math.random()*5)],
    w: 4 + Math.random() * 6,
    h: 6 + Math.random() * 8,
    rot: Math.random() * Math.PI,
    rotV: (Math.random()-0.5)*0.15,
    alpha: 1,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive = false;
    pieces.forEach(p => {
      if (p.y > canvas.height + 20) return;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      p.alpha = Math.max(0, 1 - frame / 90);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < 100) requestAnimationFrame(draw);
    else canvas.remove();
  }
  draw();
}

// =============================================
//  CONFETI GLOBAL (celebración 48/48)
// =============================================
function lanzarConfettiGlobal() {
  const canvas = document.getElementById('confettiCanvas');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  const pieces = Array.from({length: 180}, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.5,
    vx: (Math.random()-0.5)*5,
    vy: 2 + Math.random()*4,
    color: ['#d4a017','#f5c842','#1abc9c','#e74c3c','#fff','#3498db'][Math.floor(Math.random()*6)],
    w: 6+Math.random()*10, h: 8+Math.random()*12,
    rot: Math.random()*Math.PI, rotV: (Math.random()-0.5)*0.2,
  }));

  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    });
    if (pieces.some(p => p.y < canvas.height + 30)) requestAnimationFrame(draw);
  }
  draw();
}

// =============================================
//  EFECTO STAMP al tachar
// =============================================
function mostrarStamp(rowEl) {
  const old = rowEl.querySelector('.stamp-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.className = 'stamp-overlay';
  const txt = document.createElement('div');
  txt.className = 'stamp-text';
  txt.textContent = '✓ LISTO';
  overlay.appendChild(txt);
  rowEl.appendChild(overlay);

  setTimeout(() => overlay.remove(), 550);
}

// =============================================
//  ESTADO / LOCALSTORAGE
// =============================================
function cargarEstado() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function guardarEstado(e) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(e)); } catch {}
}
let estado = cargarEstado();

// =============================================
//  CONSTRUIR UI
// =============================================
function buildUI() {
  const grid = document.getElementById('groupsGrid');
  grid.innerHTML = '';

  GRUPOS.forEach(grupo => {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.dataset.letra = grupo.letra;

    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `
      <span class="group-letter">${grupo.letra}</span>
      <span class="group-title">GRUPO ${grupo.letra}</span>
      <span class="group-done-badge">✓ COMPLETO</span>
    `;

    const list = document.createElement('div');
    list.className = 'team-list';

    grupo.equipos.forEach((equipo, idx) => {
      const key = `${grupo.letra}-${idx}`;
      const tachado = !!estado[key];

      const row = document.createElement('div');
      row.className = 'team-row' + (tachado ? ' tachado' : '');
      row.dataset.key = key;
      row.innerHTML = `
        <img class="team-flag" src="${flagUrl(equipo.code)}" alt="${equipo.nombre}" loading="lazy" />
        <span class="team-name">${equipo.nombre}</span>
        <span class="team-check">${tachado ? '✓' : ''}</span>
      `;
      row.addEventListener('click', () => toggleTeam(key, row, grupo.letra, card));
      list.appendChild(row);
    });

    card.appendChild(header);
    card.appendChild(list);
    grid.appendChild(card);
    actualizarEstadoGrupo(grupo.letra, card, false);
  });

  actualizarProgreso();
}

// =============================================
//  TOGGLE TACHADO
// =============================================
function toggleTeam(key, row, letra, card) {
  const activo = row.classList.toggle('tachado');
  const check = row.querySelector('.team-check');

  if (activo) {
    estado[key] = true;
    check.textContent = '✓';
    mostrarStamp(row);
  } else {
    delete estado[key];
    check.textContent = '';
  }

  guardarEstado(estado);
  actualizarEstadoGrupo(letra, card, activo);
  actualizarProgreso();
}

function actualizarEstadoGrupo(letra, card, accionFueTachar) {
  if (!card) card = document.querySelector(`.group-card[data-letra="${letra}"]`);
  if (!card) return;
  const rows = card.querySelectorAll('.team-row');
  const allDone = [...rows].every(r => r.classList.contains('tachado'));
  const wasDone = card.classList.contains('all-done');

  card.classList.toggle('all-done', allDone);

  if (allDone && !wasDone && accionFueTachar) {
    lanzarConfettiGrupo(card);
  }
}

// =============================================
//  PROGRESO
// =============================================
function actualizarProgreso() {
  const total = GRUPOS.reduce((a, g) => a + g.equipos.length, 0);
  const conseguidos = Object.keys(estado).length;
  const pct = Math.round((conseguidos / total) * 100);

  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressCount').textContent = `${conseguidos} / ${total}`;

  const label = document.getElementById('progressLabel');
  if (conseguidos === 0) label.textContent = 'Consigue todos los stickers';
  else if (conseguidos === total) label.textContent = '¡Colección completa! 🏆';
  else label.textContent = `${pct}% completado · ¡Sigue adelante!`;

  if (conseguidos === total) {
    setTimeout(() => {
      document.getElementById('celebracion').classList.remove('hidden');
      lanzarConfettiGlobal();
    }, 400);
  }
}

// =============================================
//  BOTONES
// =============================================
document.getElementById('btnReset').addEventListener('click', () => {
  if (confirm('¿Reiniciar todos los stickers? Se borrará tu progreso.')) {
    estado = {};
    guardarEstado(estado);
    buildUI();
  }
});

document.getElementById('btnCerrarCeleb').addEventListener('click', () => {
  document.getElementById('celebracion').classList.add('hidden');
});

// =============================================
//  INICIO
// =============================================
buildUI();
