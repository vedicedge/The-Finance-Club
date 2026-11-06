'use server';

import { redirect } from 'next/navigation';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';

/** Admin only: wipe the event's game data (after a dry run), optionally registrations too. */
export async function resetEvent(formData: FormData) {
  const me = await requireOrganiser('settings');
  const keep = formData.get('mode') !== 'all';
  if (String(formData.get('confirm') ?? '').trim() !== 'RESET') {
    redirect('/admin/settings?error=' + encodeURIComponent('Type RESET in capitals to confirm.'));
  }
  const { error } = await serviceDb().rpc('admin_reset_event', { p_keep_registrations: keep, p_actor: me.userId });
  if (error) redirect('/admin/settings?error=' + encodeURIComponent(error.hint || error.message));
  await audit(me, 'event.reset', { keep_registrations: keep });
  redirect(
    '/admin/settings?ok=' +
      encodeURIComponent(keep ? 'Event reset. Registrations kept; every agency is back to "registered".' : 'Event reset, registrations included.'),
  );
}
