# Private seed (never committed)

This folder is git-ignored except for this README, because the repository is public and the
files here hold event secrets:

- `seed_secrets.sql` — Appendix A (all 41 prelim questions with answer keys and working),
  the 3 Team-Ups and the 8 Breaking News cards.

Keep a copy somewhere private (the club's drive). To load it into Supabase after the migrations:

1. Supabase dashboard → SQL Editor → New query → paste the file → Run, **or**
2. `psql "$SUPABASE_DB_URL" -f supabase/private/seed_secrets.sql`

It is safe to run again; it never changes a question's live state. Check the result on
`/admin` (Systems check): it should show 41 questions, 41 keys, 3 Team-Ups and 8 news cards.
