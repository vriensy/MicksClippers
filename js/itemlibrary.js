/* =============================================================
   SHARP JOBS — Item Library Module
   Version: 1.0.0
   Description: Manage saved items (name, description, price)
   used as quick-pick options when creating work orders / invoices.
   ============================================================= */

const ItemLibrary = (() => {

  let editingId = null;

  function show() {
    UI.setTab('settings'); // lives under settings nav
  }

  // ── Modal: list and manage ────────────────────────────────
  function openModal() {
    _render();
    UI.openModal('itemLibraryModal');
  }

  function _render() {
    const items = DB.getItemLibrary().sort((a,b) => a.name.localeCompare(b.name));
    const container = document.getElementById('ilm-list');
    if (!container) return;
    container.innerHTML = items.length === 0
      ? `<div style="text-align:center;color:var(--text-dim);padding:20px;font-size:13px">No items yet. Add your first.</div>`
      : items.map(item => `
          <div class="settings-row" onclick="ItemLibrary.openEdit('${item.id}')">
            <div class="settings-text">
              <div class="settings-title">${item.name}</div>
              <div class="settings-desc">${item.description ? item.description + ' · ' : ''}${UI.fmtMoney(item.unitPrice)}</div>
            </div>
            <div class="settings-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
          </div>`).join('');
  }

  // ── Add / Edit item ───────────────────────────────────────
  function openNew() {
    editingId = null;
    document.getElementById('ili-modal-title').textContent = 'New Item';
    document.getElementById('ili-name').value = '';
    document.getElementById('ili-desc').value = '';
    document.getElementById('ili-price').value = '';
    document.getElementById('ili-delete').style.display = 'none';
    UI.openModal('itemLibraryItemModal');
  }

  function openEdit(id) {
    const item = DB.getLibraryItem(id);
    if (!item) return;
    editingId = id;
    document.getElementById('ili-modal-title').textContent = 'Edit Item';
    document.getElementById('ili-name').value = item.name;
    document.getElementById('ili-desc').value = item.description || '';
    document.getElementById('ili-price').value = item.unitPrice || '';
    document.getElementById('ili-delete').style.display = 'block';
    UI.openModal('itemLibraryItemModal');
  }

  function save() {
    const name = document.getElementById('ili-name').value.trim();
    if (!name) { UI.toast('Name is required', 'error'); return; }
    const data = {
      name,
      description: document.getElementById('ili-desc').value.trim(),
      unitPrice: parseFloat(document.getElementById('ili-price').value) || 0
    };
    if (editingId) {
      DB.updateLibraryItem(editingId, data);
      UI.toast('Item updated', 'success');
    } else {
      DB.addLibraryItem(data);
      UI.toast(`${name} added`, 'success');
    }
    UI.closeModal('itemLibraryItemModal');
    _render();
  }

  function del() {
    if (!editingId) return;
    DB.deleteLibraryItem(editingId);
    UI.toast('Item deleted');
    UI.closeModal('itemLibraryItemModal');
    _render();
  }

  return { openModal, openNew, openEdit, save, del };
})();
