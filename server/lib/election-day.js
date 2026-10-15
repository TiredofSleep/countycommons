// Election Day polling places and vote centers, per state. The daily refresh
// (pipeline/refresh-election-day.js) writes a live copy; until it has run, the
// committed snapshot serves. Re-read when the file changes, no restart needed.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', '..', 'data');
const LIVE = path.join(DATA, 'national', 'election-day-arkansas.live.json');
const SNAPSHOT = path.join(DATA, 'corpus', 'election-day-arkansas.json');
const ELECTION = '2026-general', ELECTION_DATE = '2026-11-03';
const LAYER = 'https://services.arcgis.com/PwY9ZuZRDiI5nXUB/arcgis/rest/services/SBEC_General_Election/FeatureServer/1';
const MAP = 'https://experience.arcgis.com/experience/03fe56e9abf945c68ac3cab3d1b7b869';

let cache = { file: null, mtime: 0, data: null };
function current(state) {
  if (state !== 'Arkansas') return null;
  for (const file of [LIVE, SNAPSHOT]) {
    let st; try { st = fs.statSync(file); } catch (e) { continue; }
    if (cache.file !== file || cache.mtime !== st.mtimeMs) {
      try { cache = { file, mtime: st.mtimeMs, data: JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch (e) { continue; }
    }
    return cache.data;
  }
  return null;
}

module.exports = { current, LIVE, SNAPSHOT, ELECTION, ELECTION_DATE, LAYER, MAP };
