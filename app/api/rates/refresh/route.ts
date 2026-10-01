import { requireBearerSecret } from '@/app/lib/auth/bearer';
import { refreshExchangeRates } from '@/app/lib/data/exchange-rates';

export const dynamic = 'force-dynamic';

/**
 * Refresca las cotizaciones desde dolarapi. La pega el Vercel Cron (11:00 y
 * 17:00 ART → 14:00 y 20:00 UTC). Exige CRON_SECRET: sin él responde error, y con él
 * requiere Authorization: Bearer <CRON_SECRET> (Vercel lo envía automáticamente).
 */
async function handle(request: Request): Promise<Response> {
  const denied = requireBearerSecret(request, process.env.CRON_SECRET);
  if (denied) return denied;

  const result = await refreshExchangeRates();
  if (!result.ok) {
    return Response.json(result, { status: 502 });
  }
  return Response.json(result);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
