/* =====================================================================
   PRODUCTOS.JS
   Conecta con la hoja "Productos" de Google Sheets y renderiza el
   catálogo en #productosGrid, respetando la estructura HTML/CSS
   ya existente (clases .producto, .producto__titulo, etc.)
   ===================================================================== */

// ID del documento de Google Sheets (se obtiene de la URL: /d/ESTE_ID/edit)
const SHEET_ID = "184OhF2sljr68qIhOLTr4ewt3A1W_UkhoTY4AtDW4Kec";

// Nombre exacto de la pestaña (tab) a leer
const SHEET_NAME = "Productos";

// Rango donde empiezan los encabezados y los datos.
// En tu hoja los encabezados (ID, PRODUCTO, SUBCATEGORÍA, DESCRIPCIÓN, IMAGEN, PRECIO)
// están en la fila 4, columna B en adelante.
// Se amplió de F a G para incluir la nueva columna de precio.
const RANGO = "B4:G1000";

// Producto que se está mostrando en el panel de detalle. Es el que se
// agrega al carrito al pulsar "Añadir al carrito".
let PRODUCTO_SELECCIONADO = null;

// Identificador de un producto: la columna ID de la hoja (o el nombre si no hay ID)
function idProducto(producto) {
    return producto.ID || producto.PRODUCTO;
}

/**
 * Construye la URL de la API gviz de Google Sheets.
 * Requiere que la hoja esté compartida como
 * "Cualquier persona con el enlace puede ver".
 */
function construirURL(sheetName, range) {
    const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
    const params = new URLSearchParams({
        tqx: "out:json",
        sheet: sheetName,
        range: range,
        headers: "1"
    });
    return `${base}?${params.toString()}`;
}

/**
 * La API gviz devuelve el JSON envuelto en una función callback.
 * Esta función limpia esa envoltura y devuelve un objeto usable.
 */
function parsearRespuestaGviz(textoCrudo) {
    const inicio = textoCrudo.indexOf("(") + 1;
    const fin = textoCrudo.lastIndexOf(")");
    const json = textoCrudo.substring(inicio, fin);
    return JSON.parse(json);
}

/**
 * Convierte las filas crudas de gviz en un arreglo de objetos
 * producto, usando las etiquetas de columna como llaves.
 */
function filasAProductos(tabla) {
    const columnas = tabla.cols.map(c => (c.label || "").trim().toUpperCase());

    return tabla.rows
        .map(fila => {
            const producto = {};
            fila.c.forEach((celda, i) => {
                if (!celda) {
                    producto[columnas[i]] = "";
                    return;
                }
                // Se prioriza el valor "formateado" (celda.f) sobre el
                // crudo (celda.v): así, si en Sheets diste formato de
                // moneda a la columna PRECIO, aquí llega ya como "$150.00"
                // en vez del número plano.
                const valor = (celda.f !== undefined && celda.f !== null) ? celda.f : celda.v;
                producto[columnas[i]] = (valor !== null && valor !== undefined) ? String(valor).trim() : "";
            });
            return producto;
        })
        // descarta filas vacías (por ejemplo filas en blanco al final de la hoja)
        .filter(p => p.PRODUCTO);
}

/**
 * Busca un campo dentro del producto por coincidencia parcial del nombre
 * de columna (sin importar mayúsculas/acentos exactos). Así, si la
 * columna de precio se llama "PRECIO", "PRECIO ($)" o "PRECIO MXN",
 * de todas formas se encuentra.
 */
function buscarCampo(producto, patron) {
    const clave = Object.keys(producto).find(k => k.includes(patron));
    return clave ? producto[clave] : "";
}

/**
 * Da formato de moneda a un valor de precio si es un número plano
 * (ej. "150" -> "$150.00"). Si ya viene formateado desde Sheets
 * (ej. "$150.00"), lo deja tal cual.
 */
function formatearPrecio(valorCrudo) {
    if (!valorCrudo) return "";
    const comoTexto = String(valorCrudo).trim();
    const esNumeroPlano = /^-?\d+(\.\d+)?$/.test(comoTexto);
    if (!esNumeroPlano) return comoTexto;
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN"
    }).format(Number(comoTexto));
}

/**
 * Crea el elemento <article class="producto"> para un producto,
 * reutilizando la misma estructura que ya tenía tu HTML.
 */
function crearTarjetaProducto(producto) {
    const article = document.createElement("article");
    article.className = "producto";
    article.dataset.nombre = producto.PRODUCTO || "";
    article.dataset.categoria = producto["SUBCATEGORÍA"] || producto.SUBCATEGORIA || "";

    const imagenHTML = producto.IMAGEN
        ? `<img src="${producto.IMAGEN}" alt="${producto.PRODUCTO}" class="producto__imagen" loading="lazy">`
        : `<div class="producto__placeholder">Producto</div>`;

    const precio = formatearPrecio(buscarCampo(producto, "PRECIO"));
    // El botón de carrito solo aparece si el producto tiene un precio válido
    const tienePrecio = limpiarPrecio(precio) > 0;

    article.innerHTML = `
        ${imagenHTML}

        <div class="producto__contenido">

            <h2 class="producto__titulo">${producto.PRODUCTO || ""}</h2>

            <p class="producto__dato">
                <strong>Categoría:</strong>
                ${producto["SUBCATEGORÍA"] || producto.SUBCATEGORIA || ""}
            </p>

            ${precio ? `<p class="producto__precio">${precio}</p>` : ""}

            <p class="producto__descripcion">
                ${producto["DESCRIPCIÓN"] || producto.DESCRIPCION || ""}
            </p>

            ${tienePrecio ? `
            <button class="producto__boton producto__boton--carrito" type="button">
                Agregar al carrito
            </button>` : ""}

        </div>
    `;

    // Identificador de la tarjeta (sirve para resaltar la seleccionada).
    article.dataset.id = idProducto(producto);
    if (PRODUCTO_SELECCIONADO && idProducto(PRODUCTO_SELECCIONADO) === article.dataset.id) {
        article.classList.add("producto--activo");
    }

    // La preview se muestra al tocar/hacer clic en cualquier parte de la
    // tarjeta, al pasar el cursor por encima, o al enfocarla con el teclado.
    article.tabIndex = 0;
    article.addEventListener("click", () => mostrarProducto(producto));
    article.addEventListener("focusin", () => mostrarProducto(producto));

    // Hover: solo en dispositivos con mouse (en celulares/tablets no existe).
    // Se espera 120 ms para que no "parpadee" al cruzar varias tarjetas.
    if (window.matchMedia("(hover: hover)").matches) {
        let temporizador = null;
        article.addEventListener("mouseenter", () => {
            temporizador = setTimeout(() => mostrarProducto(producto), 120);
        });
        article.addEventListener("mouseleave", () => clearTimeout(temporizador));
    }

    const botonCarrito = article.querySelector(".producto__boton--carrito");
    if (botonCarrito) {
        botonCarrito.addEventListener("click", () => agregarProductoAlCarrito(producto, botonCarrito));
    }

    return article;
}

/**
 * Pinta el detalle del producto seleccionado en el <aside class="detalle">.
 */
function mostrarProducto(producto) {
    PRODUCTO_SELECCIONADO = producto;

    // Resalta la tarjeta del producto que se está previsualizando
    document.querySelectorAll(".producto").forEach(tarjeta => {
        tarjeta.classList.toggle("producto--activo", tarjeta.dataset.id === idProducto(producto));
    });

    const idOrNull = (id) => document.getElementById(id);

    if (idOrNull("detalleNombre")) idOrNull("detalleNombre").textContent = producto.PRODUCTO || "";
    if (idOrNull("detalleCategoria")) idOrNull("detalleCategoria").textContent = producto["SUBCATEGORÍA"] || producto.SUBCATEGORIA || "";

    const descripcion = document.querySelector(".detalle__descripcion");
    if (descripcion) descripcion.textContent = producto["DESCRIPCIÓN"] || producto.DESCRIPCION || "";

    // Actualiza la imagen de vista previa. Si ya existe un <img> (porque
    // se seleccionó un producto antes), solo se cambia su src/alt; si
    // todavía está el placeholder original, se reemplaza por el <img>.
    const imagenActual = document.querySelector(".detalle__imagen");
    if (producto.IMAGEN) {
        if (imagenActual) {
            imagenActual.src = producto.IMAGEN;
            imagenActual.alt = producto.PRODUCTO || "";
        } else {
            const placeholder = document.querySelector(".detalle__placeholder");
            if (placeholder) {
                placeholder.outerHTML = `<img src="${producto.IMAGEN}" alt="${producto.PRODUCTO || ''}" class="detalle__imagen">`;
            }
        }
    }

    // Los campos que no vienen en la hoja (marca, pureza, presentación) se
    // ocultan si no hay dato, y se muestran automáticamente el día que
    // agregues esas columnas en Sheets con un nombre que las contenga.
    const camposOpcionales = {
        detalleMarca: "MARCA",
        tablaMarca: "MARCA",
        detallePureza: "PUREZA",
        detallePresentacion: "PRESENTAC" // cubre "PRESENTACIÓN"/"PRESENTACION"
    };

    Object.entries(camposOpcionales).forEach(([id, patronColumna]) => {
        const el = idOrNull(id);
        if (!el) return;

        const valor = buscarCampo(producto, patronColumna);
        const fila = el.closest("tr") || el;

        if (valor) {
            el.textContent = valor;
            fila.style.display = "";
        } else {
            fila.style.display = "none";
        }
    });

    // Precio
    const precioEl = idOrNull("detallePrecioValor");
    const precioContenedor = idOrNull("detallePrecio");
    const precio = formatearPrecio(buscarCampo(producto, "PRECIO"));
    if (precioEl) precioEl.textContent = precio || "Consultar precio";
    if (precioContenedor) precioContenedor.style.display = precio ? "" : "none";
}
// Se expone globalmente por si algún botón sigue usando onclick="mostrarProducto(...)"
window.mostrarProducto = mostrarProducto;

/**
 * Guarda en memoria todos los productos ya cargados, para poder
 * filtrarlos sin volver a pedirlos a Google Sheets cada vez.
 */
let TODOS_LOS_PRODUCTOS = [];

/**
 * Dibuja una lista de productos en #productosGrid, conservando el
 * mensaje "sin resultados" (se reinserta oculto o visible según el caso)
 * en vez de borrarlo del DOM para siempre.
 */
function renderizarProductos(lista) {
    const grid = document.getElementById("productosGrid");
    if (!grid) return;

    const sinResultados = document.getElementById("sinResultados");
    if (sinResultados) sinResultados.remove();

    grid.innerHTML = "";

    if (lista.length === 0) {
        if (sinResultados) {
            grid.appendChild(sinResultados);
            sinResultados.style.display = "";
        }
        return;
    }

    lista.forEach(producto => grid.appendChild(crearTarjetaProducto(producto)));

    if (sinResultados) {
        grid.appendChild(sinResultados);
        sinResultados.style.display = "none";
    }
}

/**
 * Llena el <select id="categoria"> con las subcategorías que
 * realmente existen en los datos (en vez de las dos que estaban
 * escritas a mano en el HTML).
 */
function poblarSelectCategorias(productos) {
    const select = document.getElementById("categoria");
    if (!select) return;

    const categorias = [...new Set(
        productos.map(p => p["SUBCATEGORÍA"] || p.SUBCATEGORIA).filter(Boolean)
    )].sort();

    select.innerHTML = '<option value="">Todas las categorías</option>' +
        categorias.map(c => `<option value="${c}">${c}</option>`).join("");
}

/**
 * Llena el <select id="marca"> con las marcas presentes en los datos.
 * Si tu hoja "Productos" todavía no tiene columna de marca, el filtro
 * se oculta en vez de mostrarse vacío o sin efecto.
 */
function poblarSelectMarcas(productos) {
    const select = document.getElementById("marca");
    if (!select) return;

    const marcas = [...new Set(
        productos.map(p => buscarCampo(p, "MARCA")).filter(Boolean)
    )].sort();

    if (marcas.length === 0) {
        select.style.display = "none";
        return;
    }

    select.style.display = "";
    select.innerHTML = '<option value="">Todas las marcas</option>' +
        marcas.map(m => `<option value="${m}">${m}</option>`).join("");
}

/**
 * Aplica a la vez el texto buscado y los selects de categoría/marca
 * sobre TODOS_LOS_PRODUCTOS, y vuelve a dibujar el grid con el resultado.
 */
function aplicarFiltros() {
    const buscador = document.getElementById("buscador");
    const selectCategoria = document.getElementById("categoria");
    const selectMarca = document.getElementById("marca");

    const texto = (buscador?.value || "").trim().toLowerCase();
    const categoriaElegida = selectCategoria?.value || "";
    const marcaElegida = selectMarca?.value || "";

    const filtrados = TODOS_LOS_PRODUCTOS.filter(producto => {
        const nombre = (producto.PRODUCTO || "").toLowerCase();
        const descripcion = (producto["DESCRIPCIÓN"] || producto.DESCRIPCION || "").toLowerCase();
        const categoria = producto["SUBCATEGORÍA"] || producto.SUBCATEGORIA || "";
        const marca = buscarCampo(producto, "MARCA");

        const coincideTexto = !texto || nombre.includes(texto) || descripcion.includes(texto);
        const coincideCategoria = !categoriaElegida || categoria === categoriaElegida;
        const coincideMarca = !marcaElegida || marca === marcaElegida;

        return coincideTexto && coincideCategoria && coincideMarca;
    });

    renderizarProductos(filtrados);
}

/**
 * Conecta los campos de búsqueda/filtro a aplicarFiltros().
 * Se llama una sola vez, después de la primera carga exitosa.
 */
function activarFiltros() {
    document.getElementById("buscador")?.addEventListener("input", aplicarFiltros);
    document.getElementById("categoria")?.addEventListener("change", aplicarFiltros);
    document.getElementById("marca")?.addEventListener("change", aplicarFiltros);
}

/* =====================================================================
   CARRITO
   Requiere scripts/carrito-storage.js cargado ANTES que este archivo
   (define agregarAlCarrito y guarda en localStorage).
   ===================================================================== */

/**
 * "$1,200.50" -> 1200.5   |   "Consultar precio" -> 0
 */
function limpiarPrecio(valor) {
    return parseFloat(String(valor).replace(/[^0-9.]/g, "")) || 0;
}

/**
 * Agrega un producto al carrito (localStorage). La usan tanto el botón
 * de cada tarjeta como el del panel de detalle.
 */
function agregarProductoAlCarrito(producto, boton) {
    if (!producto) return;

    const precio = limpiarPrecio(formatearPrecio(buscarCampo(producto, "PRECIO")));
    if (precio <= 0) {
        alert("Este producto no tiene precio disponible. Consulta el precio con nosotros.");
        return;
    }

    agregarAlCarrito({
        id: idProducto(producto),                    // la columna ID de tu hoja identifica el producto
        nombre: producto.PRODUCTO,
        referencia: producto.ID || "",
        precio: precio,
        imagen: producto.IMAGEN || ""
    });

    // Feedback visual en el botón
    const textoOriginal = boton.textContent;
    boton.textContent = "¡Agregado!";
    boton.disabled = true;
    setTimeout(() => {
        boton.textContent = textoOriginal;
        boton.disabled = false;
    }, 1000);
}

/**
 * Conecta el botón "Añadir al carrito" del panel de detalle.
 */
function activarBotonCarrito() {
    const boton = document.getElementById("btnAgregarCarrito");
    if (!boton) return;
    boton.addEventListener("click", () => agregarProductoAlCarrito(PRODUCTO_SELECCIONADO, boton));
}

/**
 * Muestra un mensaje de error dentro del grid si falla la carga.
 */
function mostrarError(contenedor, mensaje) {
    contenedor.innerHTML = `<p class="error-productos">${mensaje}</p>`;
}

/**
 * Punto de entrada: obtiene los productos de la pestaña "Productos"
 * y los renderiza dentro de #productosGrid.
 */
async function cargarProductos() {
    const contenedor = document.getElementById("productosGrid");
    if (!contenedor) return;

    try {
        const url = construirURL(SHEET_NAME, RANGO);
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const texto = await respuesta.text();
        const datos = parsearRespuestaGviz(texto);
        const productos = filasAProductos(datos.table);

        TODOS_LOS_PRODUCTOS = productos;

        if (productos.length === 0) {
            renderizarProductos([]);
            return;
        }

        poblarSelectCategorias(productos);
        poblarSelectMarcas(productos);
        renderizarProductos(productos);
        activarFiltros();

        // Muestra el detalle del primer producto por defecto
        mostrarProducto(productos[0]);

    } catch (error) {
        console.error("Error al cargar productos desde Google Sheets:", error);
        mostrarError(
            contenedor,
            "No se pudieron cargar los productos. Intenta recargar la página."
        );
    }
}

document.addEventListener("DOMContentLoaded", () => {
    activarBotonCarrito();
    cargarProductos();
});