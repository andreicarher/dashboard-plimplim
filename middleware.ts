import { NextRequest, NextResponse } from 'next/server';

/**
 * Protege TODO el dashboard (páginas y API routes) con autenticación básica
 * HTTP — el navegador muestra su cuadro nativo de usuario/contraseña antes
 * de dejar pasar cualquier request.
 *
 * Si DASHBOARD_USER o DASHBOARD_PASSWORD no están configuradas, el middleware
 * NO bloquea nada (deja pasar todo) — esto es a propósito, para que nadie
 * quede accidentalmente afuera de su propio dashboard por olvidarse de
 * configurar las variables de entorno. Para activar la protección, hay que
 * configurar ambas variables en Vercel.
 */
export function middleware(req: NextRequest) {
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASSWORD;

  if (!user || !pass) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get('authorization');

  if (authHeader?.startsWith('Basic ')) {
    const base64Credentials = authHeader.slice('Basic '.length);
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const separatorIndex = decoded.indexOf(':');
    const providedUser = decoded.slice(0, separatorIndex);
    const providedPass = decoded.slice(separatorIndex + 1);

    if (providedUser === user && providedPass === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Autenticación requerida', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Plim Plim Dashboard", charset="UTF-8"',
    },
  });
}

// Protege todo excepto los archivos estáticos internos de Next.js.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
