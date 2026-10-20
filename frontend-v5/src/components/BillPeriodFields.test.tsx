import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { BillPeriodFields, monthPeriod } from './BillPeriodFields';
function mount(from = '', to = '') {
  function Form() { const [value, setValue] = useState({ from, to }); return <><BillPeriodFields {...value} onChange={setValue}/><output>{value.from} → {value.to}</output></>; }
  render(<Form/>); return userEvent.setup();
}
it('uses a month for a full calendar month, including leap February', () => {
  expect(monthPeriod('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  expect(monthPeriod('0001-02').to).toBe('0001-02-28');
  mount('2025-12-01', '2025-12-31');
  expect(screen.getByLabelText('Un mese')).toBeChecked();
  expect(screen.getByLabelText('Mese di riferimento')).toHaveValue('2025-12');
  expect(screen.queryByLabelText('Dal')).not.toBeInTheDocument();
});
it('keeps a partial month as an interval, without silently expanding it', () => {
  mount('2025-12-10', '2025-12-20');
  expect(screen.getByLabelText('Un intervallo')).toBeChecked();
  expect(screen.getByLabelText('Dal')).toHaveValue('2025-12-10');
  expect(screen.queryByLabelText('Mese di riferimento')).not.toBeInTheDocument();
});
it('restores both drafts when switching, and submits only the visible mode', async () => {
  const user = mount('2025-12-01', '2025-12-31');
  await user.click(screen.getByLabelText('Un intervallo'));
  await user.clear(screen.getByLabelText('Al')); await user.type(screen.getByLabelText('Al'), '2026-01-31');
  await user.click(screen.getByLabelText('Un mese'));
  expect(screen.getByLabelText('Mese di riferimento')).toHaveValue('2025-12');
  expect(screen.getByRole('status')).toHaveTextContent('2025-12-01 → 2025-12-31');
  await user.click(screen.getByLabelText('Un intervallo'));
  expect(screen.getByLabelText('Al')).toHaveValue('2026-01-31');
  await user.click(screen.getByLabelText('Un mese')); await user.clear(screen.getByLabelText('Mese di riferimento')); await user.type(screen.getByLabelText('Mese di riferimento'), '2024-02');
  await user.click(screen.getByLabelText('Un intervallo'));
  expect(screen.getByLabelText('Al')).toHaveValue('2026-01-31');
  await user.click(screen.getByLabelText('Un mese'));
  expect(screen.getByRole('status')).toHaveTextContent('2024-02-01 → 2024-02-29');
});
