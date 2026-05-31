import { refreshExchangeRates } from '@/app/lib/data/exchange-rates';

export const dynamic = 'force-dynamic';

/**
 * Refresca las cotizaciones desde dolarapi. La pega el Vercel Cron (11:00 y
 * 17:00 ART → 14:00 y 20:00 UTC). Si CRON_SECRET está definido, exige el header
 * Authorization: Bearer <CRON_SECRET> (Vercel lo envía automáticamente).
 */
async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

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
