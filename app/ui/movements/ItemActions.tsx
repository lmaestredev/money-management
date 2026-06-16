import Link from 'next/link';
import { PencilIcon } from '@heroicons/react/24/outline';
import styles from './ItemActions.module.css';

type Props = {
  editHref: string;
  editLabel?: string;
  deleteSlot?: React.ReactNode;
};

export default function ItemActions({ editHref, editLabel = 'Editar', deleteSlot }: Props) {
  return (
    <div className={styles.actions}>
      <Link href={editHref} className={styles.editBtn} title={editLabel} aria-label={editLabel}>
        <PencilIcon className={styles.editIcon} aria-hidden />
        Editar
      </Link>
      {deleteSlot}
    </div>
  );
}
