// Estado de la aplicación
let capitalActual = 10000;
const prestamos = [];

// Elementos del DOM
const displayCapital = document.getElementById('display-capital');
const loanForm = document.getElementById('loan-form');
const inputCliente = document.getElementById('cliente');
const inputMonto = document.getElementById('monto');
const loansTbody = document.getElementById('loans-tbody');

// Menú Lateral (Sidebar)
const btnMenu = document.getElementById('btn-menu');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const inputCapitalSidebar = document.getElementById('input-capital-sidebar');
const btnSaveCapital = document.getElementById('btn-save-capital');

// Funciones de actualización de Vista
function actualizarVistaCapital() {
  displayCapital.textContent = `$${capitalActual.toFixed(2)}`;
  inputCapitalSidebar.value = capitalActual;
}

function actualizarTablaPrestamos() {
  loansTbody.innerHTML = '';
  prestamos.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.cliente}</td>
      <td>$${p.monto.toFixed(2)}</td>
    `;
    loansTbody.appendChild(tr);
  });
}

// Control del Menú Lateral
function toggleSidebar() {
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
}

btnMenu.addEventListener('click', toggleSidebar);
btnCloseSidebar.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

// Edición directa e independiente del Capital
btnSaveCapital.addEventListener('click', () => {
  const nuevoCapital = parseFloat(inputCapitalSidebar.value);
  if (!isNaN(nuevoCapital)) {
    capitalActual = nuevoCapital;
    actualizarVistaCapital();
    toggleSidebar();
  } else {
    alert('Por favor ingrese un número válido');
  }
});

// Registro de Préstamo (Sin restricción de capital)
loanForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const cliente = inputCliente.value.trim();
  const monto = parseFloat(inputMonto.value);

  if (cliente && !isNaN(monto) && monto > 0) {
    const nuevoPrestamo = {
      id: Date.now().toString().slice(-4),
      cliente: cliente,
      monto: monto
    };

    prestamos.push(nuevoPrestamo);
    actualizarTablaPrestamos();

    // Limpiar formulario
    inputCliente.value = '';
    inputMonto.value = '';
  }
});

// Inicialización
actualizarVistaCapital();
