// =============================================
//  PrestamoLey – app.js
//  Lógica principal con Firebase Firestore
// =============================================
import { db } from './firebase.js';
import {
  collection, addDoc, onSnapshot, doc,
  updateDoc, deleteDoc, arrayUnion, arrayRemove,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// =============================================
//  ESTADO GLOBAL
// =============================================
let prestamos = [];
let filtroActual = 'todos';
let prestamoSeleccionado = null;

// =============================================
//  REFERENCIAS DOM
// =============================================
const grid            = document.getElementById('prestamosGrid');
const listaVacia      = document.getElementById('listaVacia');
const btnNuevo        = document.getElementById('btnNuevo');
const modalPrestamo   = document.getElementById('modalPrestamo');
const modalDetalle    = document.getElementById('modalDetalle');
const modalPago       = document.getElementById('modalPago');
const btnGuardar      = document.getElementById('btnGuardar');
const btnGuardarPago  = document.getElementById('btnGuardarPago');
const buscador        = document.getElementById('buscador');
const resumenCuota    = document.getElementById('resumenCuota');

// Inputs préstamo
const inputNombre  = document.getElementById('inputNombre');
const inputMonto   = document.getElementById('inputMonto');
const inputFecha   = document.getElementById('inputFecha');
const inputInteres = document.getElementById('inputInteres');
const inputCuotas  = document.getElementById('inputCuotas');
const inputNotas   = document.getElementById('inputNotas');

// Inputs pago
const inputPagoMonto = document.getElementById('inputPagoMonto');
const inputPagoFecha = document.getElementById('inputPagoFecha');
const inputPagoNota  = document.getElementById('inputPagoNota');

// =============================================
//  FIRESTORE – ESCUCHAR CAMBIOS EN TIEMPO REAL
// =============================================
const q = query(collection(db, 'prestamos'), orderBy('creadoEn', 'desc'));

onSnapshot(q, (snapshot) => {
  prestamos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda);
    return matchFiltro && matchBusqueda;
  });

  grid.innerHTML = '';

  if (filtrados.length === 0) {
    listaVacia.classList.remove('hidden');
    return;
  }
  listaVacia.classList.add('hidden');

  filtrados.forEach(p => {
    const totalConInteres = p.monto * (1 + (p.interes || 0) / 100);
    const pagado = (p.pagos || []).reduce((a, pg) => a + pg.monto, 0);
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
        ${p.cuotas > 1 ? `
        <div class="card-row">
          <span class="card-label">CUOTAS</span>
          <span class="card-val">S/ ${(totalConInteres / p.cuotas).toFixed(2)} x ${p.cuotas}</span>
        </div>` : ''}
        <div class="progress-wrap">
          <div class="progress-bg">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="progress-pct">${pct}% cobrado</div>
        </div>
        <div class="card-row">
          <span class="card-label">FECHA</span>
          <span class="card-val" style="font-size:14px">${p.fecha || '—'}</span>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn-pago" data-id="${p.id}" ${p.estado === 'pagado' ? 'disabled' : ''}>+ PAGO</button>
        <button class="btn-eliminar" data-id="${p.id}">🗑</button>
      </div>
    `;

    // Click en card → detalle
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-pago') || e.target.classList.contains('btn-eliminar')) return;
      abrirDetalle(p);
    });

    // Botón pago
    card.querySelector('.btn-pago')?.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirModalPago(p);
    });

    // Botón eliminar
    card.querySelector('.btn-eliminar')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`¿Eliminar el préstamo de ${p.nombre}? Esta acción no se puede deshacer.`)) {
        eliminarPrestamo(p.id);
      }
    });

    grid.appendChild(card);
  });
}

// =============================================
//  STATS HEADER
// =============================================
function actualizarStats() {
  let totalPrestado = 0, totalCobrado = 0, totalPendiente = 0;
  prestamos.forEach(p => {
    const total = p.monto * (1 + (p.interes || 0) / 100);
    const pagado = (p.pagos || []).reduce((a, pg) => a + pg.monto, 0);
    totalPrestado += total;
    totalCobrado  += pagado;
    totalPendiente += Math.max(0, total - pagado);
  });
  document.getElementById('statPrestado').textContent  = `S/ ${totalPrestado.toFixed(2)}`;
  document.getElementById('statCobrado').textContent   = `S/ ${totalCobrado.toFixed(2)}`;
  document.getElementById('statPendiente').textContent = `S/ ${totalPendiente.toFixed(2)}`;
}

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

document.getElementById('btnCerrarModal').addEventListener('click', () => {
  modalPrestamo.classList.add('hidden');
});
modalPrestamo.addEventListener('click', (e) => {
  if (e.target === modalPrestamo) modalPrestamo.classList.add('hidden');
});

// Calcular resumen cuota en tiempo real
[inputMonto, inputInteres, inputCuotas].forEach(el => {
  el.addEventListener('input', calcularResumen);
});

function calcularResumen() {
  const monto   = parseFloat(inputMonto.value) || 0;
  const interes = parseFloat(inputInteres.value) || 0;
  const cuotas  = parseInt(inputCuotas.value) || 1;
  if (monto <= 0) { resumenCuota.classList.remove('visible'); return; }
  const total  = monto * (1 + interes / 100);
  const cuota  = total / cuotas;
  resumenCuota.innerHTML = `
    Total a cobrar: S/ ${total.toFixed(2)} &nbsp;·&nbsp;
    Cuota: S/ ${cuota.toFixed(2)} x ${cuotas}
  `;
  resumenCuota.classList.add('visible');
}

// Guardar préstamo
btnGuardar.addEventListener('click', async () => {
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
      estado: 'activo',
      pagos: [],
      creadoEn: serverTimestamp()
    });
    modalPrestamo.classList.add('hidden');
    mostrarToast('✅ Préstamo guardado');
  } catch (e) {
    mostrarToast('❌ Error al guardar');
  }
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
          <button class="pago-eliminar" data-idx="${(p.pagos.length - 1) - i}" title="Eliminar pago">✕</button>
        </div>
      `).join('');

  document.getElementById('detalleBody').innerHTML = `
    <div class="detalle-resumen">
      <div class="detalle-stat">
        <div class="ds-label">PRESTADO</div>
        <div class="ds-val w">S/ ${p.monto.toFixed(2)}</div>
      </div>
      <div class="detalle-stat">
        <div class="ds-label">INTERÉS</div>
        <div class="ds-val w">${p.interes || 0}%</div>
      </div>
      <div class="detalle-stat">
        <div class="ds-label">TOTAL</div>
        <div class="ds-val w">S/ ${totalConInteres.toFixed(2)}</div>
      </div>
      <div class="detalle-stat">
        <div class="ds-label">COBRADO</div>
        <div class="ds-val g">S/ ${pagado.toFixed(2)}</div>
      </div>
      <div class="detalle-stat">
        <div class="ds-label">PENDIENTE</div>
        <div class="ds-val r">S/ ${pendiente.toFixed(2)}</div>
      </div>
      <div class="detalle-stat">
        <div class="ds-label">AVANCE</div>
        <div class="ds-val g">${pct}%</div>
      </div>
    </div>
    ${p.notas ? `<div class="notas-box">📝 ${p.notas}</div>` : ''}
    <div class="pagos-titulo">HISTORIAL DE PAGOS</div>
    ${pagosHTML}
    ${p.estado === 'activo' ? `
    <button class="btn-guardar" id="btnDetalleMarcarPagado" style="margin-top:16px;background:#ffd600;color:#000">
      ✅ MARCAR COMO TOTALMENTE PAGADO
    </button>` : ''}
  `;

  // Eliminar pago individual
  document.querySelectorAll('.pago-eliminar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      const pago = p.pagos[idx];
      if (!pago) return;
      if (!confirm('¿Eliminar este pago?')) return;
      const nuevos = p.pagos.filter((_, i) => i !== idx);
      const nuevoTotal = nuevos.reduce((a, pg) => a + pg.monto, 0);
      const totalConInt = p.monto * (1 + (p.interes || 0) / 100);
      const nuevoEstado = nuevoTotal >= totalConInt ? 'pagado' : 'activo';
      await updateDoc(doc(db, 'prestamos', p.id), { pagos: nuevos, estado: nuevoEstado });
      mostrarToast('Pago eliminado');
      modalDetalle.classList.add('hidden');
    });
  });

  // Marcar como pagado
  document.getElementById('btnDetalleMarcarPagado')?.addEventListener('click', async () => {
    if (!confirm(`¿Marcar el préstamo de ${p.nombre} como completamente pagado?`)) return;
    await updateDoc(doc(db, 'prestamos', p.id), { estado: 'pagado' });
    mostrarToast('✅ Préstamo marcado como pagado');
    modalDetalle.classList.add('hidden');
  });

  modalDetalle.classList.remove('hidden');
}

document.getElementById('btnCerrarDetalle').addEventListener('click', () => {
  modalDetalle.classList.add('hidden');
});
modalDetalle.addEventListener('click', (e) => {
  if (e.target === modalDetalle) modalDetalle.classList.add('hidden');
});

// =============================================
//  MODAL PAGO
// =============================================
function abrirModalPago(p) {
  prestamoSeleccionado = p;
  const totalConInteres = p.monto * (1 + (p.interes || 0) / 100);
  const pagado = (p.pagos || []).reduce((a, pg) => a + pg.monto, 0);
  const pendiente = Math.max(0, totalConInteres - pagado);
  inputPagoMonto.value = pendiente.toFixed(2);
  inputPagoFecha.value = new Date().toISOString().split('T')[0];
  inputPagoNota.value  = `Cuota ${(p.pagos || []).length + 1}`;
  modalPago.classList.remove('hidden');
  setTimeout(() => inputPagoMonto.focus(), 100);
}

document.getElementById('btnCerrarPago').addEventListener('click', () => {
  modalPago.classList.add('hidden');
});
modalPago.addEventListener('click', (e) => {
  if (e.target === modalPago) modalPago.classList.add('hidden');
});

btnGuardarPago.addEventListener('click', async () => {
  if (!prestamoSeleccionado) return;
  const monto = parseFloat(inputPagoMonto.value);
  const fecha = inputPagoFecha.value;
  const nota  = inputPagoNota.value.trim();

  if (!monto || monto <= 0) { mostrarToast('⚠ Ingresa un monto válido'); return; }

  const p = prestamoSeleccionado;
  const nuevoPago = { monto, fecha, nota };
  const nuevosPagos = [...(p.pagos || []), nuevoPago];
  const totalPagado = nuevosPagos.reduce((a, pg) => a + pg.monto, 0);
  const totalConInteres = p.monto * (1 + (p.interes || 0) / 100);
  const nuevoEstado = totalPagado >= totalConInteres ? 'pagado' : 'activo';

  try {
    await updateDoc(doc(db, 'prestamos', p.id), {
      pagos: nuevosPagos,
      estado: nuevoEstado
    });
    modalPago.classList.add('hidden');
    if (nuevoEstado === 'pagado') {
      mostrarToast('🎉 ¡Préstamo completamente pagado!');
    } else {
      mostrarToast('✅ Pago registrado');
    }
  } catch (e) {
    mostrarToast('❌ Error al registrar pago');
  }
});

// =============================================
//  ELIMINAR PRÉSTAMO
// =============================================
async function eliminarPrestamo(id) {
  try {
    await deleteDoc(doc(db, 'prestamos', id));
    mostrarToast('🗑 Préstamo eliminado');
  } catch (e) {
    mostrarToast('❌ Error al eliminar');
  }
}

// =============================================
//  FILTROS Y BUSCADOR
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
  }, 3000);
}
