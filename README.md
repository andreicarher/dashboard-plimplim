# Plim Plim — Paid Media Dashboard

Dashboard de paid media en **tiempo real** conectado al Meta Marketing API. Cada carga de página
llama directamente a la Graph API de Meta (sin base de datos intermedia), agrega por país y por
objetivo (Show / Nueva App / Canal WA), y muestra KPIs, un gráfico de gasto por país y una tabla
de detalle.

## Por qué está estructurado así

- **El token de Meta nunca toca el navegador.** Todas las llamadas a la Graph API viven en
  `app/api/meta-insights/route.ts`, que corre server-side en Vercel. El cliente solo llama a
  `/api/meta-insights`, nuestro propio endpoint.
- **La clasificación por país prioriza el nombre completo sobre el código de 2-3 letras**
  (ver `lib/classify.ts`). Esto es importante porque en la cuenta real de Plim Plim conviven
  códigos inconsistentes (Chile aparece como `CH`, `CHI` y `CL`; México como `MX` y `MEX`; Perú y
  Paraguay pueden confundirse vía `PA`/`PER`/`PY`). Si una campaña no matchea ni por nombre ni por
  prefijo, cae en "Sin clasificar" — nunca se le asigna un país a la fuerza.

## Setup local

```bash
npm install
cp .env.local.example .env.local
```

Edita `.env.local` con:

```
META_ACCESS_TOKEN=<tu token de System User con permiso ads_read>
META_AD_ACCOUNT_ID=1028672954641198
```

> **Cómo generar el token:** Meta Business Manager → System Users → tu system user → Generate
> Token → seleccionar el ad account de Plim Plim → permiso `ads_read`. Usa un System User (no tu
> usuario personal) para que el token no expire cada 60 días.

Corre en local:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Subir a tu repo de GitHub

Ya tienes un repo vacío listo. Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Initial commit: Plim Plim paid media dashboard"
git branch -M main
git remote add origin <URL_DE_TU_REPO_VACIO>
git push -u origin main
```

## Desplegar en Vercel

1. En [vercel.com/new](https://vercel.com/new), importa el repo que acabas de subir.
2. En **Environment Variables**, agrega `META_ACCESS_TOKEN` y `META_AD_ACCOUNT_ID` (los mismos
   valores de tu `.env.local`, pero **nunca subas ese archivo al repo** — ya está en `.gitignore`).
3. Deploy. Cada push a `main` vuelve a desplegar automáticamente.

## Estructura

```
app/
  page.tsx                    → renderiza el Dashboard
  api/meta-insights/route.ts  → endpoint server-side que llama a Meta y clasifica los datos
lib/
  metaApi.ts                  → cliente de la Graph API (fetch + paginación)
  classify.ts                 → clasificación por país y objetivo (ver nota arriba)
components/
  Dashboard.tsx                → estado, fetch, agregaciones y layout general
  KpiCard.tsx / CountryTable.tsx → piezas de UI
```

## Setup de Google Analytics 4

El dashboard trae métricas de GA4 vía el **Reporting API estándar** (`runReport`), no el
Realtime API — el Realtime de GA4 solo soporta 3-4 métricas (usuarios activos, vistas, eventos)
sobre los últimos 30 minutos. El resto de las métricas pedidas (bounce rate, sessions, purchase
revenue, first time purchasers, etc.) no existen en Realtime, así que este dashboard usa datos
intradía (procesados en un plazo de horas, no al instante) para poder traer el set completo.

Pasos para conectar tu propiedad de GA4:

1. **Crear una cuenta de servicio en Google Cloud**:
   - Ve a [console.cloud.google.com](https://console.cloud.google.com) → crea un proyecto (o usa uno existente)
   - Habilita la **Google Analytics Data API** (Library → busca "Analytics Data API" → Enable)
   - Ve a **IAM & Admin → Service Accounts → Create Service Account**
   - Dale un nombre (ej. `plimplim-dashboard`), no necesita roles de Cloud
   - Una vez creada, entra a la cuenta de servicio → **Keys → Add key → Create new key → JSON**
   - Se descarga un archivo `.json` — de ahí sacas `client_email` y `private_key`

2. **Dar acceso a la propiedad de GA4**:
   - En Google Analytics → Admin → **Property Access Management**
   - Add users → pega el email de la cuenta de servicio (el que termina en `.iam.gserviceaccount.com`)
   - Rol: **Viewer** (alcanza, es solo lectura)

3. **Variables de entorno** (local y en Vercel):
   - `GA4_PROPERTY_ID`: el ID numérico de tu propiedad (Admin → Property Settings)
   - `GA4_CLIENT_EMAIL`: el `client_email` del JSON descargado
   - `GA4_PRIVATE_KEY`: el `private_key` del JSON, completo (incluye `-----BEGIN PRIVATE KEY-----`).
     En Vercel, pégalo tal cual con los `\n` literales — la librería los convierte automáticamente.

Si GA4 no responde, el dashboard sigue funcionando igual con los datos de Meta — solo muestra un
aviso con el mensaje de error en vez del panel de GA4.

## Métricas por línea de negocio

Las tarjetas de KPI cambian según qué línea de negocio tienes seleccionada en el sidebar:

- **App**: Inversión, Alcance, Descargas, Compras en la app, Valor de las compras, ROAS
- **Shows**: Inversión ARS, Inversión USD, Alcance, Impresiones, Frecuencia, CPM ARS, CPM USD, Clics, CTR, Landing page views, Compras
- **Canal WA**: Inversión, Alcance, Impresiones, CPM, CTR, Frecuencia, Visitas a la página
- **Campañas Temporada / Todos**: Inversión, Alcance, Impresiones, CPM, CTR, Frecuencia

**Nota sobre CTR, CPM y Frecuencia**: se calculan a partir de las sumas crudas (spend, impresiones,
clicks, reach) después de agregar todas las campañas y semanas — nunca promediando promedios ya
calculados. Promediar un CTR semanal con otro CTR semanal da un número distinto (y menos preciso)
que recalcularlo desde los totales.

**Nota sobre Alcance (reach)**: Meta no expone un "alcance único" deduplicado cuando se suman
múltiples campañas o semanas — el número que ves es la suma de alcances por campaña/semana, así
que una misma persona alcanzada por dos campañas distintas puede contarse más de una vez. Es una
métrica direccional, no un conteo de personas únicas reales.

## Próximos pasos sugeridos

- Agregar breakdown por semana ISO (ya tienes esa lógica en tu Sheet actual) usando
  `time_increment=7` — el endpoint ya lo trae desagregado, falta agruparlo en el front.
- Si más adelante quieres histórico (no solo lo que Meta permite consultar en vivo), se puede
  agregar un cron job de Vercel + una base de datos — quedó descartado por ahora porque pediste
  datos en vivo, pero es un cambio incremental si cambia la necesidad.
- Revisar y corregir en Meta Ads Manager los nombres de campaña que caen en "Sin clasificar" o con
  ⚠ baja confianza, para que la nomenclatura futura sea 100% consistente.
