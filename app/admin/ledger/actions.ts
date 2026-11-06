'use server';

import { redirect } from 'next/navigation';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { formatCrore } from '@/lib/money';
import { dbMessage } from '@/lib/round1/server';

const back = (agency: string, params: Record<string, string>): never =>
  redirect(`/admin/ledger?${new URLSearchParams({ ...(agency ? { agency } : {}), ...params })}`);

export async function adjust(formData: FormData) {
  const me = await requireOrganiser('ledger');
  const agency = String(formData.get('agency') ?? '');
  const amount = Number(String(formData.get('amount') ?? '').replace(',', '.'));
  const note = String(formData.get('note') ?? '');
  const filter = String(formData.get('filter') ?? '');
  const { error } = await serviceDb().rpc('ledger_adjust', { p_agency: agency, p_amount: amount, p_note: note, p_actor: me.userId });
  if (error) back(filter, { error: dbMessage(error) });
  await audit(me, 'ledger.adjust', { agency, amount, note });
  back(filter, { ok: `Adjustment ${formatCrore(amount, { signed: true })} for ${agency} recorded.` });
}

export async function voidEntry(entryId: number, formData: FormData) {
  const me = await requireOrganiser('ledger');
  const reason = String(formData.get('reason') ?? '');
  const filter = String(formData.get('filter') ?? '');
  const { error } = await serviceDb().rpc('ledger_void', { p_entry: entryId, p_reason: reason, p_actor: me.userId });
  if (error) back(filter, { error: dbMessage(error) });
  await audit(me, 'ledger.void', { entry: entryId, reason });
  back(filter, { ok: `Entry #${entryId} voided.` });
}

export async function undoLast(formData: FormData) {
  const me = await requireOrganiser('ledger');
  const reason = String(formData.get('reason') ?? '');
  const filter = String(formData.get('filter') ?? '');
  const { data, error } = await serviceDb().rpc('ledger_undo_last', { p_actor: me.userId, p_reason: reason });
  if (error) back(filter, { error: dbMessage(error) });
  await audit(me, 'ledger.undo_last', { entry: data, reason });
  back(filter, { ok: `Your last entry (#${data}) was voided.` });
}
