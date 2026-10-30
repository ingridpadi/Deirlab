// scripts/carrito-storage.js
// Funciones compartidas: se cargan en las páginas de productos/equipos Y en carrito.html

const CLAVE_CARRITO = 'carrito';

function obtenerCarrito() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];
  } catch {
    return [];
  }
}

function guardarCarrito(carrito) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
}

function agregarAlCarrito(producto) {
  const carrito = obtenerCarrito();
  const existente = carrito.find(p => p.id === producto.id);

  if (existente) {
    existente.cantidad += 1; // si ya está en el carrito, suma uno
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }

  guardarCarrito(carrito);
}

function contarArticulos() {
  return obtenerCarrito().reduce((total, p) => total + p.cantidad, 0);
}