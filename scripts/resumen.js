// Clave para almacenar los productos en el LocalStorage
const STORAGE_KEY = 'deirlab_cart';

// Productos por defecto (se guardan automáticamente en LocalStorage si aún no existen)
const defaultCartItems = [
  { id: 1, name: "Microscopio Binocular Avanzado Mdl. 300", ref: "DL-M001", qty: 1, unitPrice: 69000 },
  { id: 2, name: "Kit de Reactivos de Bioquímica Básica", ref: "DL-R100", qty: 2, unitPrice: 15600 },
  { id: 3, name: "Centrífuga de Mesa de Alta Velocidad", ref: "DL-C200", qty: 1, unitPrice: 24000 },
  { id: 4, name: "Set de Pipetas Automáticas", ref: "DL-P110", qty: 1, unitPrice: 9000 }
];

/**
 * Obtener productos desde LocalStorage
 */
function getCartItems() {
  const storedCart = localStorage.getItem(STORAGE_KEY);
  if (!storedCart) {
    // Si no existen productos en LocalStorage, guardamos la lista por defecto
    saveCartItems(defaultCartItems);
    return defaultCartItems;
  }
  return JSON.parse(storedCart);
}

/**
 * Guardar productos en LocalStorage
 * @param {Array} items - Arreglo de productos a guardar
 */
function saveCartItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Formateador de Moneda MXN
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

/**
 * Renderizado de la lista de productos y cálculo automático de totales
 */
function renderOrderSummary() {
  const itemsListEl = document.getElementById('itemsList');
  if (!itemsListEl) return;

  // Cargar productos desde LocalStorage
  const cartItems = getCartItems();
  
  let subtotal = 0;
  let totalQty = 0;
  itemsListEl.innerHTML = '';

  if (cartItems.length === 0) {
    itemsListEl.innerHTML = `
      <li style="padding: 1rem; text-align: center; color: #94a3b8; font-style: italic;">
        El carrito de compras está vacío.
      </li>`;
  } else {
    cartItems.forEach(item => {
      const itemSubtotal = item.qty * item.unitPrice;
      subtotal += itemSubtotal;
      totalQty += item.qty;

      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <p class="item-name">✔ ${item.qty}x ${item.name}</p>
          <p class="item-subtext">Ref: ${item.ref} | Unitario: ${formatCurrency(item.unitPrice)}</p>
        </div>
        <div class="item-price">
          ${formatCurrency(itemSubtotal)}
        </div>
      `;
      itemsListEl.appendChild(li);
    });
  }

  // Actualizar el contador del ícono del carrito en el Navbar
  const cartBadge = document.querySelector('.cart-badge');
  if (cartBadge) {
    cartBadge.innerText = totalQty;
  }

  // Desglose Financiero (Envío e IVA 21%)
  const shipping = cartItems.length > 0 ? 31200 : 0;
  const taxRate = 0.21;
  const tax = subtotal * taxRate;
  const total = subtotal + shipping + tax;

  // Actualización de elementos DOM
  document.getElementById('subtotalDisplay').innerText = formatCurrency(subtotal);
  document.getElementById('shippingDisplay').innerText = formatCurrency(shipping);
  document.getElementById('taxDisplay').innerText = formatCurrency(tax);
  document.getElementById('totalDisplay').innerText = formatCurrency(total);
}

/**
 * Manejador del Formulario
 */
function setupFormHandlers() {
  const form = document.getElementById('orderForm');
  if (form) {
    form.addEventListener('submit', function(event) {
      event.preventDefault();

      const currentCart = getCartItems();

      const orderSummaryData = {
        orderId: document.getElementById('orderId').innerText,
        date: document.getElementById('orderDate').innerText,
        client: document.getElementById('clientName').value,
        institution: document.getElementById('institution').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: `${document.getElementById('address').value}, ${document.getElementById('suburb').value}, C.P. ${document.getElementById('postalCode').value}, ${document.getElementById('city').value}, ${document.getElementById('state').value}, ${document.getElementById('country').value}`,
        notes: document.getElementById('notes').value,
        items: currentCart,
        totalPaid: document.getElementById('totalDisplay').innerText
      };

      console.log("Orden procesada desde LocalStorage:", orderSummaryData);

      alert(`✅ ¡Cuestionario de Pedido Confirmado!\n\n` +
            `ID Pedido: ${orderSummaryData.orderId}\n` +
            `Cliente: ${orderSummaryData.client}\n` +
            `Artículos: ${orderSummaryData.items.length} producto(s) cargado(s)\n` +
            `Pago Total: ${orderSummaryData.totalPaid}\n\n` +
            `Redirigiendo a la pasarela de pago...`);

      // Si deseas vaciar el carrito al confirmar el pedido, descomenta la siguiente línea:
      // localStorage.removeItem(STORAGE_KEY);
    });
  }

  // Manejador del Botón Imprimir
  const btnPrint = document.getElementById('btnPrint');
  if (btnPrint) {
    btnPrint.addEventListener('click', function() {
      window.print();
    });
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  renderOrderSummary();
  setupFormHandlers();
});