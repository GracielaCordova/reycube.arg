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
4. **Base de datos gratis** (para que se guarden precios, stock, fotos y ventas) → en Vercel: *Project → Storage → Create Database → Upstash (Redis) → plan Free* → conectala al proyecto. Vercel agrega solas las variables `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (o `KV_REST_API_URL` / `KV_REST_API_TOKEN`; sirven las dos).
5. *Deployments → ⋯ → Redeploy* para que tome las variables. Listo.

> Sin el paso 4 la tienda se ve igual, pero el panel avisa que no puede guardar.

## Usar el panel

Al pie de la página, al lado de Instagram, está **Acceso equipo**. Con el usuario y la contraseña de arriba se abre el panel:

- **Productos y stock**: precio, stock, marcar como *Nuevo*, ocultar un producto, cambiar la foto o agregar productos nuevos. Después tocá **Guardar y publicar**.
  - Precio en `0` → la tienda muestra *Consultá el precio* y un botón que arma el mensaje para Instagram.
  - Stock en `0` → *Sin stock por ahora* con botón *Avisame*.
- **Registrar venta**: cuando confirmás un pedido, cargalo acá. Se suma a los ingresos y (si dejás tildado) descuenta el stock.
- **Ventas e ingresos**: ingresos del mes, del día, total histórico, lo más vendido y qué reponer.
- **Datos legales**: titular, CUIT y domicilio. No se muestran en el pie: se usan dentro de los Términos y la Política de privacidad.

La sesión dura 7 días en ese navegador. Para cambiar la contraseña, cambiá `ADMIN_PASS` en Vercel y hacé *Redeploy*.

## Antes de publicar

- **Precios**: el sitio de Google no tenía precios, así que todos arrancan en *Consultá el precio*. Cargalos desde el panel.
- **Stock**: se tomó de "Unidades disponibles" del sitio de Google. Los que no tenían ese dato arrancan en 0.
- **Legal (Argentina)**: el link a *Defensa de las y los Consumidores* quedó dentro de *Términos y condiciones* y se mantiene el *Botón de arrepentimiento* al pie. Completá los datos del vendedor en el panel.

## Probarlo en tu compu (opcional)

Con [Vercel CLI](https://vercel.com/docs/cli): `npx vercel dev` dentro de esta carpeta, con un archivo `.env` copiado de `.env.example`.
