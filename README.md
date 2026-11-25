# GTM Milestone Dashboard

Bilingual (CN/EN) GTM milestone tracker. Enter Pilot Run and Mass Production dates and every milestone is derived automatically.

Data is saved in your browser (localStorage). Use **Export Backup** / **Import Backup** to move it between browsers or share it.

## Shared board (Google Sheet)

1. Create a blank Google Sheet, open **Extensions → Apps Script**, paste `google-apps-script.js`, and save.
2. **Deploy → New deployment → Web app**, with *Execute as: Me* and *Who has access: Anyone*. Copy the web app URL.
3. Paste that URL into `SHEETS_URL` near the top of the script in `index.html`.

Without it, the dashboard saves data in each browser only.

## Backups

- **Daily backup:** add `google-apps-script-backup.js` as a second file in the same Apps Script project, then run `setupDailyBackup` once. A `.json` backup is saved to the Drive folder "GTM Dashboard Backups" every night, and files older than 60 days are cleared.
- **Restore:** download a backup file from that folder and use **Import Backup** on the dashboard.
- **Sheet history:** in the Google Sheet, File → Version history shows and restores earlier states.
