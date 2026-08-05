import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const ExtractedExpenseSchema = z.object({
  amount: z.number().nullable(),
  currency_guess: z.enum(['ARS', 'USD']).nullable(),
  merchant: z.string().nullable(),
  date: z.string().nullable(),
  account_id: z.string().nullable(),
  credit_card_id: z.string().nullable(),
});

export type ExtractedExpense = z.infer<typeof ExtractedExpenseSchema>;

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

export function isSupportedImageType(mimeType: string): mimeType is SupportedImageType {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

export type NamedOption = { id: string; name: string };

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Falta ANTHROPIC_API_KEY en las variables de entorno.');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// JSON Schema crudo en vez del helper zodOutputFormat: ese helper requiere
// Zod v4 en sus tipos internos, y este proyecto está en Zod v3. La respuesta
// igual se valida en runtime con ExtractedExpenseSchema.parse() más abajo.
// El enum de account_id/credit_card_id se arma con los IDs reales del
// usuario: así el modelo solo puede devolver un ID que existe (o null),
// nunca uno inventado.
function buildOutputSchema(accounts: NamedOption[], cards: NamedOption[]) {
  const accountIdProp =
    accounts.length > 0
      ? { anyOf: [{ type: 'string', enum: accounts.map((a) => a.id) }, { type: 'null' }] }
      : { type: 'null' as const };
  const cardIdProp =
    cards.length > 0
      ? { anyOf: [{ type: 'string', enum: cards.map((c) => c.id) }, { type: 'null' }] }
      : { type: 'null' as const };

  return {
    type: 'object',
    properties: {
      amount: {
        anyOf: [{ type: 'number' }, { type: 'null' }],
        description: 'Monto total de la compra, como número, sin separadores de miles ni símbolo de moneda.',
      },
      currency_guess: {
        anyOf: [{ type: 'string', enum: ['ARS', 'USD'] }, { type: 'null' }],
        description: 'Moneda del comprobante si se puede inferir de símbolos o texto (ej. "US$", "u$s", "USD" => USD; "$" en un ticket argentino => ARS).',
      },
      merchant: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'Nombre del comercio, o una descripción breve de la compra si no hay nombre de comercio visible.',
      },
      date: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'Fecha de la compra en formato YYYY-MM-DD, solo si es claramente visible en la imagen.',
      },
      account_id: {
        ...accountIdProp,
        description: 'ID de la cuenta que coincide con el medio de pago mencionado en el contexto (si se menciona una cuenta, no una tarjeta de crédito). null si no aplica.',
      },
      credit_card_id: {
        ...cardIdProp,
        description: 'ID de la tarjeta de crédito que coincide con el medio de pago mencionado en el contexto (ej. "pagué con visa bbva"). null si no aplica.',
      },
    },
    required: ['amount', 'currency_guess', 'merchant', 'date', 'account_id', 'credit_card_id'],
    additionalProperties: false,
  } as const;
}

function buildOptionsList(label: string, options: NamedOption[]): string {
  if (options.length === 0) return `${label}: (el usuario no tiene ninguna registrada)`;
  return `${label}:\n${options.map((o) => `- id="${o.id}": ${o.name}`).join('\n')}`;
}

/**
 * Extrae el monto y datos básicos de un ticket/comprobante a partir de una
 * imagen, opcionalmente combinado con texto de contexto libre (ej. "pagué
 * con la tarjeta Visa BBVA") para matchear la cuenta/tarjeta real del
 * usuario. No persiste la imagen en ningún lado; solo se envía a la API
 * para el análisis puntual de este request.
 */
export async function extractExpenseFromImage(
  base64Data: string,
  mediaType: SupportedImageType,
  context: string,
  accounts: NamedOption[],
  cards: NamedOption[]
): Promise<ExtractedExpense> {
  const promptParts = [
    'Este es un ticket o comprobante de un gasto. Extraé el monto total de la compra, la moneda si se puede inferir, el comercio (o una descripción breve si no hay nombre de comercio), y la fecha si es visible.',
    '',
    'Además, el usuario puede haber escrito una aclaración sobre cómo pagó (ej. "pagué con la tarjeta Visa BBVA" o "con la cuenta Santander"). Si el contexto menciona una forma de pago, matcheala contra esta lista de cuentas y tarjetas reales del usuario y devolvé el id correspondiente en account_id o credit_card_id (nunca ambos). Si el contexto no menciona nada de pago o no coincide con ninguna, dejá los dos en null.',
    '',
    buildOptionsList('Cuentas', accounts),
    buildOptionsList('Tarjetas de crédito', cards),
  ];
  if (context.trim()) {
    promptParts.push('', `Contexto escrito por el usuario: "${context.trim()}"`);
  }

  const response = await getClient().messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Data },
          },
          {
            type: 'text',
            text: promptParts.join('\n'),
          },
        ],
      },
    ],
    output_config: {
      format: { type: 'json_schema', schema: buildOutputSchema(accounts, cards) },
    },
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No se pudo interpretar la imagen.');
  }
  return ExtractedExpenseSchema.parse(JSON.parse(textBlock.text));
}
