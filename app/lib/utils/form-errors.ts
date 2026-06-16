export const FORM_ERROR_MESSAGES: Record<string, string> = {
  validation: 'Revisá los datos del formulario. Algún campo es inválido o falta completar.',
  save: 'No se pudo guardar. Intentá de nuevo.',
  notfound: 'El registro no existe o ya fue eliminado.',
  delete: 'No se pudo eliminar. Intentá de nuevo.',
  has_movements: 'No se puede eliminar porque tiene movimientos asociados.',
  already_paid: 'Este ítem ya fue registrado en el período.',
  no_account: 'Seleccioná una cuenta para continuar.',
  empty: 'No hay monto para registrar.',
};

export function getFormErrorMessage(error?: string | null): string | null {
  if (!error) return null;
  return FORM_ERROR_MESSAGES[error] ?? 'Ocurrió un error. Intentá de nuevo.';
}
