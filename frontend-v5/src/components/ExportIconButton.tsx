import { Icon } from './Icon';
import { cx, ui } from './ui';

/** Azione compatta; nome accessibile e tooltip conservano formato e ambito. */
export function ExportIconButton(props: {
  label: string;
  hint?: string;
  disabled?: boolean;
  busy?: boolean;
  onClick?: () => void;
}) {
  return <span title={props.hint ?? props.label}>
    <button type="button" className={cx(ui.btn, ui.exportIcon)} aria-label={props.label}
      disabled={props.disabled || props.busy} aria-busy={props.busy || undefined} onClick={props.onClick}>
      <Icon name="export" />
    </button>
  </span>;
}
