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

// Personas del hogar (dueños de cuentas; base del reporte mensual por persona)
export type Person = {
  id: string;
  name: string;
  sort_order: number;
};

// Cuentas bancarias
export type AccountCurrency = 'peso' | 'dollar' | 'crypto';

export type Account = {
  id: string;
  name: string;
  bank: string | null;
  currency: AccountCurrency;
  balance_pesos: number;
  balance_dollars: number;
  user_id: string | null;
  owner_id: string | null;
  owner_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountInsert = {
  name: string;
  bank?: string | null;
  currency?: AccountCurrency;
  balance_pesos?: number;
  balance_dollars?: number;
  user_id?: string | null;
  owner_id?: string | null;
};

// Tarjetas de crédito
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'otra';

export type CreditCard = {
  id: string;
  name: string;
  bank: string | null;
  brand: CardBrand | null;
  currency: AccountCurrency;
  credit_limit: number;
  closing_day: number | null;
  due_day: number | null;
  current_balance_pesos: number;
  current_balance_dollars: number;
  owner_id: string | null;
  owner_name?: string | null;
  active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CreditCardInsert = {
  name: string;
  bank?: string | null;
  brand?: CardBrand | null;
  currency?: AccountCurrency;
  credit_limit?: number;
  closing_day?: number | null;
  due_day?: number | null;
  current_balance_pesos?: number;
  current_balance_dollars?: number;
  owner_id?: string | null;
  active?: boolean;
  user_id?: string | null;
};

// Resúmenes (estados de cuenta) por ciclo de facturación
export type StatementStatus = 'open' | 'closed' | 'paid';

export type CardStatement = {
  id: string;
  credit_card_id: string;
  period: string;
  closing_date: string | null;
  due_date: string | null;
  total_pesos: number;
  total_dollars: number;
  status: StatementStatus;
  paid_movement_id: string | null;
  created_at: string;
  updated_at: string;
};

// Períodos financieros personalizados
export type FinancialPeriodStatus = 'open' | 'closed';

export type FinancialPeriod = {
  id: string;
  start_date: string;  // ISO date "YYYY-MM-DD"
  end_date: string | null;
  status: FinancialPeriodStatus;
  closed_at: string | null;
  created_at: string;
};

// Configuración (presupuestos + preferencias de tasa de cambio)
export type RateSource = 'blue' | 'oficial';

export type AppSettings = {
  budget_total_usd: number;
  budget_variable_usd: number;
  rate_source: RateSource;
  manual_rate_enabled: boolean;
  manual_rate_value: number | null;
};

export type SettingsUpdate = Partial<AppSettings>;

// Cotización del dólar (una fila por casa)
export type ExchangeRate = {
  source: RateSource;
  compra: number;
  venta: number;
  source_updated_at: string | null;
  updated_at: string;
};

// Categorías
export type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export type CategoryInsert = {
  name: string;
  sort_order?: number;
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
  financial_period_id: string;
  record_type: RecordType;
  account_id: string | null;
  credit_card_id?: string | null;
  statement_id?: string | null;
  category_id: string | null;
  category_name?: string | null;
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
  installment_id?: string | null;
  recurring_expense_id?: string | null;
  recurring_income_id?: string | null;
};

export type MovementInsert = {
  period: string;
  /** Opcional: createMovement auto-asigna el período financiero activo si no se provee. */
  financial_period_id?: string;
  record_type: RecordType;
  account_id?: string | null;
  credit_card_id?: string | null;
  statement_id?: string | null;
  category_id?: string | null;
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
  installment_id?: string | null;
  recurring_expense_id?: string | null;
  recurring_income_id?: string | null;
};

// Compras en cuotas
export type InstallmentStatus = 'active' | 'finished';

export type InstallmentPurchase = {
  id: string;
  name: string;
  account_id: string | null;
  account_name?: string | null;
  credit_card_id: string | null;
  credit_card_name?: string | null;
  category_id: string | null;
  category_name?: string | null;
  total_installments: number;
  paid_installments: number;
  monthly_amount_pesos: number;
  monthly_amount_dollars: number;
  total_amount_pesos: number;
  total_amount_dollars: number;
  pay_before_day: number | null;
  start_period: string | null;
  status: InstallmentStatus;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  // Derivados (calculados en el mapper)
  remaining_installments: number;
  remaining_amount_pesos: number;
  remaining_amount_dollars: number;
};

export type InstallmentInsert = {
  name: string;
  account_id?: string | null;
  credit_card_id?: string | null;
  category_id?: string | null;
  total_installments: number;
  paid_installments?: number;
  monthly_amount_pesos?: number;
  monthly_amount_dollars?: number;
  total_amount_pesos?: number;
  total_amount_dollars?: number;
  pay_before_day?: number | null;
  start_period?: string | null;
  user_id?: string | null;
};

// Gastos fijos recurrentes (plantillas mensuales)
export type RecurringExpense = {
  id: string;
  name: string;
  category_id: string | null;
  category_name?: string | null;
  account_id: string | null;
  account_name?: string | null;
  credit_card_id: string | null;
  credit_card_name?: string | null;
  amount_pesos: number;
  amount_dollars: number;
  pay_before_day: number | null;
  is_cash: boolean;
  active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RecurringExpenseInsert = {
  name: string;
  category_id?: string | null;
  account_id?: string | null;
  credit_card_id?: string | null;
  amount_pesos?: number;
  amount_dollars?: number;
  pay_before_day?: number | null;
  is_cash?: boolean;
  active?: boolean;
  user_id?: string | null;
};

// Ingresos recurrentes (sueldos / honorarios)
export type RecurringIncome = {
  id: string;
  name: string;
  category_id: string | null;
  category_name?: string | null;
  account_id: string | null;
  account_name?: string | null;
  amount_pesos: number;
  amount_dollars: number;
  receive_day: number | null;
  active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RecurringIncomeInsert = {
  name: string;
  category_id?: string | null;
  account_id?: string | null;
  amount_pesos?: number;
  amount_dollars?: number;
  receive_day?: number | null;
  active?: boolean;
  user_id?: string | null;
};
