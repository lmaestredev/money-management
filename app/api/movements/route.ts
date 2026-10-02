import { requireBearerSecret } from '@/app/lib/auth/bearer';
import { movementApiSchema } from '@/app/lib/validation';
import {
  createMovement,
  fetchMovementsByPeriod,
} from '@/app/lib/data/movements';

function getExpectedSecret(): string | undefined {
  return process.env.TELEGRAM_BOT_SECRET || process.env.API_SECRET || undefined;
}

function getBotUserId(): string {
  const id = process.env.BOT_USER_ID;
  if (!id) throw new Error('BOT_USER_ID env var not set');
  return id;
}

export async function POST(request: Request) {
  const denied = requireBearerSecret(request, getExpectedSecret());
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = movementApiSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const botUserId = getBotUserId();
    const movement = await createMovement(
      { ...parsed.data, source: 'telegram' },
      botUserId,
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
  const denied = requireBearerSecret(request, getExpectedSecret());
  if (denied) return denied;

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
    const botUserId = getBotUserId();
    const movements = await fetchMovementsByPeriod(period, botUserId);
    return Response.json({ movements });
  } catch (err) {
    console.error('Fetch movements error:', err);
    return Response.json(
      { error: 'Failed to fetch movements' },
      { status: 500 }
    );
  }
}
