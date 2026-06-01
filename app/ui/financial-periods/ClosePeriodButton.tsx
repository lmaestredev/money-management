'use client';

import { useState, useTransition } from 'react';
import { LockClosedIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { closePeriodAction, previewClosePeriod } from '@/app/lib/actions/financial-periods';
import { useToast } from '@/app/ui/toast/ToastProvider';
import type { ClosePeriodSummary } from '@/app/lib/actions/financial-periods';
import type { FinancialPeriod } from '@/app/lib/definitions';
import styles from './ClosePeriodButton.module.css';

type Preview = {
  installmentsPending: number;
  fixedExpensesPending: number;
  fixedExpensesManual: number;
  incomesPending: number;
  incomesManual: number;
  currentPeriod: FinancialPeriod | null;
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ClosePeriodButton() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ClosePeriodSummary | null>(null);
  const [isPreviewing, startPreview] = useTransition();
  const [isClosing, startClose] = useTransition();
  const { toast } = useToast();

  function openModal() {
    setResult(null);
    setOpen(true);
    startPreview(async () => {
      const p = await previewClosePeriod();
      setPreview(p);
    });
  }

  function closeModal() {
    setOpen(false);
    setPreview(null);
    setResult(null);
  }

  function handleClose() {
    startClose(async () => {
      const res = await closePeriodAction();
      if (res.ok) {
        setResult(res.summary);
        const totalAuto = res.summary.installmentsPaid + res.summary.fixedExpensesPaid + res.summary.incomeReceived;
        const totalManual = res.summary.fixedExpensesManual.length + res.summary.incomeManual.length;
        let msg = `Período cerrado. ${totalAuto} ítem${totalAuto !== 1 ? 's' : ''} registrado${totalAuto !== 1 ? 's' : ''} automáticamente.`;
        if (totalManual > 0) msg += ` ${totalManual} requieren acción manual.`;
        toast(msg, 'success');
      } else {
        toast(res.error ?? 'No se pudo cerrar el período.', 'error');
        closeModal();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={styles.triggerBtn}
        onClick={openModal}
        aria-label="Cerrar período financiero"
      >
        <LockClosedIcon className={styles.triggerIcon} aria-hidden />
        Cerrar período
      </button>

      {open && (
        <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Cerrar período financiero">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {result ? 'Período cerrado' : 'Cerrar período financiero'}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={closeModal}
                aria-label="Cerrar modal"
              >
                <XMarkIcon className={styles.closeIcon} />
              </button>
            </div>

            {/* ── Loading del preview ── */}
            {isPreviewing && !preview && (
              <div className={styles.loading}>Analizando período…</div>
            )}

            {/* ── Preview: qué se va a procesar ── */}
            {preview && !result && (
              <>
                {preview.currentPeriod && (
                  <div className={styles.periodInfo}>
                    <span className={styles.periodLabel}>Período activo</span>
                    <span className={styles.periodRange}>
                      {formatDate(preview.currentPeriod.start_date)} → hoy
                    </span>
                  </div>
                )}

                <p className={styles.description}>
                  Al cerrar el período se registrarán automáticamente los ítems pendientes
                  y comenzará un nuevo período desde hoy.
                </p>

                <div className={styles.summary}>
                  <SummaryRow label="Cuotas a pagar" count={preview.installmentsPending} />
                  <SummaryRow label="Gastos fijos a registrar" count={preview.fixedExpensesPending} />
                  {preview.fixedExpensesManual > 0 && (
                    <SummaryRow
                      label="Gastos fijos en efectivo (manual)"
                      count={preview.fixedExpensesManual}
                      manual
                    />
                  )}
                  <SummaryRow label="Ingresos a cobrar" count={preview.incomesPending} />
                  {preview.incomesManual > 0 && (
                    <SummaryRow
                      label="Ingresos sin cuenta (manual)"
                      count={preview.incomesManual}
                      manual
                    />
                  )}
                </div>

                {(preview.fixedExpensesManual > 0 || preview.incomesManual > 0) && (
                  <p className={styles.manualNote}>
                    Los ítems manuales <strong>no bloquean el cierre</strong>. Podés confirmarlos
                    individualmente desde las secciones de Gastos fijos e Ingresos.
                  </p>
                )}

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={closeModal}
                    disabled={isClosing}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.confirmBtn}
                    onClick={handleClose}
                    disabled={isClosing || !preview.currentPeriod}
                  >
                    {isClosing ? 'Cerrando…' : 'Confirmar cierre'}
                  </button>
                </div>
              </>
            )}

            {/* ── Resultado tras el cierre ── */}
            {result && (
              <>
                <div className={styles.resultGrid}>
                  <ResultRow
                    label="Cuotas registradas"
                    ok={result.installmentsPaid}
                    skipped={result.installmentsSkipped.length}
                  />
                  <ResultRow
                    label="Gastos fijos registrados"
                    ok={result.fixedExpensesPaid}
                    skipped={result.fixedExpensesSkipped.length}
                    manual={result.fixedExpensesManual.length}
                  />
                  <ResultRow
                    label="Ingresos cobrados"
                    ok={result.incomeReceived}
                    skipped={result.incomeSkipped.length}
                    manual={result.incomeManual.length}
                  />
                </div>

                {result.fixedExpensesManual.length > 0 && (
                  <div className={styles.manualList}>
                    <span className={styles.manualListTitle}>Gastos fijos para confirmar manualmente:</span>
                    {result.fixedExpensesManual.map((i) => (
                      <span key={i.id} className={styles.manualItem}>• {i.name}</span>
                    ))}
                  </div>
                )}

                {result.incomeManual.length > 0 && (
                  <div className={styles.manualList}>
                    <span className={styles.manualListTitle}>Ingresos para confirmar manualmente:</span>
                    {result.incomeManual.map((i) => (
                      <span key={i.id} className={styles.manualItem}>• {i.name}</span>
                    ))}
                  </div>
                )}

                <div className={styles.nextPeriod}>
                  <LockClosedIcon className={styles.nextIcon} aria-hidden />
                  Nuevo período iniciado desde <strong>{formatDate(result.nextPeriod.start_date)}</strong>
                </div>

                <div className={styles.actions}>
                  <button type="button" className={styles.confirmBtn} onClick={closeModal}>
                    Entendido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SummaryRow({ label, count, manual }: { label: string; count: number; manual?: boolean }) {
  return (
    <div className={`${styles.summaryRow} ${manual ? styles.summaryRowManual : ''}`}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={`${styles.summaryCount} ${manual ? styles.summaryCountManual : ''}`}>
        {count}
      </span>
    </div>
  );
}

function ResultRow({
  label,
  ok,
  skipped,
  manual = 0,
}: {
  label: string;
  ok: number;
  skipped: number;
  manual?: number;
}) {
  return (
    <div className={styles.resultRow}>
      <span className={styles.resultLabel}>{label}</span>
      <div className={styles.resultCounts}>
        {ok > 0 && <span className={styles.resultOk}>✓ {ok}</span>}
        {skipped > 0 && <span className={styles.resultSkipped}>{skipped} omitidos</span>}
        {manual > 0 && <span className={styles.resultManual}>{manual} manuales</span>}
        {ok === 0 && skipped === 0 && manual === 0 && (
          <span className={styles.resultSkipped}>—</span>
        )}
      </div>
    </div>
  );
}
