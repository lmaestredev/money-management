// Tipos para la app de finanzas personales.
// En Fase 2 se añadirán Movement, Category, etc. según el Excel.

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

// Temporal para utils (generateYAxis); reemplazar en Fase 2 con tipos de movimientos/gráficos.
export type Revenue = {
  month: string;
  revenue: number;
};
