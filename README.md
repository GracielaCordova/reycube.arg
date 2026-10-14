# ReyCube.Arg — tienda online

Tienda de cubos Rubik con carrito (pedidos por mail o Instagram), catálogo con stock real y un **panel del equipo** para cargar precios, stock, fotos y registrar ventas. Pensada para subirse gratis a **Vercel** desde **GitHub**, sin instalar nada.

## Qué hay en la carpeta

| Carpeta / archivo | Para qué sirve |
|---|---|
| `index.html`, `assets/` | La tienda (diseño, carrito, panel) |
| `img/productos/` | 37 fotos del catálogo, ya recortadas y con fondo limpio |
| `data/catalog.json` | Catálogo inicial (sale del sitio de Google de ReyCube) |
| `api/` | Funciones de Vercel: login, catálogo, ventas y fotos |
| `lib/` | Código compartido de las funciones |
| `.env.example` | Variables que hay que cargar en Vercel |

## Subirlo (una sola vez, ~10 minutos)

1. **GitHub** → creá un repositorio nuevo (puede ser privado), por ejemplo `reycube-arg`, y subí **todo el contenido de esta carpeta** (botón *Add file → Upload files*, arrastrás todo y *Commit*).
2. **Vercel** → *Add New → Project* → elegí el repo `reycube-arg` → *Framework Preset: Other* → **Deploy**. No hace falta tocar Build ni Output.
3. **Usuario y contraseña del equipo** → en Vercel: *Project → Settings → Environment Variables* y agregá:
   - `ADMIN_USER` = `Agustin`
   - `ADMIN_PASS` = `Cubos2026`
   - `SESSION_SECRET` = una frase larga cualquiera (ej.: `rey-cube-dorado-2026-patricios`)
4. **Dónde se guardan los datos** (precios, stock, fotos y ventas). Elegí una de las dos opciones:
   - **A. Google Sheets** (recomendado si querés editar desde una planilla): seguí la sección *Google Sheets* de abajo.
   - **B. Upstash Redis**: en Vercel, *Project → Storage → Create Database → Upstash for Redis → Free* → conectala al proyecto, con el *Custom Prefix* vacío.

   Si cargás las dos, se usa Google Sheets.
5. *Deployments → ⋯ → Redeploy* para que tome las variables. Listo.

> Sin el paso 4 la tienda se ve igual, pero el panel avisa que no puede guardar.

## Google Sheets como base de datos

Con esta opción, la planilla es la base de datos. Agustín puede cambiar precio, stock, "nuevo" u "oculto" directo en la pestaña **Productos**, también desde el celular, y la tienda se actualiza en menos de un minuto. El panel sigue funcionando igual y escribe en la misma planilla. Las ventas quedan en la pestaña **Ventas** y las fotos que se suben desde el panel van a una carpeta de tu Drive.

1. Creá una planilla nueva en Google Sheets, por ejemplo *ReyCube.Arg - Tienda*.
2. **Extensiones → Apps Script**. Borrá lo que haya, pegá el contenido completo de `google-sheets/Codigo.gs` y guardá.
3. Arriba, elegí la función **instalar** y tocá **Ejecutar**. Google te pide permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a … (no seguro) → Permitir*. Es tu propio script, por eso Google lo marca así. Se crean las pestañas Productos, Ventas y Ajustes con los 37 productos.
4. **Implementar → Nueva implementación → ⚙ → Aplicación web**. En *Ejecutar como* elegí **Yo** y en *Quién tiene acceso* elegí **Cualquier usuario**. Tocá **Implementar** y copiá la **URL de la aplicación web**, la que termina en `/exec`.
5. En Vercel, *Settings → Environment Variables*, agregá:
   - `GSHEET_URL` = la URL del paso 4
   - `GSHEET_SECRET` = la misma clave que figura en `CLAVE` al principio de `Codigo.gs`
6. **Redeploy**.

**Cómo se edita la planilla:** no cambies la columna `id` ni los títulos de la primera fila. En `nuevo` y `oculto` va **SI** o **NO**. En `caracteristicas` va una por línea, con el formato `Nombre: descripción`. Para agregar un producto, completá una fila nueva al final: si dejás el `id` vacío, se arma solo a partir del nombre.

**Pestañas privadas de la planilla**: *Costos*, *Interes* (consultas de clientes), *Privado* (días de entrega y de stock) y *Ventas*. Ninguna llega a la tienda pública.

**Si ya habías instalado una versión anterior del script**: pegá el `Codigo.gs` nuevo, ejecutá **instalar** otra vez (agrega las pestañas nuevas sin borrar nada) y publicá una nueva versión como se explica abajo.

**Si cambiás el código del script** después de implementarlo: *Implementar → Administrar implementaciones → ✏ → Versión: Nueva versión → Implementar*. La URL sigue siendo la misma.

## Usar el panel

Al pie de la página, al lado de Instagram, está **Acceso equipo**. Con el usuario y la contraseña de arriba se abre el panel:

- **Productos y stock**: precio, stock, marcar como *Nuevo*, ocultar un producto, cambiar la foto o agregar productos nuevos. Después tocá **Guardar y publicar**.
  - Precio en `0` → la tienda muestra *Consultá el precio* y un botón que arma el mensaje para Instagram.
  - Stock en `0` → *Sin stock por ahora* con botón *Avisame*.
- **Fotos**: hasta 8 por producto. En la tienda, al pasar el mouse por un cubo se ve la segunda foto, y en la ficha hay una galería con flechas (en el celular se desliza con el dedo). En el panel, ★ elige la principal y × quita una foto.
- **Costo** (columna en Productos y stock): es privado. Nunca se envía a la tienda pública; solo lo ve el panel.
- **Ganancias**: ganancia y margen del mes, plata invertida en stock, ganancia si vendés todo, gráfico de ingresos contra ganancia por mes y el margen de cada producto. Cada venta guarda el costo que tenía ese día, así los números viejos no cambian si después cambia el costo.
- **Qué comprar**: sugiere cuántas unidades pedir de cada producto. Mira lo vendido en los últimos 60 días y calcula lo necesario para cubrir el tiempo que tarda en llegar tu pedido más los días de stock que querés tener (los dos se configuran ahí mismo), y le resta el stock. También cuenta las consultas: cada vez que alguien toca *Consultar* o *Avisame* en un producto se suma 1, sin guardar datos de la persona. Si algo nunca se vendió pero lo consultan, sugiere probar con pocas unidades.
- **Registrar venta**: cuando confirmás un pedido, cargalo acá. Se suma a los ingresos y (si dejás tildado) descuenta el stock.
- **Ventas e ingresos**: ingresos del mes, del día, total histórico, lo más vendido y qué reponer.
- **Editar página**: cambia los textos y las secciones de la tienda sin tocar código.
  - *Aviso arriba de todo*: una franja azul para promos o novedades, con link opcional.
  - *Portada*: título, la parte en azul, el texto y las etiquetas.
  - *¿Qué cubo elijo?*: los niveles (nombre, promedio y descripción) y qué cubos se recomiendan en cada uno. Se eligen de una lista, se ordenan con ‹ y se quitan con ×. Se pueden agregar o quitar niveles.
  - *Tips* y *Novedades*: todos sus textos, y los tips se pueden agregar o quitar.
  - Cada sección se puede mostrar u ocultar, incluida *Campeonatos WCA*.
  - *Ver cómo queda* muestra la tienda con los cambios antes de guardarlos, y *volvé a los textos originales* deshace todo.
- **Datos legales**: titular, CUIT y domicilio. No se muestran en el pie: se usan dentro de los Términos y la Política de privacidad.

La sesión dura 7 días en ese navegador. Para cambiar la contraseña, cambiá `ADMIN_PASS` en Vercel y hacé *Redeploy*.

## Antes de publicar

- **Precios**: el sitio de Google no tenía precios, así que todos arrancan en *Consultá el precio*. Cargalos desde el panel.
- **Stock**: se tomó de "Unidades disponibles" del sitio de Google. Los que no tenían ese dato arrancan en 0.
- **Legal (Argentina)**: el link a *Defensa de las y los Consumidores* quedó dentro de *Términos y condiciones* y se mantiene el *Botón de arrepentimiento* al pie. Completá los datos del vendedor en el panel.

## Probarlo en tu compu (opcional)

Con [Vercel CLI](https://vercel.com/docs/cli): `npx vercel dev` dentro de esta carpeta, con un archivo `.env` copiado de `.env.example`.
