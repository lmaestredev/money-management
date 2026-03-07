// Tipos para la app de finanzas personales.

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

// Temporal para utils (generateYAxis).
export type Revenue = {
  month: string;
  revenue: number;
};

// Cuentas bancarias
export type Account = {
  id: string;
  name: string;
  balance_pesos: number;
  balance_dollars: number;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountInsert = {
  name: string;
  balance_pesos?: number;
  balance_dollars?: number;
  user_id?: string | null;
};

// Movimientos
export type RecordType =
  | 'income'
  | 'conversion'
  | 'variable_payment'
  | 'fixed_payment';

export type MovementSource = 'app' | 'telegram' | 'import';

export type Movement = {
  id: string;
  period: string;
  record_type: RecordType;
  account_id: string;
  description: string | null;
  status: boolean | null;
  amount_pesos: number;
  amount_dollars: number;
  payment_date: string | null;
  dollar_rate: number | null;
  exchange_rate: number | null;
  comment: string | null;
  created_at: string;
  user_id: string | null;
  source: MovementSource | null;
};

export type MovementInsert = {
  period: string;
  record_type: RecordType;
  account_id: string;
  description?: string | null;
  status?: boolean | null;
  amount_pesos: number;
  amount_dollars: number;
  payment_date?: string | null;
  dollar_rate?: number | null;
  exchange_rate?: number | null;
  comment?: string | null;
  user_id?: string | null;
  source?: MovementSource | null;
};
