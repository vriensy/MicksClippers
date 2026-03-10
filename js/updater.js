/* =============================================================
   SHARP JOBS — GitHub Update & Backup System
   Version: 1.1.0
   Description: Version checking, file updates, backup/restore via GitHub.
                Uses GitHub Contents API exclusively (proper CORS + auth).
                No raw.githubusercontent.com calls.
   To modify update or backup behaviour: edit this file only.
   ============================================================= */

const Updater = (() => {

  const FILES = [
    'index.html', 'sw.js', 'manifest.json',
    'js/db.js', 'js/ui.js', 'js/jobs.js', 'js/delivery.js',
    'js/customers.js', 'js/invoices.js', 'js/dashboard.js',
    'js/settings.js', 'js/updater.js'
  ];

  const CACHE_NAME = 'sharp-jobs-v1.1.0';

  // ── GitHub API URL builder ────────────────────────────────
  function apiUrl(gh, path) {
    return `https://api.github.com/repos/${gh.username}/${gh.repo}/contents/${path}?ref=${gh.branch || 'main'}`;
  }

  // ── Authenticated fetch via Contents API ──────────────────
  // Returns the decoded file content as a string
  async function fetchFileFromGitHub(gh, path) {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (gh.token) headers['Authorization'] = `token ${gh.token}`;
    const res = await fetch(apiUrl(gh, path) + '&t=' + Date.now(), { headers });
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${path}`);
    const data = await res.json();
    // Content API returns base64-encoded content
    return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
  }

  // ── Fetch remote manifest ─────────────────────────────────
  async function fetchRemoteManifest() {
    const gh = DB.getGhConfig();
    if (!gh.username || !gh.repo) throw new Error('GitHub not configured — check Settings');
    const text = await fetchFileFromGitHub(gh, 'manifest.json');
    return JSON.parse(text);
  }

  // ── Compare versions ──────────────────────────────────────
  async function checkForUpdates() {
    const remote = await fetchRemoteManifest();
    const installed = DB.getInstalledVersions();
    const results = [];
    for (const [file, info] of Object.entries(remote.files || {})) {
      const localVer = installed[file] || '0.0.0';
      const hasUpdate = localVer !== info.version;
      results.push({ file, localVer, remoteVer: info.version, description: info.description, hasUpdate });
    }
    return { results, remoteAppVersion: remote.version };
  }

  // ── Pull & apply updates ──────────────────────────────────
  async function applyUpdates(filesToUpdate, onProgress) {
    const gh = DB.getGhConfig();
    const installed = DB.getInstalledVersions();
    const cache = await caches.open(CACHE_NAME);

    for (let i = 0; i < filesToUpdate.length; i++) {
      const { file, remoteVer } = filesToUpdate[i];
      if (onProgress) onProgress(file, i + 1, filesToUpdate.length);
      const content = await fetchFileFromGitHub(gh, file);
      await cache.put('./' + file, new Response(content, {
        headers: { 'Content-Type': getContentType(file) }
      }));
      installed[file] = remoteVer;
    }
    DB.saveInstalledVersions(installed);
  }

  // ── Push file to GitHub ───────────────────────────────────
  async function pushToGitHub(gh, path, content, message) {
    if (!gh.token) throw new Error('GitHub token required');
    const url = `https://api.github.com/repos/${gh.username}/${gh.repo}/contents/${path}`;
    const headers = {
      Authorization: `token ${gh.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    // Get SHA if file exists (required for updates)
    let sha = null;
    try {
      const check = await fetch(url + `?ref=${gh.branch || 'main'}`, { headers });
      if (check.ok) { const d = await check.json(); sha = d.sha; }
    } catch {}

    const body = { message, content: btoa(unescape(encodeURIComponent(content))), branch: gh.branch || 'main' };
    if (sha) body.sha = sha;
    const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Push failed for ${path}: ${err.message || res.status}`);
    }
  }

  // ── Backup to GitHub ──────────────────────────────────────
  async function backupToGitHub(type = 'both') {
    const gh = DB.getGhConfig();
    if (!gh.token) throw new Error('GitHub token required for backup');

    if (type === 'data' || type === 'both') {
      const data = JSON.stringify(DB.exportAllData(), null, 2);
      await pushToGitHub(gh, 'backup/data-backup.json', data, 'Sharp Jobs: data backup');
    }

    if (type === 'app' || type === 'both') {
      for (const file of FILES) {
        try {
          // Read from local cache to back up what's actually running
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match('./' + file);
          const content = cached ? await cached.text() : null;
          if (!content) continue;
          await pushToGitHub(gh, `backup/${file}`, content, `Sharp Jobs: app backup - ${file}`);
        } catch (e) { console.warn('Could not backup', file, e); }
      }
    }
  }

  // ── Restore from GitHub ───────────────────────────────────
  async function restoreFromGitHub(type = 'data') {
    const gh = DB.getGhConfig();
    if (!gh.username || !gh.repo) throw new Error('GitHub not configured');

    if (type === 'data') {
      const text = await fetchFileFromGitHub(gh, 'backup/data-backup.json');
      const data = JSON.parse(text);
      DB.importAllData(data);
    } else {
      const cache = await caches.open(CACHE_NAME);
      for (const file of FILES) {
        try {
          const content = await fetchFileFromGitHub(gh, `backup/${file}`);
          await cache.put('./' + file, new Response(content, {
            headers: { 'Content-Type': getContentType(file) }
          }));
        } catch (e) { console.warn('Could not restore', file, e); }
      }
    }
  }

  // ── Local data backup download ────────────────────────────
  function downloadDataBackup() {
    const data = JSON.stringify(DB.exportAllData(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sharp-jobs-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getContentType(file) {
    if (file.endsWith('.js'))   return 'application/javascript';
    if (file.endsWith('.html')) return 'text/html';
    if (file.endsWith('.json')) return 'application/json';
    return 'text/plain';
  }

  return {
    checkForUpdates, backupToGitHub, applyUpdates, restoreFromGitHub,
    downloadDataBackup, pushToGitHub
  };
})();

