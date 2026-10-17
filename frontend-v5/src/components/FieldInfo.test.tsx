import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { FieldInfo } from './FieldInfo';

it('keeps explanations hidden until requested and confines keyboard focus while open', async () => {
  const user = userEvent.setup();
  render(<FieldInfo label="Marca"><p>Fonte del dato</p><a href="https://example.test/manual">Fonte ufficiale</a></FieldInfo>);
  const trigger = screen.getByRole('button', { name: 'Informazioni su Marca' });
  expect(screen.queryByText('Fonte del dato')).not.toBeInTheDocument();
  await user.click(trigger);
  expect(screen.getByRole('dialog', { name: 'Marca' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Chiudi' })).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByRole('link')).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('button', { name: 'Chiudi' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(document.body.style.overflow).toBe('');
});

it('opens by keyboard and closes with the explicit button', async () => {
  const user = userEvent.setup();
  render(<FieldInfo label="Modello"><p>Descrizione del modello</p></FieldInfo>);
  await user.tab(); await user.keyboard('{Enter}');
  expect(screen.getByRole('dialog', { name: 'Modello' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Chiudi' }));
  expect(screen.queryByText('Descrizione del modello')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Informazioni su Modello' })).toHaveFocus();
});
