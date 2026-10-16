import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SourceDialog } from './SourceDialog';

describe('Receipt source dialog keyboard containment', () => {
  it('loops Tab and Shift+Tab inside the original dialog, including while opening', async () => {
    const user = userEvent.setup();
    render(<><button>Outside</button><SourceDialog request={{ kind: 'original' }} original={{ status: 'available', name: 'Synthetic.pdf', pageCount: 1 }} openState={{ status: 'opening' }} onOpenOriginal={vi.fn()} onClose={vi.fn()} /></>);
    const close = screen.getByRole('button', { name: 'Chiudi' }), open = screen.getByRole('button', { name: 'Apertura…' });
    expect(close).toHaveFocus();
    await user.tab({ shift: true }); expect(open).toHaveFocus();
    await user.tab(); expect(close).toHaveFocus();
    await user.tab(); expect(open).toHaveFocus();
    await user.tab(); expect(close).toHaveFocus();
    screen.getByRole('button', { name: 'Outside' }).focus();
    await user.tab(); expect(close).toHaveFocus();
  });
  it('rejects internal separators instead of turning two amounts into one', async () => {
    const { parseEuroToCents } = await import('./model');
    for (const value of ['1 2', '1€2', '€12€', '1\n2']) expect(parseEuroToCents(value)).toBeNull();
    expect(parseEuroToCents('€ 1.234,56')).toBe(123456);
    expect(parseEuroToCents('179,90 €')).toBe(17990);
  });
});
