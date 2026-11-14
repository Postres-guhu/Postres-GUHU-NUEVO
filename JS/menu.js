

/* =====================================
   MENÚ - POSTRES GUHU
===================================== */

const URL_CATEGORIAS = {
    "Pay": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBk8g0SlBZqux32HU51cBqSbKXTLD1V0LS0QkVnmq-ls4l4JBpBMpWzz0ScNx_kjY4jAYzzrnUXZqn/pub?gid=597117416&single=true&output=csv",

    "Gelatinas": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBk8g0SlBZqux32HU51cBqSbKXTLD1V0LS0QkVnmq-ls4l4JBpBMpWzz0ScNx_kjY4jAYzzrnUXZqn/pub?gid=2002367845&single=true&output=csv",

    "Especiales": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBk8g0SlBZqux32HU51cBqSbKXTLD1V0LS0QkVnmq-ls4l4JBpBMpWzz0ScNx_kjY4jAYzzrnUXZqn/pub?gid=1059968763&single=true&output=csv"
};

const CLAVE_CARRITO = "postresGuhuCarrito";

const listaProductos = document.getElementById("lista-productos");
const estadoCarga = document.getElementById("estado-carga");
const mensajeVacio = document.getElementById("mensaje-vacio");
const errorCarga = document.getElementById("error-carga");
const detalleError = document.getElementById("detalle-error");
const botonReintentar = document.getElementById("reintentar");
const tituloCategoria = document.getElementById("titulo-categoria");

const botonesCategorias = document.querySelectorAll(
    ".categoria-circulo[data-categoria]"
);

let categoriaActual = "Pay";

/* =====================================
   CONVERTIR CSV EN FILAS
===================================== */

function leerCSV(texto) {
    const filas = [];
    let fila = [];
    let campo = "";
    let dentroDeComillas = false;

    for (let i = 0; i < texto.length; i++) {
        const caracter = texto[i];
        const siguiente = texto[i + 1];

        if (caracter === '"' && dentroDeComillas && siguiente === '"') {
            campo += '"';
            i++;
        } else if (caracter === '"') {
            dentroDeComillas = !dentroDeComillas;
        } else if (caracter === "," && !dentroDeComillas) {
            fila.push(campo.trim());
            campo = "";
        } else if (
            (caracter === "\n" || caracter === "\r") &&
            !dentroDeComillas
        ) {
            if (caracter === "\r" && siguiente === "\n") {
                i++;
            }

            fila.push(campo.trim());

            if (fila.some(valor => valor !== "")) {
                filas.push(fila);
            }

            fila = [];
            campo = "";
        } else {
            campo += caracter;
        }
    }

    fila.push(campo.trim());

    if (fila.some(valor => valor !== "")) {
        filas.push(fila);
    }

    return filas;
}

/* =====================================
   NORMALIZAR ENCABEZADOS
===================================== */

function normalizarTexto(texto) {
    return String(texto || "")
        .replace(/^\uFEFF/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

/* =====================================
   BUSCAR COLUMNAS
===================================== */

function buscarColumna(encabezados, posiblesNombres) {
    return encabezados.findIndex(encabezado =>
        posiblesNombres.includes(normalizarTexto(encabezado))
    );
}

/* =====================================
   LEER CARRITO
===================================== */

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

/* =====================================
   GUARDAR CARRITO
===================================== */

function guardarCarrito(carrito) {
    localStorage.setItem(
        CLAVE_CARRITO,
        JSON.stringify(carrito)
    );
}

/* =====================================
   AGREGAR PRODUCTO AL CARRITO
===================================== */

function agregarAlCarrito(producto) {

    if (!producto.id) {
        alert("Este producto no tiene un ID registrado.");
        return;
    }

    if (producto.existencia <= 0) {
        alert("Este producto no tiene existencias disponibles.");
        return;
    }

    const carrito = leerCarrito();

    const existente = carrito.find(item =>
        item.id === producto.id &&
        item.categoria === producto.categoria
    );

    if (existente) {

        const cantidadActual =
            Math.max(1, Number(existente.cantidad) || 1);

        if (cantidadActual >= producto.existencia) {
            alert("Ya alcanzaste las existencias disponibles de este producto.");
            return;
        }

        existente.nombre = producto.nombre;
        existente.precio = producto.precio;
        existente.imagen = producto.imagen;
        existente.existencia = producto.existencia;
        existente.cantidad = cantidadActual + 1;

    } else {

        carrito.push({
            id: producto.id,
            categoria: producto.categoria,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: producto.imagen,
            existencia: producto.existencia,
            cantidad: 1
        });

    }

    try {

        guardarCarrito(carrito);

        alert(`${producto.nombre} se agregó a tu carrito 🩷`);

    } catch (error) {

        console.error("Error al guardar carrito:", error);

        alert("No pudimos guardar el producto. Inténtalo nuevamente.");

    }
}

/* =====================================
   CARGAR CATEGORÍA
===================================== */

async function cargarCategoria(categoria) {

    categoriaActual = categoria;

    tituloCategoria.textContent = categoria;

    botonesCategorias.forEach(boton => {

        const seleccionada =
            boton.dataset.categoria === categoria;

        boton.classList.toggle("seleccionada", seleccionada);

        boton.setAttribute(
            "aria-pressed",
            String(seleccionada)
        );

    });

    listaProductos.replaceChildren();

    estadoCarga.hidden = false;
    mensajeVacio.hidden = true;
    errorCarga.hidden = true;

    try {

        const respuesta = await fetch(URL_CATEGORIAS[categoria], {
            cache: "no-store"
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo consultar Google Sheets.");
        }

        const textoCSV = await respuesta.text();

        const filas = leerCSV(textoCSV);

        if (filas.length < 2) {
            mensajeVacio.hidden = false;
            return;
        }

        const encabezados = filas[0];

        /* IDENTIFICAR COLUMNAS */

        const columnaID = buscarColumna(
            encabezados,
            ["id"]
        );

        const columnaNombre = buscarColumna(
            encabezados,
            ["nombre"]
        );

        const columnaPrecio = buscarColumna(
            encabezados,
            ["precio", "precio por unidad", "precio unitario"]
        );

        /*
          IMPORTANTE:
          Se utiliza la existencia ACTUAL de la tienda.
          No se utiliza "Cantidad por existencia",
          porque esa columna representa la cantidad habitual
          de producción y no el inventario disponible.
        */

        const columnaExistencia = buscarColumna(
            encabezados,
            [
                "existencia en tienda",
                "existencia actual",
                "cantidad en existencia",
                "existencias",
                "stock"
            ]
        );

        const columnaImagen = buscarColumna(
            encabezados,
            ["imagen", "foto", "url imagen"]
        );

        if (
            columnaID === -1 ||
            columnaNombre === -1 ||
            columnaPrecio === -1 ||
            columnaExistencia === -1
        ) {

            throw new Error(
                "No se encontraron todas las columnas necesarias. Revisa que tu hoja tenga ID, Nombre, Precio y Existencia en tienda."
            );

        }

        /* OBTENER PRODUCTOS */

        const productos = filas.slice(1)
            .map(fila => {

                const precioTexto = String(
                    fila[columnaPrecio] || ""
                ).replace(/[$,\s]/g, "");

                const precio = Number(precioTexto);

                const existenciaTexto = String(
                    fila[columnaExistencia] || ""
                ).trim();

                const existencia = Number(existenciaTexto);

                return {

                    id: String(
                        fila[columnaID] || ""
                    ).trim(),

                    nombre: String(
                        fila[columnaNombre] || ""
                    ).trim(),

                    categoria: categoria,

                    precio: precio,

                    imagen: columnaImagen !== -1
                        ? String(fila[columnaImagen] || "").trim()
                        : "",

                    existencia: existencia

                };

            })
            .filter(producto =>
                producto.id !== "" &&
                producto.nombre !== "" &&
                Number.isFinite(producto.precio) &&
                producto.precio >= 0 &&
                Number.isInteger(producto.existencia) &&
                producto.existencia >= 0
            );

        listaProductos.replaceChildren();

        if (productos.length === 0) {
            mensajeVacio.hidden = false;
            return;
        }

        /* =====================================
           CREAR TARJETAS
        ===================================== */

        productos.forEach(producto => {

            const tarjeta = document.createElement("article");

            tarjeta.className = "tarjeta-producto";

            /* IMAGEN */

            if (producto.imagen !== "") {

                const imagen = document.createElement("img");

                imagen.className = "imagen-producto";
                imagen.src = producto.imagen;
                imagen.alt = producto.nombre;
                imagen.loading = "lazy";

                imagen.onerror = () => {
                    imagen.remove();
                };

                tarjeta.appendChild(imagen);

            }

            /* INFORMACIÓN */

            const informacion = document.createElement("div");

            informacion.className = "info-producto";

            const nombre = document.createElement("h3");

            nombre.className = "nombre-producto";
            nombre.textContent = producto.nombre;

            const precio = document.createElement("p");

            precio.className = "precio-producto";

            precio.textContent =
                `$${producto.precio.toFixed(2)}`;

            /* EXISTENCIAS */

            const existencia = document.createElement("p");

            existencia.className = "existencia-producto";

            existencia.textContent =
                producto.existencia > 0
                    ? `Disponibles: ${producto.existencia}`
                    : "Agotado";

            /* BOTÓN */

            const botonCarrito = document.createElement("button");

            botonCarrito.type = "button";
            botonCarrito.className = "boton-carrito";

            botonCarrito.textContent =
                producto.existencia > 0
                    ? "Agregar al carrito"
                    : "Agotado";

            botonCarrito.disabled = producto.existencia <= 0;

            botonCarrito.addEventListener("click", () => {
                agregarAlCarrito(producto);
            });

            informacion.append(
                nombre,
                precio,
                existencia,
                botonCarrito
            );

            tarjeta.appendChild(informacion);

            listaProductos.appendChild(tarjeta);

        });

    } catch (error) {

        console.error("Error al cargar productos:", error);

        detalleError.textContent =
            error.message ||
            "Verifica tu conexión a internet y que las hojas estén publicadas como CSV.";

        errorCarga.hidden = false;

    } finally {

        estadoCarga.hidden = true;

    }

}

/* =====================================
   BOTONES DE CATEGORÍAS
===================================== */

botonesCategorias.forEach(boton => {

    boton.addEventListener("click", () => {

        cargarCategoria(boton.dataset.categoria);

    });

});

/* =====================================
   REINTENTAR
===================================== */

botonReintentar.addEventListener("click", () => {

    cargarCategoria(categoriaActual);

});

/* =====================================
   CARGA INICIAL
===================================== */

cargarCategoria("Pay");
