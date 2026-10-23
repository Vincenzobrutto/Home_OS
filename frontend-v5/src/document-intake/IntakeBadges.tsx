import type { ReactNode } from 'react';
import { cx } from '../components/ui';
import { STATUS_LABEL, STATUS_TONE, type ItemStatus } from './model';
import styles from './intake.module.css';

const TONE_CLASS = { ok: styles.badgeOk, warn: styles.badgeWarn, neutral: styles.badgeNeutral, error: styles.badgeError } as const;
export function StatusBadge({ status }: { status: ItemStatus }) {
  return <span className={cx(styles.badge, TONE_CLASS[STATUS_TONE[status]])}>{STATUS_LABEL[status]}</span>;
}
export function Badge({ tone, children }: { tone: keyof typeof TONE_CLASS; children: ReactNode }) {
  return <span className={cx(styles.badge, TONE_CLASS[tone])}>{children}</span>;
}
