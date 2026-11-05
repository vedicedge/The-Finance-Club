import type { Metadata } from 'next';
import { requireOrganiser } from '@/lib/auth/organiser';
import { ROLES, ROLE_LABELS, isRole } from '@/lib/auth/roles';
import { serviceDb } from '@/lib/db/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { AddCrewForm } from './AddCrewForm';
import { updateCrewMember } from './actions';

export const metadata: Metadata = { title: 'Crew & roles' };

type CrewRow = { user_id: string; email: string; display_name: string | null; roles: string[]; active: boolean };

export default async function CrewPage() {
  const organiser = await requireOrganiser('users');
  const { data, error } = await serviceDb()
    .from('organisers')
    .select('user_id, email, display_name, roles, active')
    .order('created_at');
  if (error) throw error;
  const crew = (data ?? []) as CrewRow[];

  return (
    <AdminShell organiser={organiser}>
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-3 text-5xl">Crew &amp; roles</h1>
      <p className="mt-4 max-w-2xl text-steel">
        Everyone with a website job gets their own sign-in, limited to the screens their roles need. They sign in at
        <code className="mx-1 text-bone">/admin/login</code> with an email link, or with the password you set here.
      </p>

      <h2 className="eyebrow mt-10">Add a crew member</h2>
      <div className="mt-4">
        <AddCrewForm />
      </div>

      <h2 className="eyebrow mt-12">Crew ({crew.length})</h2>
      <ul className="mt-4 space-y-3">
        {crew.map((c) => (
          <li key={c.user_id} className="rounded-sm border border-line bg-vault p-4">
            <form action={updateCrewMember.bind(null, c.user_id)} className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="min-w-56">
                <p className="text-bone">{c.display_name ?? c.email}</p>
                <p className="text-xs text-steel">{c.email}</p>
              </div>
              <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1">
                {ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="roles"
                      value={r}
                      defaultChecked={c.roles.filter(isRole).includes(r)}
                      className="accent-torch"
                    />
                    {ROLE_LABELS[r]}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={c.active} className="accent-torch" /> Active
              </label>
              <input
                name="password"
                type="password"
                placeholder="New password"
                minLength={10}
                autoComplete="new-password"
                className="w-40 rounded-sm border border-line-strong bg-vault-2 px-2 py-1.5 text-sm"
              />
              <button className="rounded-sm border border-line-strong px-3 py-1.5 text-sm hover:border-torch hover:text-torch">
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
