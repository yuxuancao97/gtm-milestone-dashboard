/**
 * GTM Milestone Dashboard: daily backups to Google Drive.
 *
 * Add this as a second file in the same Apps Script project as the dashboard script:
 * 1. In Apps Script, click + next to "Files" > Script, name it Backup, paste this whole file, Save.
 * 2. In the function menu at the top, pick setupDailyBackup and click Run. Approve the access request.
 *    This saves one backup right away and schedules one every night.
 * No new deployment is needed; the dashboard link stays the same.
 *
 * Backups go to a Drive folder named "GTM Dashboard Backups", one .json file per day.
 * To restore: download a backup file and use Import Backup on the dashboard.
 * Files older than KEEP_DAYS are moved to the Drive trash.
 *
 * This file also makes hand edits in the Sheet show up on open dashboards (onEdit below).
 */

const BACKUP_FOLDER = 'GTM Dashboard Backups';
const KEEP_DAYS = 60;

/** Run once by hand: makes a backup now and schedules one every night around 2am. */
function setupDailyBackup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyBackup') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(2).create();
  const file = dailyBackup();
  Logger.log('Daily backup scheduled. First backup saved: ' + file.getName() + ' in folder "' + BACKUP_FOLDER + '"');
}

/** Saves the whole board as a .json file the dashboard's Import Backup can read. */
function dailyBackup() {
  const projects = readAll_(); // from the dashboard script in this project
  const payload = {
    app: 'gtm-milestone-dashboard',
    version: 2,
    exported: new Date().toISOString(),
    projects: projects
  };
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  const name = 'gtm-dashboard-backup-' + stamp + '.json';
  const file = folder_().createFile(name, JSON.stringify(payload, null, 2), 'application/json');
  pruneOld_();
  return file;
}

/** Runs on its own when someone edits the Sheet by hand, so open dashboards pick up the change. */
function onEdit() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('rev', String((Number(props.getProperty('rev')) || 0) + 1));
  } finally {
    lock.releaseLock();
  }
}

function folder_() {
  const it = DriveApp.getFoldersByName(BACKUP_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER);
}

function pruneOld_() {
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const files = folder_().getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (/^gtm-dashboard-backup-/.test(f.getName()) && f.getDateCreated().getTime() < cutoff) f.setTrashed(true);
  }
}
