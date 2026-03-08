import { z } from 'zod';
import {
  createMovement,
  fetchMovementsByPeriod,
} from '@/app/lib/data/movements';

const recordTypeSchema = z.enum([
  'income',
  'conversion',
  'variable_payment',
  'fixed_payment',
]);

const createMovementSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'period must be YYYY-MM'),
  record_type: recordTypeSchema,
  account_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.boolean().optional().nullable(),
  amount_pesos: z.number(),
  amount_dollars: z.number(),
  payment_date: z.string().optional().nullable(),
  dollar_rate: z.number().optional().nullable(),
  exchange_rate: z.number().optional().nullable(),
  comment: z.string().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
});

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const expectedToken = process.env.TELEGRAM_BOT_SECRET ?? process.env.API_SECRET;
  if (expectedToken && token !== expectedToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createMovementSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const movement = await createMovement(
      { ...parsed.data, source: 'telegram' },
      'telegram'
    );
    return Response.json({ id: movement.id, movement }, { status: 201 });
  } catch (err) {
    console.error('Create movement error:', err);
    return Response.json(
      { error: 'Failed to create movement' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const token = getBearerToken(request);
  const expectedToken = process.env.TELEGRAM_BOT_SECRET ?? process.env.API_SECRET;
  if (expectedToken && token !== expectedToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period');
  if (!period) {
    return Response.json(
      { error: 'Query parameter period (YYYY-MM) is required' },
      { status: 400 }
    );
  }
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return Response.json({ error: 'period must be YYYY-MM' }, { status: 400 });
  }

  try {
    const movements = await fetchMovementsByPeriod(period);
    return Response.json({ movements });
  } catch (err) {
    console.error('Fetch movements error:', err);
    return Response.json(
      { error: 'Failed to fetch movements' },
      { status: 500 }
    );
  }
}
