
/* ==============================
   DATOS DEL PEDIDO - POSTRES GUHU
============================== */

const CLAVE_CARRITO = window.PostresGuhuConfig.CLAVE_CARRITO;
const CLAVE_SOLICITUD_PENDIENTE = window.PostresGuhuConfig.CLAVE_SOLICITUD_PENDIENTE;
const URL_APPS_SCRIPT = window.PostresGuhuConfig.URL_APPS_SCRIPT;
const WHATSAPP_GUHU = window.PostresGuhuConfig.WHATSAPP_GUHU;

const formulario = document.getElementById("formulario-pedido");
const botonConfirmar = document.getElementById("confirmar-pedido");

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
   FORMATO DE DINERO
============================== */

function dinero(cantidad) {
    return Number(cantidad).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });
}

/* ==============================
   VERIFICAR CARRITO
============================== */

function verificarCarrito() {
    const productos = leerCarrito();

    if (productos.length === 0) {
        alert("Tu carrito está vacío. Primero agrega tus postres favoritos.");
        window.location.href = "menu.html";
    }
}

/* ==============================
   CALCULAR TOTAL
============================== */

function calcularTotal(productos) {
    return productos.reduce((total, producto) => {
        return total +
            Number(producto.cantidad) * Number(producto.precio);
    }, 0);
}

/* ==============================
   PREPARAR ARTÍCULOS
============================== */

function obtenerArticulos(productos) {
    return productos.map(producto => ({
        id: String(producto.id || "").trim(),
        categoria: String(producto.categoria || "").trim(),
        nombre: String(producto.nombre || "Postre"),
        cantidad: Number(producto.cantidad),
        precio: Number(producto.precio)
    }));
}

/* ==============================
   IDENTIFICADOR DE SOLICITUD
   EVITAR PEDIDOS DUPLICADOS
============================== */

function obtenerSolicitudId(datos) {
    const contenido = JSON.stringify(datos);

    try {
        const pendiente = JSON.parse(
            localStorage.getItem(CLAVE_SOLICITUD_PENDIENTE) || "null"
        );

        if (
            pendiente &&
            pendiente.contenido === contenido &&
            pendiente.solicitudId
        ) {
            return pendiente.solicitudId;
        }

    } catch (error) {
        console.warn("No se pudo leer la solicitud anterior.");
    }

    const solicitudId =
        "GUHU-" + Date.now() + "-" +
        Math.random().toString(36).substring(2, 8);

    localStorage.setItem(
        CLAVE_SOLICITUD_PENDIENTE,
        JSON.stringify({
            contenido: contenido,
            solicitudId: solicitudId
        })
    );

    return solicitudId;
}

/* ==============================
   LIMPIAR SOLICITUD CONFIRMADA
============================== */

function limpiarSolicitudPendiente() {
    localStorage.removeItem(CLAVE_SOLICITUD_PENDIENTE);
}

/* ==============================
   CREAR MENSAJE DE WHATSAPP
============================== */

function crearMensaje(datos, productos, numeroPedido, total) {
    let mensaje = `¡Hola, Postres GUHU! 🍮💗\n\n`;

    mensaje += `Quiero confirmar mi pedido.\n\n`;
    mensaje += `*Número de pedido:* ${numeroPedido}\n`;
    mensaje += `*Nombre:* ${datos.nombre}\n\n`;

    mensaje += `*Mis postres:*\n`;

    productos.forEach(producto => {
        const cantidad = Number(producto.cantidad);
        const precio = Number(producto.precio);

        mensaje +=
            `• ${producto.nombre} x${cantidad} - ${dinero(precio * cantidad)}\n`;
    });

    mensaje += `\n*Total de productos:* ${dinero(total)}\n`;
    mensaje += `*Teléfono:* ${datos.telefono}\n\n`;
    mensaje += `Quedo pendiente de la confirmación de mi pedido. ¡Gracias! 💕`;

    return mensaje;
}

/* ==============================
   ENVIAR PEDIDO A APPS SCRIPT
   MEDIANTE IFRAME
============================== */

function enviarPedido(datos, solicitudId) {

    return new Promise((resolve, reject) => {

        const iframe = document.createElement("iframe");
        const formularioOculto = document.createElement("form");

        const nombreIframe = "guhu_respuesta_" + solicitudId;

        iframe.name = nombreIframe;
        iframe.style.display = "none";

        formularioOculto.method = "POST";
        formularioOculto.action = URL_APPS_SCRIPT;
        formularioOculto.target = nombreIframe;
        formularioOculto.style.display = "none";

        const campoDatos = document.createElement("input");

        campoDatos.type = "hidden";
        campoDatos.name = "datos";
        campoDatos.value = JSON.stringify(datos);

        const campoSolicitud = document.createElement("input");

        campoSolicitud.type = "hidden";
        campoSolicitud.name = "solicitudId";
        campoSolicitud.value = solicitudId;

        formularioOculto.appendChild(campoDatos);
        formularioOculto.appendChild(campoSolicitud);

        document.body.appendChild(iframe);
        document.body.appendChild(formularioOculto);

        let terminado = false;

        function limpiar() {
            window.removeEventListener("message", recibirRespuesta);

            formularioOculto.remove();
            iframe.remove();
        }

        function finalizar(error, resultado) {
            if (terminado) return;

            terminado = true;

            clearTimeout(limiteTiempo);
            limpiar();

            if (error) {
                reject(error);
            } else {
                resolve(resultado);
            }
        }

        /* RECIBIR RESPUESTA DE GOOGLE APPS SCRIPT */

        function recibirRespuesta(event) {

            const origenesPermitidos = [
                "https://script.google.com",
                "https://script.googleusercontent.com"
            ];

            if (
                event.source !== iframe.contentWindow ||
                !origenesPermitidos.includes(event.origin)
            ) {
                return;
            }

            let respuesta = event.data;

            if (typeof respuesta === "string") {
                try {
                    respuesta = JSON.parse(respuesta);
                } catch (error) {
                    return;
                }
            }

            if (
                !respuesta ||
                respuesta.tipo !== "GUHU_RESPUESTA" ||
                respuesta.solicitudId !== solicitudId ||
                !respuesta.resultado
            ) {
                return;
            }

            finalizar(null, respuesta.resultado);
        }

        window.addEventListener("message", recibirRespuesta);

        const limiteTiempo = setTimeout(() => {
            finalizar(
                new Error(
                    "No recibimos respuesta de Google Apps Script. " +
                    "Tu solicitud conserva su identificador para evitar " +
                    "registrarla dos veces. Revisa la hoja pedidos antes " +
                    "de volver a intentarlo."
                )
            );
        }, 45000);

        formularioOculto.submit();
    });
}

/* ==============================
   ENVIAR FORMULARIO
============================== */

if (formulario && botonConfirmar) {

    formulario.addEventListener("submit", async function(event) {

        event.preventDefault();

        const productos = leerCarrito();

        if (productos.length === 0) {
            alert("Tu carrito está vacío.");
            window.location.href = "menu.html";
            return;
        }

        /* VALIDAR PRODUCTOS */

        const productosInvalidos = productos.some(producto =>
            !producto.id ||
            !["Gelatinas", "Especiales", "Pay"].includes(producto.categoria) ||
            !Number.isInteger(Number(producto.cantidad)) ||
            Number(producto.cantidad) < 1 ||
            !Number.isFinite(Number(producto.precio)) ||
            Number(producto.precio) < 0
        );

        if (productosInvalidos) {
            alert(
                "Hay productos con información incompleta. " +
                "Vacía el carrito y vuelve a agregar los productos desde el menú."
            );
            return;
        }

        /* DATOS DEL COMPRADOR */

        const datos = {
            nombre: document.getElementById("nombre").value.trim(),
            edad: document.getElementById("edad").value,
            telefono: document.getElementById("telefono").value.trim(),
            correo: document.getElementById("correo").value.trim(),
            articulos: obtenerArticulos(productos)
        };

        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        if (
            datos.nombre.length < 2 ||
            datos.nombre.length > 100 ||
            !/^[0-9]{10}$/.test(datos.telefono) ||
            datos.correo.length > 254
        ) {
            alert("Revisa que el nombre, teléfono y correo sean válidos.");
            return;
        }

        /* EVITAR DOBLE CLIC */

        botonConfirmar.disabled = true;
        botonConfirmar.textContent = "Registrando tu pedido...";

        const solicitudId = obtenerSolicitudId(datos);

        try {

            const resultado = await enviarPedido(datos, solicitudId);

            if (!resultado || !resultado.success) {
                throw new Error(
                    resultado?.error ||
                    "Google no pudo registrar tu pedido."
                );
            }

            /* PEDIDO REGISTRADO CORRECTAMENTE */

            const total = Number.isFinite(Number(resultado.total))
                ? Number(resultado.total)
                : calcularTotal(productos);

            const mensaje = crearMensaje(
                datos,
                productos,
                resultado.pedido,
                total
            );

            const enlaceWhatsApp =
                `https://wa.me/${WHATSAPP_GUHU}?text=${encodeURIComponent(mensaje)}`;

            limpiarSolicitudPendiente();

            alert(
                `¡Tu pedido ${resultado.pedido} se registró correctamente!`
            );

            window.location.href = enlaceWhatsApp;

        } catch (error) {

            console.error("ERROR AL REGISTRAR PEDIDO:", error);

            alert(
                "No pudimos confirmar la respuesta del pedido.\n\n" +
                "Detalle:\n" + error.message +
                "\n\nNo borres tu carrito ni vuelvas a generar otro pedido. " +
                "Primero revisaremos la hoja pedidos."
            );

            botonConfirmar.disabled = false;

            botonConfirmar.textContent =
                "Confirmar mis datos y continuar →";
        }
    });

} else {
    console.error(
        "No se encontró el formulario o el botón de confirmar pedido."
    );
}

/* ==============================
   INICIAR
============================== */

document.addEventListener("DOMContentLoaded", verificarCarrito);
