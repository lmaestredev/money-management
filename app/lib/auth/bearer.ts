import { createHash, timingSafeEqual } from 'node:crypto';

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * Valida el header Authorization: Bearer <secret> y falla cerrado: si el secreto
 * esperado no está configurado (o está vacío) responde 500 en vez de dejar pasar.
 * Devuelve null si la autorización es válida, o la Response de error a retornar.
 */
export function requireBearerSecret(
  request: Request,
  expectedSecret: string | undefined
): Response | null {
  if (!expectedSecret) {
    console.error('Auth secret not configured: rejecting request');
    return Response.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  // Se comparan hashes para igualar largos y evitar timing attacks.
  if (!token || !timingSafeEqual(sha256(token), sha256(expectedSecret))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
