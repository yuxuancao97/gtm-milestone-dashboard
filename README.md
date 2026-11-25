# GTM Milestone Dashboard

Bilingual (CN/EN) GTM milestone tracker. Enter Pilot Run and Mass Production dates and every milestone is derived automatically.

Data is saved in your browser (localStorage). Use **Export Backup** / **Import Backup** to move it between browsers or share it.

## Shared board (Google Sheet)

1. Create a blank Google Sheet, open **Extensions → Apps Script**, paste `google-apps-script.js`, and save.
2. **Deploy → New deployment → Web app**, with *Execute as: Me* and *Who has access: Anyone*. Copy the web app URL.
3. Paste that URL into `SHEETS_URL` near the top of the script in `index.html`.

Without it, the dashboard saves data in each browser only.
