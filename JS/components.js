
async function cargarComponente(ruta, selector, idContenedor) {
    const contenedor = document.getElementById(idContenedor);

    if (!contenedor) {
        console.warn(`No se encontró el contenedor: ${idContenedor}`);
        return;
    }

    try {
        const respuesta = await fetch(ruta);

        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar ${ruta}`);
        }

        const html = await respuesta.text();
        const documento = new DOMParser().parseFromString(html, "text/html");
        const componente = documento.querySelector(selector);

        if (!componente) {
            throw new Error(`No se encontró ${selector} en ${ruta}`);
        }

        contenedor.replaceChildren(
            document.importNode(componente, true)
        );
    } catch (error) {
        console.error("Error al cargar el componente:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarComponente("header.html", "header", "contenedor-header");
    cargarComponente("footer.html", "footer", "contenedor-footer");
});
