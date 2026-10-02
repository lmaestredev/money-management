/** SQLSTATE 23505: violación de un constraint o índice UNIQUE. */
export const UNIQUE_VIOLATION = '23505';

/** true si el error del driver de Postgres es una violación de unicidad. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}
