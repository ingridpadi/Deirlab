// scripts/carrito.js
// Requiere scripts/carrito-storage.js cargado antes (obtenerCarrito, guardarCarrito)

const ENVIO = 31200;   // envío fijo (se aplica solo si hay productos)
const IVA = 0.21;      // cambia aquí la tasa si lo necesitas

const formato = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

// Evita que un texto con < > " rompa el HTML
function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCarrito() {
  const contenedor = document.getElementById('cart-container');
  const carrito = obtenerCarrito();

  if (carrito.length === 0) {
    contenedor.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>';
    actualizarResumen(carrito);
    return;
  }

  contenedor.innerHTML = carrito.map(p => `
    <div class="cart-item" data-id="${escapar(p.id)}">
      <div class="col-product">
        ${p.imagen ? `<img src="${escapar(p.imagen)}" alt="${escapar(p.nombre)}" width="60">` : ''}
        <span>${escapar(p.nombre)}</span>
      </div>
      <div class="col-ref">${escapar(p.referencia)}</div>
      <div class="col-price">${formato.format(p.precio)}</div>
      <div class="col-qty">
        <button class="qty-btn" data-accion="restar" aria-label="Restar uno">−</button>
        <span>${p.cantidad}</span>
        <button class="qty-btn" data-accion="sumar" aria-label="Sumar uno">+</button>
      </div>
      <div class="col-subtotal">${formato.format(p.precio * p.cantidad)}</div>
      <div class="col-action">
        <button class="btn-eliminar" data-accion="eliminar" aria-label="Eliminar producto">✕</button>
      </div>
    </div>
  `).join('');

  actualizarResumen(carrito);
}

function actualizarResumen(carrito) {
  const subtotal = carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const envio = carrito.length ? ENVIO : 0;
  const impuestos = subtotal * IVA;
  const total = subtotal + envio + impuestos;

  document.getElementById('summary-subtotal').textContent = formato.format(subtotal);
  document.getElementById('summary-shipping').textContent = formato.format(envio);
  document.getElementById('summary-tax').textContent = formato.format(impuestos);
  document.getElementById('summary-total').textContent = formato.format(total);
}

// Sumar, restar y eliminar (un solo listener para todas las filas)
document.addEventListener('click', (e) => {
  const boton = e.target.closest('[data-accion]');
  const fila = e.target.closest('.cart-item');
  if (!boton || !fila) return;

  let carrito = obtenerCarrito();
  const item = carrito.find(p => p.id === fila.dataset.id);
  if (!item) return;

  switch (boton.dataset.accion) {
    case 'sumar':
      item.cantidad++;
      break;
    case 'restar':
      item.cantidad = Math.max(1, item.cantidad - 1);
      break;
    case 'eliminar':
      carrito = carrito.filter(p => p.id !== item.id);
      break;
  }

  guardarCarrito(carrito);
  renderCarrito();
});

document.addEventListener('DOMContentLoaded', renderCarrito);

// Si el carrito cambia en otra pestaña, se actualiza esta
window.addEventListener('storage', (e) => {
  if (e.key === CLAVE_CARRITO) renderCarrito();
});