const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const releaseDir = path.join(root, 'release');
const downloadDir = path.join(root, 'download-site', 'public', 'downloads');

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 750 });
}

function clearDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true, maxRetries: 6, retryDelay: 750 });
  }
}

try {
  removeDir(releaseDir);
  clearDir(downloadDir);
  console.log('Prepared electron-builder output directory.');
} catch (error) {
  console.error('Unable to prepare electron-builder output directory.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
