// =============================================
//  PrestamoLey – app.js
// =============================================
import { db, authReady } from './firebase.js';
import {
  collection, addDoc, onSnapshot, doc,
  updateDoc, deleteDoc, serverTimestamp, query, orderBy,
  setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

let prestamos = [];
let filtroActual = 'activo';
let prestamoSeleccionado = null;
let capitalDisponible = 0;
const CAPITAL_STORAGE_KEY = 'prestamoley.capital';

await authReady;

function leerCapitalLocal() {
  try {
    const valor = Number(localStorage.getItem(CAPITAL_STORAGE_KEY));
    return Number.isFinite(valor) ? valor : 0;
  } catch {
    return 0;
  }
}

function guardarCapitalLocal(valor) {
  try {
    localStorage.setItem(CAPITAL_STORAGE_KEY, String(valor));
  } catch {
    // Ignorar si el navegador no permite almacenamiento local.
  }
}

const grid           = document.getElementById('prestamosGrid');
const listaVacia     = document.getElementById('listaVacia');
const btnNuevo       = document.getElementById('btnNuevo');
const modalPrestamo  = document.getElementById('modalPrestamo');
const modalDetalle   = document.getElementById('modalDetalle');
const modalPago      = document.getElementById('modalPago');
const buscador       = document.getElementById('buscador');
const resumenCuota   = document.getElementById('resumenCuota');
const panelConfig    = document.getElementById('panelConfig');
const overlayConfig  = document.getElementById('overlayConfig');

const inputNombre  = document.getElementById('inputNombre');
const inputMonto   = document.getElementById('inputMonto');
const inputFecha   = document.getElementById('inputFecha');
const inputInteres = document.getElementById('inputInteres');
const inputCuotas  = document.getElementById('inputCuotas');
const inputNotas   = document.getElementById('inputNotas');

const inputPagoMonto = document.getElementById('inputPagoMonto');
const inputPagoFecha = document.getElementById('inputPagoFecha');
const inputPagoNota  = document.getElementById('inputPagoNota');
const inputCapitalPanel = document.getElementById('inputCapitalPanel');

// =============================================
//  CAPITAL
// =============================================
const capitalRef = doc(db, 'config', 'capital');

async function cargarCapital() {
  capitalDisponible = leerCapitalLocal();

  try {
    const snap = await getDoc(capitalRef);
    const valorRemoto = snap.exists() ? Number(snap.data().disponible ?? 0) : 0;
    if (Number.isFinite(valorRemoto)) {
      capitalDisponible = valorRemoto;
      guardarCapitalLocal(capitalDisponible);
    } else if (!snap.exists()) {
      await setDoc(capitalRef, { disponible: capitalDisponible });
    }
  } catch (e) {
    console.warn('No se pudo consultar Firestore, usando valor local:', e);
  }

  actualizarStats();
}

async function guardarCapitalDB(valor, sumar = false) {
  const nuevoValor = sumar ? capitalDisponible + valor : valor;
  capitalDisponible = nuevoValor;
  guardarCapitalLocal(capitalDisponible);
  actualizarStats();

  try {
    await setDoc(capitalRef, { disponible: nuevoValor }, { merge: true });
  } catch (e) {
    console.warn('Fallo en Firestore, se conserva el valor local:', e);
    mostrarToast('⚠ Capital guardado localmente');
  }
}

// =============================================
//  FIRESTORE PRÉSTAMOS
// =============================================
const q = query(collection(db, 'prestamos'), orderBy('creadoEn', 'desc'));
onSnapshot(q, (snapshot) => {
  prestamos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderPrestamos();
  actualizarStats();
});

// =============================================
//  RENDER
// =============================================
function renderPrestamos() {
  const busqueda = buscador.value.toLowerCase().trim();
  const filtrados = prestamos.filter(p => {
    const matchFiltro =
      filtroActual === 'todos' ||
      (filtroActual === 'activo' && p.estado === 'activo') ||
      (filtroActual === 'pagado' && p.estado === 'pagado');
    return matchFiltro && p.nombre.toLowerCase().includes(busqueda);
  });

  grid.innerHTML = '';
  if (filtrados.length === 0) { listaVacia.classList.remove('hidden'); return; }
  listaVacia.classList.add('hidden');

  filtrados.forEach(p => {
    const totalConInteres = p.monto * (1 + (p.interes || 0) / 100);
    const pagado   = (p.pagos || []).reduce((a, pg) => a + pg.monto, 0);
    const pendiente = Math.max(0, totalConInteres - pagado);
    const pct = Math.min(100, Math.round((pagado / totalConInteres) * 100));

    const card = document.createElement('div');
    card.className = `prestamo-card ${p.estado === 'pagado' ? 'pagado' : ''}`;
    card.innerHTML = `
      <div class="card-header">
        <span class="card-nombre">${p.nombre}</span>
        <span class="card-status ${p.estado}">${p.estado.toUpperCase()}</span>
      </div>
      <div class="card-body">
        <div class="card-row">
          <span class="card-label">MONTO TOTAL</span>
          <span class="card-val monto-total">S/ ${totalConInteres.toFixed(2)}</span>
        </div>
        <div class="card-row">
          <span class="card-label">COBRADO</span>
          <span class="card-val cobrado">S/ ${pagado.toFixed(2)}</span>
        </div>
        <div class="card-row">
          <span class="card-label">PENDIENTE</span>
          <span class="card-val pendiente">S/ ${pendiente.toFixed(2)}</span>
        </div>
        ${p.cuotas > 1 ? `<div class="card-row"><span class="card-label">CUOTAS</span><span class="card-val">S/ ${(totalConInteres/p.cuotas).toFixed(2)} x ${p.cuotas}</span></div>` : ''}
        <div class="progress-wrap">
          <div class="progress-bg"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-pct">${pct}% cobrado</div>
        </div>
        <div class="card-row">
          <span class="card-label">FECHA</span>
          <span class="card-val" style="font-size:14px">${p.fecha || '—'}</span>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn-pago" ${p.estado === 'pagado' ? 'disabled' : ''}>+ PAGO</button>
        <button class="btn-eliminar">🗑</button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-pago') || e.target.classList.contains('btn-eliminar')) return;
      abrirDetalle(p);
    });
    card.querySelector('.btn-pago')?.addEventListener('click', (e) => { e.stopPropagation(); abrirModalPago(p); });
    card.querySelector('.btn-eliminar')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`¿Eliminar el préstamo de ${p.nombre}?`)) eliminarPrestamo(p.id, p);
    });
    grid.appendChild(card);
  });
}

// =============================================
//  STATS
// =============================================
function actualizarStats() {
  let enCalle = 0;
  prestamos.forEach(p => {
    if (p.estado === 'activo') {
      const total  = p.monto * (1 + (p.interes || 0) / 100);
      const pagado = (p.pagos || []).reduce((a, pg) => a + pg.monto, 0);
      enCalle += Math.max(0, total - pagado);
    }
  });
  const capitalTotal = capitalDisponible + enCalle;
  document.getElementById('statCapital').textContent      = `S/ ${capitalDisponible.toFixed(2)}`;
  document.getElementById('statEnCalle').textContent      = `S/ ${enCalle.toFixed(2)}`;
  document.getElementById('statCapitalTotal').textContent = `S/ ${capitalTotal.toFixed(2)}`;
  // Actualizar también el input del panel
  if (inputCapitalPanel) inputCapitalPanel.value = capitalDisponible.toFixed(2);
}

// =============================================
//  PANEL DE CONFIGURACIÓN (hamburguesa)
// =============================================
document.getElementById('btnHamburguesa').addEventListener('click', () => {
  panelConfig.classList.add('abierto');
  overlayConfig.classList.add('visible');
  inputCapitalPanel.value = capitalDisponible.toFixed(2);
});

document.getElementById('btnCerrarPanel').addEventListener('click', cerrarPanel);
overlayConfig.addEventListener('click', cerrarPanel);

function cerrarPanel() {
  panelConfig.classList.remove('abierto');
  overlayConfig.classList.remove('visible');
}

async function guardarCapitalDesdePanel() {
  const val = parseFloat(inputCapitalPanel.value);
  if (isNaN(val) || val < 0) { mostrarToast('⚠ Ingresa un monto válido'); return; }

  if (capitalDisponible !== val) {
    const mensaje = `El capital actual es S/ ${capitalDisponible.toFixed(2)}.\n¿Deseas sobrescribirlo con S/ ${val.toFixed(2)}?`;
    const confirmado = confirm(mensaje);
    if (!confirmado) return;
  }

  await guardarCapitalDB(val);
  mostrarToast('✅ Capital actualizado');
}

document.getElementById('btnGuardarCapitalPanel').addEventListener('click', guardarCapitalDesdePanel);

inputCapitalPanel.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    await guardarCapitalDesdePanel();
  }
});

// =============================================
//  MODAL NUEVO PRÉSTAMO
// =============================================
btnNuevo.addEventListener('click', () => {
  inputNombre.value  = '';
  inputMonto.value   = '';
  inputFecha.value   = new Date().toISOString().split('T')[0];
  inputInteres.value = '';
  inputCuotas.value  = '1';
  inputNotas.value   = '';
  resumenCuota.classList.remove('visible');
  modalPrestamo.classList.remove('hidden');
  setTimeout(() => inputNombre.focus(), 100);
});

document.getElementById('btnCerrarModal').addEventListener('click', () => modalPrestamo.classList.add('hidden'));
modalPrestamo.addEventListener('click', (e) => { if (e.target === modalPrestamo) modalPrestamo.classList.add('hidden'); });

[inputMonto, inputInteres, inputCuotas].forEach(el => el.addEventListener('input', calcularResumen));

function calcularResumen() {
  const monto   = parseFloat(inputMonto.value) || 0;
  const interes = parseFloat(inputInteres.value) || 0;
  const cuotas  = parseInt(inputCuotas.value) || 1;
  if (monto <= 0) { resumenCuota.classList.remove('visible'); return; }
  const total = monto * (1 + interes / 100);
  const cuota = total / cuotas;
  resumenCuota.innerHTML = `Total a cobrar: S/ ${total.toFixed(2)} &nbsp;·&nbsp; Cuota: S/ ${cuota.toFixed(2)} x ${cuotas}`;
  resumenCuota.classList.add('visible');
}

document.getElementById('btnGuardar').addEventListener('click', async () => {
  const nombre  = inputNombre.value.trim();
  const monto   = parseFloat(inputMonto.value);
  const fecha   = inputFecha.value;
  const interes = parseFloat(inputInteres.value) || 0;
  const cuotas  = parseInt(inputCuotas.value) || 1;
  const notas   = inputNotas.value.trim();

  if (!nombre) { mostrarToast('⚠ Ingresa el nombre del deudor'); return; }
  if (!monto || monto <= 0) { mostrarToast('⚠ Ingresa un monto válido'); return; }

  try {
    await addDoc(collection(db, 'prestamos'), {
      nombre, monto, fecha, interes, cuotas, notas,
      estado: 'activo', pagos: [], creadoEn: serverTimestamp()
    });
    // Descontar del capital (sin restricción, puede quedar negativo)
    await guardarCapitalDB(capitalDisponible - monto);
    modalPrestamo.classList.add('hidden');
    mostrarToast('✅ Préstamo guardado');
  } catch (e) { mostrarToast('❌ Error al guardar'); }
});

// =============================================
//  MODAL DETALLE
// =============================================
function abrirDetalle(p) {
  prestamoSeleccionado = p;
  const totalConInteres = p.monto * (1 + (p.interes || 0) / 100);
  const pagado    = (p.pagos || []).reduce((a, pg) => a + pg.monto, 0);
  const pendiente = Math.max(0, totalConInteres - pagado);
  const pct       = Math.min(100, Math.round((pagado / totalConInteres) * 100));

  document.getElementById('detalleTitulo').textContent = p.nombre.toUpperCase();

  const pagosHTML = (p.pagos || []).length === 0
    ? `<div class="no-pagos">Aún no hay pagos registrados.</div>`
    : [...(p.pagos || [])].reverse().map((pg, i) => `
        <div class="pago-item">
          <span class="pago-fecha">${pg.fecha || '—'}</span>
          <span class="pago-nota">${pg.nota || 'Pago'}</span>
          <span class="pago-monto">S/ ${pg.monto.toFixed(2)}</span>
          <button class="pago-eliminar" data-idx="${(p.pagos.length-1)-i}">✕</button>
        </div>`).join('');

  document.getElementById('detalleBody').innerHTML = `
    <div class="detalle-resumen">
      <div class="detalle-stat"><div class="ds-label">PRESTADO</div><div class="ds-val w">S/ ${p.monto.toFixed(2)}</div></div>
      <div class="detalle-stat"><div class="ds-label">INTERÉS</div><div class="ds-val w">${p.interes||0}%</div></div>
      <div class="detalle-stat"><div class="ds-label">TOTAL</div><div class="ds-val w">S/ ${totalConInteres.toFixed(2)}</div></div>
      <div class="detalle-stat"><div class="ds-label">COBRADO</div><div class="ds-val g">S/ ${pagado.toFixed(2)}</div></div>
      <div class="detalle-stat"><div class="ds-label">PENDIENTE</div><div class="ds-val r">S/ ${pendiente.toFixed(2)}</div></div>
      <div class="detalle-stat"><div class="ds-label">AVANCE</div><div class="ds-val g">${pct}%</div></div>
    </div>
    ${p.notas ? `<div class="notas-box">📝 ${p.notas}</div>` : ''}
    <div class="pagos-titulo">HISTORIAL DE PAGOS</div>
    ${pagosHTML}
    ${p.estado==='activo' ? `<button class="btn-guardar" id="btnDetalleMarcarPagado" style="margin-top:16px;background:#ffd600;color:#000">✅ MARCAR COMO TOTALMENTE PAGADO</button>` : ''}
  `;

  document.querySelectorAll('.pago-eliminar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      if (!confirm('¿Eliminar este pago?')) return;
      const nuevos = p.pagos.filter((_, i) => i !== idx);
      const nuevoTotal = nuevos.reduce((a, pg) => a + pg.monto, 0);
      const totalConInt = p.monto * (1 + (p.interes||0)/100);
      await updateDoc(doc(db,'prestamos',p.id), { pagos: nuevos, estado: nuevoTotal >= totalConInt ? 'pagado' : 'activo' });
      mostrarToast('Pago eliminado');
      modalDetalle.classList.add('hidden');
    });
  });

  document.getElementById('btnDetalleMarcarPagado')?.addEventListener('click', async () => {
    if (!confirm(`¿Marcar el préstamo de ${p.nombre} como completamente pagado?`)) return;
    const totalConInteres = p.monto * (1 + (p.interes||0)/100);
    await updateDoc(doc(db,'prestamos',p.id), { estado: 'pagado' });
    await guardarCapitalDB(capitalDisponible + totalConInteres);
    mostrarToast(`🎉 Pagado · +S/ ${totalConInteres.toFixed(2)} al capital`);
    modalDetalle.classList.add('hidden');
  });

  modalDetalle.classList.remove('hidden');
}

document.getElementById('btnCerrarDetalle').addEventListener('click', () => modalDetalle.classList.add('hidden'));
modalDetalle.addEventListener('click', (e) => { if (e.target === modalDetalle) modalDetalle.classList.add('hidden'); });

// =============================================
//  MODAL PAGO
// =============================================
function abrirModalPago(p) {
  prestamoSeleccionado = p;
  const totalConInteres = p.monto * (1 + (p.interes||0)/100);
  const pagado = (p.pagos||[]).reduce((a,pg) => a+pg.monto, 0);
  inputPagoMonto.value = Math.max(0, totalConInteres - pagado).toFixed(2);
  inputPagoFecha.value = new Date().toISOString().split('T')[0];
  inputPagoNota.value  = `Cuota ${(p.pagos||[]).length+1}`;
  modalPago.classList.remove('hidden');
  setTimeout(() => inputPagoMonto.focus(), 100);
}

document.getElementById('btnCerrarPago').addEventListener('click', () => modalPago.classList.add('hidden'));
modalPago.addEventListener('click', (e) => { if (e.target === modalPago) modalPago.classList.add('hidden'); });

document.getElementById('btnGuardarPago').addEventListener('click', async () => {
  if (!prestamoSeleccionado) return;
  const monto = parseFloat(inputPagoMonto.value);
  if (!monto || monto <= 0) { mostrarToast('⚠ Ingresa un monto válido'); return; }

  const p = prestamoSeleccionado;
  const nuevosPagos     = [...(p.pagos||[]), { monto, fecha: inputPagoFecha.value, nota: inputPagoNota.value.trim() }];
  const totalPagado     = nuevosPagos.reduce((a,pg) => a+pg.monto, 0);
  const totalConInteres = p.monto * (1+(p.interes||0)/100);
  const prestamoPagado  = totalPagado >= totalConInteres;

  try {
    await updateDoc(doc(db,'prestamos',p.id), { pagos: nuevosPagos, estado: prestamoPagado ? 'pagado' : 'activo' });
    if (prestamoPagado) {
      await guardarCapitalDB(capitalDisponible + totalConInteres);
      mostrarToast(`🎉 ¡Préstamo pagado! +S/ ${totalConInteres.toFixed(2)} al capital`);
    } else {
      mostrarToast('✅ Pago registrado');
    }
    modalPago.classList.add('hidden');
  } catch(e) { mostrarToast('❌ Error al registrar pago'); }
});

// =============================================
//  ELIMINAR
// =============================================
async function eliminarPrestamo(id, p) {
  try {
    if (p.estado === 'activo') await guardarCapitalDB(capitalDisponible + p.monto);
    await deleteDoc(doc(db,'prestamos',id));
    mostrarToast('🗑 Préstamo eliminado · Capital restaurado');
  } catch(e) { mostrarToast('❌ Error al eliminar'); }
}

// =============================================
//  FILTROS
// =============================================
document.querySelectorAll('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroActual = btn.dataset.filtro;
    renderPrestamos();
  });
});
buscador.addEventListener('input', renderPrestamos);

// =============================================
//  TOAST
// =============================================
function mostrarToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3500);
}

cargarCapital();
