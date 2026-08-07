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

## Próximos pasos sugeridos

- Agregar breakdown por semana ISO (ya tienes esa lógica en tu Sheet actual) usando
  `time_increment=7` — el endpoint ya lo trae desagregado, falta agruparlo en el front.
- Si más adelante quieres histórico (no solo lo que Meta permite consultar en vivo), se puede
  agregar un cron job de Vercel + una base de datos — quedó descartado por ahora porque pediste
  datos en vivo, pero es un cambio incremental si cambia la necesidad.
- Revisar y corregir en Meta Ads Manager los nombres de campaña que caen en "Sin clasificar" o con
  ⚠ baja confianza, para que la nomenclatura futura sea 100% consistente.
