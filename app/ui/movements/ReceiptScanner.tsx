'use client';

import { useRef, useState } from 'react';
import { CameraIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { extractExpenseFromImageAction } from '@/app/lib/actions/ai';
import type { PaymentSource } from '@/app/ui/credit-cards/PaymentSourceSelect';
import type { Account, CreditCard } from '@/app/lib/definitions';
import styles from './ReceiptScanner.module.css';

type ExtractedData = {
  amount: number | null;
  description: string | null;
  paymentSource: PaymentSource;
};

type Props = {
  accounts: Account[];
  cards: CreditCard[];
  onExtracted: (data: ExtractedData) => void;
};

export default function ReceiptScanner({ accounts, cards, onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    setResultSummary(null);
    setFile(selected);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResultSummary(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('context', context);

    const result = await extractExpenseFromImageAction(formData);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.amount == null) {
      setError('No se pudo detectar un monto en la imagen. Cargalo manualmente.');
      return;
    }

    let paymentSource: PaymentSource = null;
    let sourceName: string | null = null;
    if (result.accountId) {
      const acc = accounts.find((a) => a.id === result.accountId);
      if (acc) {
        paymentSource = { kind: 'account', id: acc.id, currency: acc.currency };
        sourceName = acc.name;
      }
    } else if (result.creditCardId) {
      const card = cards.find((c) => c.id === result.creditCardId);
      if (card) {
        paymentSource = { kind: 'card', id: card.id, currency: card.currency };
        sourceName = card.name;
      }
    }

    onExtracted({ amount: result.amount, description: result.merchant, paymentSource });

    const currencyLabel = result.currencyGuess === 'USD' ? 'u$d' : '$';
    setResultSummary(
      `Detectado: ${currencyLabel} ${result.amount.toLocaleString('es-AR')}${
        result.merchant ? ` · ${result.merchant}` : ''
      }${sourceName ? ` · ${sourceName}` : ''}`
    );
  }

  function handleClear() {
    setFile(null);
    setError(null);
    setResultSummary(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden>
          <SparklesIcon className={styles.headerIcon} />
        </span>
        <div>
          <div className={styles.title}>Escanear ticket con IA</div>
          <div className={styles.subtitle}>
            Subí una foto o captura y detectamos el monto automáticamente
          </div>
        </div>
      </div>

      {previewUrl ? (
        <>
          <div className={styles.previewRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Vista previa del ticket" className={styles.previewImg} />
            <div className={styles.previewActions}>
              <button
                type="button"
                className={styles.analyzeBtn}
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? 'Analizando…' : 'Analizar con IA'}
              </button>
              <button type="button" className={styles.clearBtn} onClick={handleClear} disabled={loading}>
                Quitar
              </button>
            </div>
          </div>
          <div className={styles.contextField}>
            <label htmlFor="ai-context" className={styles.contextLabel}>
              Contexto para la IA (opcional)
            </label>
            <input
              id="ai-context"
              type="text"
              className={styles.contextInput}
              placeholder="Ej. Pagué con la tarjeta Visa BBVA"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              disabled={loading}
            />
          </div>
        </>
      ) : (
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={() => inputRef.current?.click()}
        >
          <CameraIcon className={styles.uploadIcon} aria-hidden />
          Subir foto del ticket
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="environment"
        onChange={handleFileChange}
        className={styles.hiddenInput}
      />

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {resultSummary && (
        <div className={styles.success} role="status">
          {resultSummary} — revisá y completá el resto del formulario.
        </div>
      )}
    </div>
  );
}
