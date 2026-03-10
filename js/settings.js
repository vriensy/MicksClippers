/* =============================================================
   SHARP JOBS — Settings Module
   Version: 1.0.0
   Description: Business profile, regions, GitHub config, backup & update UI.
   To modify settings behaviour: edit this file only.
   ============================================================= */

const Settings = (() => {

  let returnToCustomerModal = false;

  function show() {
    UI.setTab('settings');
    document.getElementById('fab').style.display = 'none';
    render();
  }

  function render() {
    const settings = DB.getSettings();
    const gh = DB.getGhConfig();
    const regions = DB.getRegions();
    const installed = DB.getInstalledVersions();

    UI.render(`
      ${UI.pageHeader('Settings', 'App v1.0.0')}

      ${UI.sectionLabel('Business Profile')}
      <div class="settings-card">
        <div class="settings-row" onclick="Settings.openBusinessModal()">
          <div class="settings-icon icon-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-title">${settings.businessName || 'Set business name'}</div>
            <div class="settings-desc">${settings.abn ? 'ABN: '+settings.abn : 'Name, ABN, address, contact'}</div>
          </div>
          <div class="settings-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
        </div>
        <div class="settings-row" onclick="Settings.openPaymentModal()">
          <div class="settings-icon icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-title">Payment Details</div>
            <div class="settings-desc">${settings.bsb ? settings.bsb+' · '+settings.accountNumber : 'BSB, account number'}</div>
          </div>
          <div class="settings-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
        </div>
        <div class="settings-row" onclick="Settings.toggleGst()">
          <div class="settings-icon icon-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-title">GST</div>
            <div class="settings-desc">${settings.gstEnabled ? 'Enabled — invoices show as Tax Invoice' : 'Disabled — invoices show as Invoice'}</div>
          </div>
          <div class="toggle ${settings.gstEnabled?'toggle-on':''}"></div>
        </div>
      </div>

      ${UI.sectionLabel('Regions')}
      <div class="settings-card">
        <div class="settings-row" onclick="Settings.openRegionsModal()">
          <div class="settings-icon icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-title">Manage Regions</div>
            <div class="settings-desc">${regions.length} region${regions.length!==1?'s':''} configured</div>
          </div>
          <div class="settings-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
        </div>
      </div>

      ${UI.sectionLabel('GitHub & Updates')}
      <div class="settings-card">
        <div class="settings-row" onclick="Settings.openGhModal()">
          <div class="settings-icon icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-title">GitHub Config</div>
            <div class="settings-desc">${gh.username ? gh.username+'/'+gh.repo : 'Not configured'}</div>
          </div>
          <div class="settings-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
        </div>
        <div class="settings-row" onclick="Settings.checkUpdates()">
          <div class="settings-icon icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-title">Check for Updates</div>
            <div class="settings-desc">Compare installed vs GitHub versions</div>
          </div>
        </div>
      </div>

      ${UI.sectionLabel('Backup & Restore')}
      <div class="settings-card">
        <div class="settings-row" onclick="Settings.backupAll()">
          <div class="settings-icon icon-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-title">Backup Everything</div>
            <div class="settings-desc">App + data → GitHub & local download</div>
          </div>
        </div>
        <div class="settings-row" onclick="Settings.backupDataOnly()">
          <div class="settings-icon icon-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-title">Backup Data Only</div>
            <div class="settings-desc">Jobs, customers, invoices → download</div>
          </div>
        </div>
        <div class="settings-row" onclick="Settings.restoreData()">
          <div class="settings-icon icon-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-title">Restore Data</div>
            <div class="settings-desc">From local file or GitHub backup</div>
          </div>
        </div>
        <div class="settings-row" onclick="Settings.restoreAppFromGitHub()">
          <div class="settings-icon icon-red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-title">Restore App from GitHub</div>
            <div class="settings-desc">Roll back to last known working backup</div>
          </div>
        </div>
      </div>

      <div style="height:20px"></div>
    `);
  }

  // ── GST Toggle ────────────────────────────────────────────
  function toggleGst() {
    const s = DB.getSettings();
    s.gstEnabled = !s.gstEnabled;
    DB.saveSettings(s);
    UI.toast(`GST ${s.gstEnabled ? 'enabled' : 'disabled'}`, 'success');
    render();
  }

  // ── Business Modal ────────────────────────────────────────
  function openBusinessModal() {
    const s = DB.getSettings();
    document.getElementById('bm-name').value = s.businessName || '';
    document.getElementById('bm-abn').value = s.abn || '';
    document.getElementById('bm-address').value = s.address || '';
    document.getElementById('bm-phone').value = s.phone || '';
    document.getElementById('bm-email').value = s.email || '';
    document.getElementById('bm-terms').value = s.paymentTermsDays || 14;
    _renderLogoPreview(s.logo);
    UI.openModal('businessModal');
  }

  function _renderLogoPreview(logo) {
    const preview = document.getElementById('bm-logo-preview');
    if (preview) preview.innerHTML = logo
      ? `<img src="${logo}" style="max-height:50px;border-radius:4px"><button onclick="Settings.removeLogo()" style="background:none;border:none;color:var(--red);cursor:pointer;margin-left:8px">Remove</button>`
      : '<span style="color:var(--text-dim);font-size:13px">No logo uploaded</span>';
  }

  function removeLogo() {
    const s = DB.getSettings(); s.logo = ''; DB.saveSettings(s); _renderLogoPreview('');
  }

  function handleLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { _renderLogoPreview(e.target.result); };
    reader.readAsDataURL(file);
  }

  function saveBusinessProfile() {
    const s = DB.getSettings();
    s.businessName = document.getElementById('bm-name').value.trim();
    s.abn = document.getElementById('bm-abn').value.trim();
    s.address = document.getElementById('bm-address').value.trim();
    s.phone = document.getElementById('bm-phone').value.trim();
    s.email = document.getElementById('bm-email').value.trim();
    s.paymentTermsDays = parseInt(document.getElementById('bm-terms').value) || 14;
    const img = document.querySelector('#bm-logo-preview img');
    if (img) s.logo = img.src;
    DB.saveSettings(s);
    UI.toast('Business profile saved', 'success');
    UI.closeModal('businessModal');
    render();
  }

  // ── Payment Modal ─────────────────────────────────────────
  function openPaymentModal() {
    const s = DB.getSettings();
    document.getElementById('pm-bsb').value = s.bsb || '';
    document.getElementById('pm-account').value = s.accountNumber || '';
    document.getElementById('pm-accname').value = s.accountName || '';
    UI.openModal('paymentModal');
  }

  function savePaymentDetails() {
    const s = DB.getSettings();
    s.bsb = document.getElementById('pm-bsb').value.trim();
    s.accountNumber = document.getElementById('pm-account').value.trim();
    s.accountName = document.getElementById('pm-accname').value.trim();
    DB.saveSettings(s);
    UI.toast('Payment details saved', 'success');
    UI.closeModal('paymentModal');
    render();
  }

  // ── Regions Modal ─────────────────────────────────────────
  let regionsSearchQ = '';

  function openRegionsModal() {
    regionsSearchQ = '';
    _renderRegionsList();
    UI.openModal('regionsModal');
  }

  function _renderRegionsList() {
    const regions = DB.getRegions();
    const q = regionsSearchQ.toLowerCase();
    const filtered = q ? regions.filter(r => r.name.toLowerCase().includes(q)) : regions;
    const container = document.getElementById('regions-list');
    if (!container) return;
    container.innerHTML = filtered.length === 0
      ? `<div style="text-align:center;color:var(--text-dim);padding:20px;font-size:13px">${q ? 'No regions match' : 'No regions yet'}</div>`
      : filtered.map(r => `
          <div class="settings-row" onclick="Settings.openEditRegion('${r.id}');UI.closeModal('regionsModal')">
            <div class="settings-text">
              <div class="settings-title">${r.name}</div>
              <div class="settings-desc">${r.turnaroundDays} day turnaround</div>
            </div>
            <div class="settings-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
          </div>`).join('');
  }

  function _regionsSearch(q) {
    regionsSearchQ = q;
    _renderRegionsList();
  }

  let editingRegionId = null;

  function openNewRegion(returnToCustomer = false) {
    returnToCustomerModal = returnToCustomer;
    editingRegionId = null;
    document.getElementById('rm-title').textContent = 'New Region';
    document.getElementById('rm-name').value = '';
    document.getElementById('rm-days').value = '7';
    document.getElementById('rm-delete').style.display = 'none';
    UI.openModal('regionModal');
  }

  function openEditRegion(id) {
    const region = DB.getRegion(id);
    if (!region) return;
    editingRegionId = id;
    document.getElementById('rm-title').textContent = 'Edit Region';
    document.getElementById('rm-name').value = region.name;
    document.getElementById('rm-days').value = region.turnaroundDays;
    document.getElementById('rm-delete').style.display = 'block';
    UI.openModal('regionModal');
  }

  function saveRegion() {
    const name = document.getElementById('rm-name').value.trim();
    if (!name) { UI.toast('Region name required', 'error'); return; }
    const turnaroundDays = parseInt(document.getElementById('rm-days').value) || 7;
    if (editingRegionId) {
      DB.updateRegion(editingRegionId, { name, turnaroundDays });
      UI.toast('Region updated', 'success');
    } else {
      DB.addRegion({ name, turnaroundDays });
      UI.toast(`${name} added`, 'success');
    }
    UI.closeModal('regionModal');
    if (returnToCustomerModal) { returnToCustomerModal = false; UI.openModal('customerModal'); Customers._refreshRegionSelect(); }
    else { render(); }
  }

  function deleteRegion(id) {
    UI.confirm('Delete this region? Customers will lose their region assignment.', () => {
      DB.deleteRegion(id);
      UI.closeModal('regionModal');
      UI.toast('Region deleted');
      render();
    });
  }

  // ── GitHub Modal ──────────────────────────────────────────
  function openGhModal() {
    const gh = DB.getGhConfig();
    document.getElementById('gh-user').value = gh.username || '';
    document.getElementById('gh-repo').value = gh.repo || '';
    document.getElementById('gh-branch').value = gh.branch || 'main';
    document.getElementById('gh-token').value = gh.token || '';
    UI.openModal('ghModal');
  }

  function saveGhConfig() {
    const gh = {
      username: document.getElementById('gh-user').value.trim(),
      repo: document.getElementById('gh-repo').value.trim(),
      branch: document.getElementById('gh-branch').value.trim() || 'main',
      token: document.getElementById('gh-token').value.trim()
    };
    DB.saveGhConfig(gh);
    UI.toast('GitHub settings saved', 'success');
    UI.closeModal('ghModal');
    render();
  }

  // ── Update Flow ───────────────────────────────────────────
  async function checkUpdates() {
    const gh = DB.getGhConfig();
    if (!gh.username || !gh.repo) { UI.toast('Configure GitHub first', 'error'); openGhModal(); return; }

    UI.openModal('updateModal');
    document.getElementById('update-content').innerHTML = '<div class="update-checking"><span class="spinner"></span> Checking GitHub for updates...</div>';

    try {
      const { results, remoteAppVersion } = await Updater.checkForUpdates();
      const updates = results.filter(r => r.hasUpdate);
      const upToDate = results.filter(r => !r.hasUpdate);

      document.getElementById('update-content').innerHTML = `
        <div class="update-summary">
          ${updates.length === 0
            ? '<div class="update-all-good">✅ Everything is up to date</div>'
            : `<div class="update-count">🟡 ${updates.length} update${updates.length!==1?'s':''} available</div>`}
        </div>
        ${updates.length > 0 ? `
          <div class="update-section-label">Available Updates</div>
          ${updates.map(r => `
            <div class="update-row update-row-pending">
              <div class="update-file">${r.file}</div>
              <div class="update-desc">${r.description}</div>
              <div class="update-versions">${r.localVer} → <strong>${r.remoteVer}</strong></div>
            </div>`).join('')}` : ''}
        ${upToDate.length > 0 ? `
          <div class="update-section-label" style="margin-top:12px">Up to Date</div>
          ${upToDate.map(r => `
            <div class="update-row update-row-ok">
              <div class="update-file">✅ ${r.file}</div>
              <div class="update-versions">v${r.localVer}</div>
            </div>`).join('')}` : ''}
        ${updates.length > 0 ? `
          <button class="btn btn-primary" style="margin-top:16px" onclick="Settings.applyUpdates()">
            ⬇️ Backup & Update ${updates.length} File${updates.length!==1?'s':''}
          </button>` : ''}
        <button class="btn btn-ghost" onclick="UI.closeModal('updateModal')">Close</button>
      `;
      window._pendingUpdates = updates;
    } catch (e) {
      document.getElementById('update-content').innerHTML = `
        <div class="update-error">❌ Update failed: ${e.message}</div>
        <button class="btn btn-ghost" style="margin-top:12px" onclick="UI.closeModal('updateModal')">Close</button>
      `;
    }
  }

  async function applyUpdates() {
    const updates = window._pendingUpdates || [];
    if (!updates.length) return;
    const gh = DB.getGhConfig();

    document.getElementById('update-content').innerHTML = '<div class="update-checking"><span class="spinner"></span> Backing up current app...</div>';

    try {
      if (gh.token) await Updater.backupToGitHub('app');

      document.getElementById('update-content').innerHTML = '<div class="update-checking"><span class="spinner"></span> Applying updates...</div>';

      await Updater.applyUpdates(updates, (file, i, total) => {
        document.getElementById('update-content').innerHTML = `<div class="update-checking"><span class="spinner"></span> Updating ${file} (${i}/${total})...</div>`;
      });

      document.getElementById('update-content').innerHTML = `
        <div class="update-all-good">✅ ${updates.length} file${updates.length!==1?'s':''} updated successfully!</div>
        <p style="color:var(--text-dim);font-size:13px;text-align:center;margin:8px 0">Reloading to apply changes...</p>
      `;

      // Tell the service worker to activate immediately then reload
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
      setTimeout(() => window.location.reload(true), 1500);
    } catch (e) {
      document.getElementById('update-content').innerHTML = `<div class="update-error">❌ Update failed: ${e.message}</div><button class="btn btn-ghost" onclick="UI.closeModal('updateModal')">Close</button>`;
    }
  }

  // ── Backup ────────────────────────────────────────────────
  async function backupAll() {
    const gh = DB.getGhConfig();
    Updater.downloadDataBackup();
    if (gh.token) {
      UI.toast('Backing up to GitHub...', 'default', 5000);
      try { await Updater.backupToGitHub('both'); UI.toast('Backup complete ✓', 'success'); }
      catch (e) { UI.toast('GitHub backup failed: ' + e.message, 'error'); }
    } else { UI.toast('Data downloaded. Add GitHub token for cloud backup.', 'default', 4000); }
  }

  function backupDataOnly() {
    Updater.downloadDataBackup();
    UI.toast('Data backup downloaded', 'success');
  }

  function restoreData() {
    document.getElementById('restore-input').click();
  }

  function handleRestoreFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        UI.confirm('Restore from this backup? Current data will be replaced.', () => {
          DB.importAllData(data);
          UI.toast('Data restored ✓', 'success');
          Jobs.show();
        }, true);
      } catch { UI.toast('Invalid backup file', 'error'); }
    };
    reader.readAsText(file);
    input.value = '';
  }

  async function restoreAppFromGitHub() {
    UI.confirm('Restore app files from GitHub backup? Your data is unaffected.', async () => {
      UI.toast('Restoring from GitHub...', 'default', 5000);
      try {
        await Updater.restoreFromGitHub('app');
        UI.toast('App restored — reloading...', 'success');
        setTimeout(() => window.location.reload(true), 1500);
      } catch (e) { UI.toast('Restore failed: ' + e.message, 'error'); }
    });
  }

  async function _testGhFetch() {
    const gh = DB.getGhConfig();
    const url = `https://api.github.com/repos/${gh.username}/${gh.repo}/contents/manifest.json?ref=${gh.branch||'main'}&t=${Date.now()}`;
    document.getElementById('update-content').innerHTML = `<div class="update-checking"><span class="spinner"></span> Testing connection...</div>`;
    try {
      const res = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${gh.token}`
        }
      });
      const text = await res.text();
      document.getElementById('update-content').innerHTML = `
        <div style="background:var(--surface2);border-radius:8px;padding:12px;font-size:11px;color:var(--text-dim);word-break:break-all;line-height:1.6">
          <strong style="color:var(--text)">Status: ${res.status} ${res.statusText}</strong><br><br>
          <strong style="color:var(--text)">Response:</strong><br>${text.slice(0,300)}...
        </div>
        <button class="btn btn-ghost" style="margin-top:12px" onclick="UI.closeModal('updateModal')">Close</button>
      `;
    } catch (e) {
      document.getElementById('update-content').innerHTML = `
        <div class="update-error">❌ Fetch threw an exception</div>
        <div style="background:var(--surface2);border-radius:8px;padding:12px;margin-top:8px;font-size:11px;color:var(--text-dim);word-break:break-all">
          ${e.toString()}<br>${e.stack||''}
        </div>
        <button class="btn btn-ghost" style="margin-top:12px" onclick="UI.closeModal('updateModal')">Close</button>
      `;
    }
  }

  return {
    show, toggleGst,
    openBusinessModal, saveBusinessProfile, handleLogoUpload, removeLogo,
    openPaymentModal, savePaymentDetails,
    openRegionsModal, _regionsSearch,
    openNewRegion, openEditRegion, saveRegion, deleteRegion,
    openGhModal, saveGhConfig,
    checkUpdates, applyUpdates,
    backupAll, backupDataOnly, restoreData, handleRestoreFile, restoreAppFromGitHub
  };
})();
