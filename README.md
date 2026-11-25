# GTM Milestone Dashboard

Bilingual (CN/EN) GTM milestone tracker. Enter Pilot Run and Mass Production dates and every milestone is derived automatically.

Data is saved in your browser (localStorage). Use **Export Backup** / **Import Backup** to move it between browsers or share it.

## Shared board (Supabase)

1. Create a free project at supabase.com.
2. In the project, open **SQL Editor → New query**, paste `supabase-setup.sql`, and click **Run**.
3. Copy the **Project URL** and the **anon public** key from **Project Settings → API** into `SUPABASE_URL` and `SUPABASE_ANON_KEY` near the top of the script in `index.html`.

Without those two values the dashboard saves data in each browser only.
