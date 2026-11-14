
/* ==============================
   CARRITO DE COMPRAS - POSTRES GUHU
============================== */

const CLAVE_CARRITO = "postresGuhuCarrito";

const listaCarrito = document.getElementById("lista-carrito");
const carritoVacio = document.getElementById("carrito-vacio");
const resumenCarrito = document.getElementById("resumen-carrito");
const subtotalElemento = document.getElementById("subtotal");
const totalElemento = document.getElementById("total");
const botonVaciar = document.getElementById("vaciar-carrito");
const botonContinuar = document.getElementById("continuar-pedido");

const CATEGORIAS_VALIDAS = ["Gelatinas", "Especiales", "Pay"];

/* ==============================
   LEER CARRITO
============================== */

function leerCarrito() {
    try {
        const datos = JSON.parse(
            localStorage.getItem(CLAVE_CARRITO) || "[]"
        );

        return Array.isArray(datos) ? datos : [];

    } catch (error) {
        return [];
    }
}

/* ==============================
   GUARDAR CARRITO
============================== */

function guardarCarrito(productos) {
    localStorage.setItem(
        CLAVE_CARRITO,
        JSON.stringify(productos)
    );
}

/* ==============================
   FORMATO DE DINERO
============================== */

function dinero(cantidad) {
    return Number(cantidad).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });
}

/* ==============================
   ACTUALIZAR CANTIDAD
============================== */

function actualizarCantidad(indice, cambio) {

    const productos = leerCarrito();
    const producto = productos[indice];

    if (!producto) return;

    const cantidadActual = Math.max(
        1,
        Number(producto.cantidad) || 1
    );

    const existencia = Number(producto.existencia);

    let nuevaCantidad = cantidadActual + cambio;

    if (nuevaCantidad < 1) {
        nuevaCantidad = 1;
    }

    if (cambio > 0) {

        if (
            !Number.isInteger(existencia) ||
            existencia <= 0
        ) {
            alert("No podemos verificar las existencias de este producto.");
            return;
        }

        if (nuevaCantidad > existencia) {
            alert(`Solo tenemos ${existencia} unidades disponibles.`);
            return;
        }

    }

    producto.cantidad = nuevaCantidad;

    guardarCarrito(productos);

    mostrarCarrito();
}

/* ==============================
   MOSTRAR CARRITO
============================== */

function mostrarCarrito() {

    const productos = leerCarrito();

    listaCarrito.replaceChildren();

    let total = 0;

    carritoVacio.hidden = productos.length > 0;
    resumenCarrito.hidden = productos.length === 0;

    productos.forEach((producto, indice) => {

        const cantidad = Math.max(
            1,
            Number(producto.cantidad) || 1
        );

        const precio = Math.max(
            0,
            Number(producto.precio) || 0
        );

        const existencia = Number(producto.existencia);

        const importe = precio * cantidad;

        total += importe;

        const tarjeta = document.createElement("article");
        tarjeta.className = "producto-carrito";

        /* IMAGEN */

        if (producto.imagen) {

            const imagen = document.createElement("img");

            imagen.className = "imagen-carrito";
            imagen.src = producto.imagen;
            imagen.alt = producto.nombre || "Postre GUHU";
            imagen.loading = "lazy";

            imagen.addEventListener("error", () => {

                const reemplazo = document.createElement("div");

                reemplazo.className = "producto-sin-imagen";
                reemplazo.textContent = "🍮";

                imagen.replaceWith(reemplazo);

            });

            tarjeta.appendChild(imagen);

        } else {

            const imagen = document.createElement("div");

            imagen.className = "producto-sin-imagen";
            imagen.textContent = "🍮";

            tarjeta.appendChild(imagen);

        }

        /* INFORMACIÓN */

        const informacion = document.createElement("div");
        informacion.className = "info-producto";

        const nombre = document.createElement("h2");
        nombre.textContent = producto.nombre || "Postre";

        const precioElemento = document.createElement("p");

        precioElemento.className = "precio-carrito";
        precioElemento.textContent =
            `${dinero(precio)} por unidad`;

        /* CONTROLES DE CANTIDAD */

        const controles = document.createElement("div");
        controles.className = "controles-producto";

        const cantidadControl = document.createElement("div");
        cantidadControl.className = "cantidad-control";

        // DISMINUIR

        const menos = document.createElement("button");

        menos.type = "button";
        menos.className = "boton-cantidad";
        menos.textContent = "−";
        menos.setAttribute("aria-label", "Disminuir cantidad");

        menos.addEventListener("click", () => {
            actualizarCantidad(indice, -1);
        });

        // CANTIDAD

        const numero = document.createElement("span");
        numero.textContent = cantidad;

        // AUMENTAR

        const mas = document.createElement("button");

        mas.type = "button";
        mas.className = "boton-cantidad";
        mas.textContent = "+";
        mas.setAttribute("aria-label", "Aumentar cantidad");

        mas.disabled =
            !Number.isInteger(existencia) ||
            existencia <= 0 ||
            cantidad >= existencia;

        mas.addEventListener("click", () => {
            actualizarCantidad(indice, 1);
        });

        cantidadControl.append(menos, numero, mas);

        /* ELIMINAR */

        const eliminar = document.createElement("button");

        eliminar.type = "button";
        eliminar.className = "boton-eliminar";
        eliminar.textContent = "Eliminar";

        eliminar.addEventListener("click", () => {

            const actuales = leerCarrito();

            actuales.splice(indice, 1);

            guardarCarrito(actuales);

            mostrarCarrito();

        });

        controles.append(cantidadControl, eliminar);

        /* EXISTENCIAS */

        const existenciaElemento = document.createElement("p");

        existenciaElemento.textContent =
            `Disponibles: ${Number.isInteger(existencia) ? existencia : "No verificadas"}`;

        /* IMPORTE */

        const importeElemento = document.createElement("p");

        importeElemento.textContent =
            `Importe: ${dinero(importe)}`;

        importeElemento.style.marginTop = "12px";
        importeElemento.style.fontWeight = "bold";

        /* AGREGAR ELEMENTOS */

        informacion.append(
            nombre,
            precioElemento,
            existenciaElemento,
            controles,
            importeElemento
        );

        tarjeta.appendChild(informacion);

        listaCarrito.appendChild(tarjeta);

    });

    /* ACTUALIZAR TOTALES */

    subtotalElemento.textContent = dinero(total);
    totalElemento.textContent = dinero(total);

}

/* ==============================
   VACIAR CARRITO
============================== */

botonVaciar.addEventListener("click", () => {

    if (confirm("¿Quieres quitar todos los productos del carrito?")) {

        guardarCarrito([]);

        mostrarCarrito();

    }

});

/* ==============================
   VALIDAR ANTES DE CONTINUAR
============================== */

function validarCarrito(productos) {

    if (productos.length === 0) {
        return "Tu carrito está vacío.";
    }

    for (const producto of productos) {

        if (!producto.id || !String(producto.id).trim()) {
            return "Hay un producto sin ID registrado.";
        }

        if (!CATEGORIAS_VALIDAS.includes(producto.categoria)) {
            return `La categoría de ${producto.nombre || "un producto"} no es válida.`;
        }

        if (
            !Number.isFinite(Number(producto.precio)) ||
            Number(producto.precio) < 0
        ) {
            return `El precio de ${producto.nombre || "un producto"} no es válido.`;
        }

        if (
            !Number.isInteger(Number(producto.cantidad)) ||
            Number(producto.cantidad) < 1
        ) {
            return `La cantidad de ${producto.nombre || "un producto"} no es válida.`;
        }

        if (
            !Number.isInteger(Number(producto.existencia)) ||
            Number(producto.existencia) < Number(producto.cantidad)
        ) {
            return `No hay existencias suficientes de ${producto.nombre || "este producto"}.`;
        }

    }

    return null;
}

/* ==============================
   CONTINUAR CON EL PEDIDO
============================== */

botonContinuar.addEventListener("click", () => {

    const productos = leerCarrito();

    const error = validarCarrito(productos);

    if (error) {

        alert(error);

        return;

    }

    window.location.href = "datos-pedido.html";

});

/* ==============================
   ACTUALIZAR CARRITO
============================== */

window.addEventListener("storage", mostrarCarrito);

/* ==============================
   INICIAR CARRITO
============================== */

mostrarCarrito();
