/* =============================================================
   SHARP JOBS — GitHub Update & Backup System
   Version: 1.2.0
   Description: Version checking, file updates, backup/restore via GitHub.
                Uses GitHub Contents API with explicit CORS headers.
   To modify update or backup behaviour: edit this file only.
   ============================================================= */

const Updater = (() => {

  const FILES = [
    'index.html', 'sw.js', 'manifest.json',
    'js/db.js', 'js/ui.js', 'js/jobs.js', 'js/delivery.js',
    'js/customers.js', 'js/invoices.js', 'js/dashboard.js',
    'js/settings.js', 'js/updater.js'
  ];

  // ── Get active cache name dynamically ────────────────────
  async function getActiveCacheName() {
    const keys = await caches.keys();
    const appCache = keys.find(k => k.startsWith('sharp-jobs-v'));
    return appCache || 'sharp-jobs-v1.2.0';
  }

  // ── Authenticated GitHub API fetch ────────────────────────
  async function ghFetch(path, options = {}) {
    const gh = DB.getGhConfig();
    const url = `https://api.github.com/repos/${gh.username}/${gh.repo}/contents/${path}`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
    if (gh.token) headers['Authorization'] = `token ${gh.token}`;
    const mergedHeaders = { ...headers, ...(options.headers || {}) };
    const { headers: _h, ...restOptions } = options;
    const res = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      ...restOptions,
      headers: mergedHeaders
    });
    return res;
  }

  // ── Fetch file content from GitHub ────────────────────────
  async function fetchFileFromGitHub(path) {
    const gh = DB.getGhConfig();
    const res = await ghFetch(`${path}?ref=${gh.branch || 'main'}&t=${Date.now()}`);
    if (!res.ok) throw new Error(`GitHub ${res.status} fetching ${path}`);
    const data = await res.json();
    return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
  }

  // ── Fetch remote manifest ─────────────────────────────────
  async function fetchRemoteManifest() {
    const gh = DB.getGhConfig();
    if (!gh.username || !gh.repo) throw new Error('GitHub not configured — check Settings');
    if (!gh.token) throw new Error('GitHub token required — check Settings');
    const text = await fetchFileFromGitHub('manifest.json');
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
    const installed = DB.getInstalledVersions();
    const CACHE_NAME = await getActiveCacheName();
    const cache = await caches.open(CACHE_NAME);
    for (let i = 0; i < filesToUpdate.length; i++) {
      const { file, remoteVer } = filesToUpdate[i];
      if (onProgress) onProgress(file, i + 1, filesToUpdate.length);
      const content = await fetchFileFromGitHub(file);
      await cache.put('./' + file, new Response(content, {
        headers: { 'Content-Type': getContentType(file) }
      }));
      installed[file] = remoteVer;
    }
    DB.saveInstalledVersions(installed);
  }

  // ── Push file to GitHub ───────────────────────────────────
  async function pushToGitHub(path, content, message) {
    const gh = DB.getGhConfig();
    if (!gh.token) throw new Error('GitHub token required');

    let sha = null;
    try {
      const check = await ghFetch(`${path}?ref=${gh.branch || 'main'}`);
      if (check.ok) { const d = await check.json(); sha = d.sha; }
    } catch {}

    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: gh.branch || 'main'
    };
    if (sha) body.sha = sha;

    const res = await ghFetch(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Push failed for ${path}: ${err.message || res.status}`);
    }
  }

  // ── Backup to GitHub only ─────────────────────────────────
  async function backupToGitHub(type = 'both') {
    const gh = DB.getGhConfig();
    if (!gh.token) throw new Error('GitHub token required for backup');

    if (type === 'data' || type === 'both') {
      const data = JSON.stringify(DB.exportAllData(), null, 2);
      await pushToGitHub('backup/data-backup.json', data, 'Sharp Jobs: data backup');
    }

    if (type === 'app' || type === 'both') {
      const CACHE_NAME = await getActiveCacheName();
      const cache = await caches.open(CACHE_NAME);
      for (const file of FILES) {
        try {
          const cached = await cache.match('./' + file);
          if (!cached) continue;
          const content = await cached.text();
          await pushToGitHub(`backup/${file}`, content, `Sharp Jobs: app backup - ${file}`);
        } catch (e) { console.warn('Could not backup', file, e); }
      }
    }
  }

  // ── Restore from GitHub ───────────────────────────────────
  async function restoreFromGitHub(type = 'data') {
    const gh = DB.getGhConfig();
    if (!gh.username || !gh.repo) throw new Error('GitHub not configured');

    if (type === 'data') {
      const text = await fetchFileFromGitHub('backup/data-backup.json');
      DB.importAllData(JSON.parse(text));
    } else {
      const CACHE_NAME = await getActiveCacheName();
      const cache = await caches.open(CACHE_NAME);
      for (const file of FILES) {
        try {
          const content = await fetchFileFromGitHub(`backup/${file}`);
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
