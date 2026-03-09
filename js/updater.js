/* =============================================================
   SHARP JOBS — GitHub Update & Backup System
   Version: 1.0.0
   Description: Version checking, file updates, backup/restore via GitHub.
   To modify update or backup behaviour: edit this file only.
   ============================================================= */

const Updater = (() => {

  const FILES = [
    'index.html', 'sw.js', 'manifest.json',
    'js/db.js', 'js/ui.js', 'js/jobs.js', 'js/delivery.js',
    'js/customers.js', 'js/invoices.js', 'js/dashboard.js',
    'js/settings.js', 'js/updater.js'
  ];

  // ── GitHub raw URL builder ────────────────────────────────
  function rawUrl(gh, path) {
    return `https://raw.githubusercontent.com/${gh.username}/${gh.repo}/${gh.branch}/${path}`;
  }
  function apiUrl(gh, path) {
    return `https://api.github.com/repos/${gh.username}/${gh.repo}/contents/${path}`;
  }

  // ── Fetch remote manifest ─────────────────────────────────
  async function fetchRemoteManifest() {
    const gh = DB.getGhConfig();
    if (!gh.username || !gh.repo) throw new Error('GitHub not configured');
    const res = await fetch(rawUrl(gh, 'manifest.json') + '?t=' + Date.now());
    if (!res.ok) throw new Error('Could not fetch manifest from GitHub');
    return res.json();
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

  // ── Backup to GitHub ──────────────────────────────────────
  async function backupToGitHub(type = 'both') {
    const gh = DB.getGhConfig();
    if (!gh.username || !gh.repo || !gh.token) throw new Error('GitHub token required for backup');

    if (type === 'data' || type === 'both') {
      const data = JSON.stringify(DB.exportAllData(), null, 2);
      await pushToGitHub(gh, 'backup/data-backup.json', data, 'Sharp Jobs: data backup');
    }

    if (type === 'app' || type === 'both') {
      // Backup current app files to /backup/
      for (const file of FILES) {
        try {
          const res = await fetch('./' + file + '?t=' + Date.now());
          if (!res.ok) continue;
          const content = await res.text();
          await pushToGitHub(gh, `backup/${file}`, content, `Sharp Jobs: app backup - ${file}`);
        } catch (e) { console.warn('Could not backup', file, e); }
      }
    }
  }

  // ── Push file to GitHub ───────────────────────────────────
  async function pushToGitHub(gh, path, content, message) {
    const url = apiUrl(gh, path);
    // Check if file exists to get SHA (needed for update)
    let sha = null;
    try {
      const check = await fetch(url, { headers: { Authorization: `token ${gh.token}`, Accept: 'application/vnd.github.v3+json' } });
      if (check.ok) { const d = await check.json(); sha = d.sha; }
    } catch {}

    const body = { message, content: btoa(unescape(encodeURIComponent(content))) };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `token ${gh.token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`GitHub push failed for ${path}: ${res.status}`);
  }

  // ── Pull & apply update ───────────────────────────────────
  async function applyUpdates(filesToUpdate, onProgress) {
    const gh = DB.getGhConfig();
    const installed = DB.getInstalledVersions();

    for (let i = 0; i < filesToUpdate.length; i++) {
      const { file, remoteVer } = filesToUpdate[i];
      if (onProgress) onProgress(file, i + 1, filesToUpdate.length);
      const res = await fetch(rawUrl(gh, file) + '?t=' + Date.now());
      if (!res.ok) throw new Error(`Failed to fetch ${file}`);
      const content = await res.text();

      // For JS files, we update the cache — page reload applies them
      const cache = await caches.open('sharp-jobs-v1.0.0');
      const response = new Response(content, { headers: { 'Content-Type': getContentType(file) } });
      await cache.put('./' + file, response);
      installed[file] = remoteVer;
    }
    DB.saveInstalledVersions(installed);
  }

  function getContentType(file) {
    if (file.endsWith('.js')) return 'application/javascript';
    if (file.endsWith('.html')) return 'text/html';
    if (file.endsWith('.json')) return 'application/json';
    return 'text/plain';
  }

  // ── Local backup download ─────────────────────────────────
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

  // ── Restore from GitHub ───────────────────────────────────
  async function restoreFromGitHub(type = 'data') {
    const gh = DB.getGhConfig();
    if (!gh.username || !gh.repo) throw new Error('GitHub not configured');

    if (type === 'data') {
      const res = await fetch(rawUrl(gh, 'backup/data-backup.json') + '?t=' + Date.now());
      if (!res.ok) throw new Error('No backup found on GitHub');
      const data = await res.json();
      DB.importAllData(data);
    } else {
      // Restore app files
      for (const file of FILES) {
        try {
          const res = await fetch(rawUrl(gh, `backup/${file}`) + '?t=' + Date.now());
          if (!res.ok) continue;
          const content = await res.text();
          const cache = await caches.open('sharp-jobs-v1.0.0');
          await cache.put('./' + file, new Response(content, { headers: { 'Content-Type': getContentType(file) } }));
        } catch (e) { console.warn('Could not restore', file, e); }
      }
    }
  }

  return {
    checkForUpdates, backupToGitHub, applyUpdates, restoreFromGitHub,
    downloadDataBackup, pushToGitHub
  };
})();
