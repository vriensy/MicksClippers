/* =============================================================
   SHARP JOBS — Customers Module
   Version: 1.0.0
   Description: Customer list, detail, add/edit with region support.
   To modify customer behaviour or fields: edit this file only.
   ============================================================= */

const Customers = (() => {

  let editingId = null;
  let returnToJobModal = false;

  function show() {
    UI.setTab('customers');
    document.getElementById('fab').style.display = 'flex';
    render();
  }

  function render() {
    const customers = DB.getCustomers().sort((a,b)=>a.name.localeCompare(b.name));
    const jobs = DB.getJobs();
    const regions = DB.getRegions();

    UI.render(`
      ${UI.pageHeader('Customers', `${customers.length} customer${customers.length!==1?'s':''}`)}
      ${customers.length === 0
        ? UI.emptyState('👤', 'No customers yet', 'Tap + to add your first customer')
        : customers.map((c, i) => {
            const cJobs = jobs.filter(j => j.customerId === c.id);
            const region = regions.find(r => r.id === c.regionId);
            const active = cJobs.filter(j => !['delivered','mailed'].includes(j.status)).length;
            const spent = cJobs.reduce((s,j)=>s+j.items.reduce((ss,i)=>ss+(parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1),0),0);
            return `<div class="cust-card" style="animation-delay:${i*25}ms" onclick="Customers.showDetail('${c.id}')">
              <div class="cust-name">${c.name}</div>
              <div class="cust-meta">
                ${region ? `<span class="cust-region">📍 ${region.name}</span> · ` : ''}
                ${cJobs.length} job${cJobs.length!==1?'s':''} · ${UI.fmtMoney(spent)}
                ${active ? ` · <span style="color:var(--amber)">${active} active</span>` : ''}
              </div>
              ${c.phone ? `<div class="cust-contact">${c.phone}</div>` : ''}
            </div>`;
          }).join('')}
      <div style="height:10px"></div>
    `);
  }

  function showDetail(id) {
    const customer = DB.getCustomer(id);
    if (!customer) return;
    const jobs = DB.getJobs().filter(j => j.customerId === id).sort((a,b)=>b.timestamps.created-a.timestamps.created);
    const invoices = DB.getInvoices().filter(i => i.customerId === id);
    const region = DB.getRegion(customer.regionId);
    const spent = invoices.reduce((s,i)=>s+i.total,0);
    const paid = invoices.reduce((s,i)=>s+i.amountPaid,0);
    UI.setTab('customers');
    document.getElementById('fab').style.display = 'none';

    UI.render(`
      ${UI.backBtn('Customers', 'Customers.show()')}
      <div class="detail-header">
        <div class="detail-name">${customer.name}</div>
        ${customer.phone ? `<a href="tel:${customer.phone}" class="detail-contact">📞 ${customer.phone}</a>` : ''}
        ${customer.email ? `<a href="mailto:${customer.email}" class="detail-contact">✉️ ${customer.email}</a>` : ''}
        ${customer.address ? `<div class="detail-contact">📍 ${customer.address}</div>` : ''}
        ${region ? `<div class="detail-region-tag">Region: ${region.name} · ${region.turnaroundDays}d turnaround</div>` : ''}
      </div>

      <div class="detail-stats-row">
        <div class="mini-stat"><div class="mini-val">${jobs.length}</div><div class="mini-label">Jobs</div></div>
        <div class="mini-stat"><div class="mini-val">${UI.fmtMoney(spent)}</div><div class="mini-label">Invoiced</div></div>
        <div class="mini-stat"><div class="mini-val">${UI.fmtMoney(paid)}</div><div class="mini-label">Paid</div></div>
      </div>

      <div class="detail-actions">
        <button class="btn btn-primary" onclick="Customers.openEdit('${id}')">✏️ Edit Customer</button>
        <button class="btn btn-danger-ghost" onclick="UI.confirm('Delete ${customer.name}? Their job history will remain.', () => Customers._del('${id}'))">Delete Customer</button>
      </div>

      ${jobs.length ? UI.sectionLabel('Work Orders') : ''}
      ${jobs.map(j => {
        const total = j.items.reduce((s,i)=>s+(parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1),0);
        return `<div class="card" onclick="Jobs.showDetail('${j.id}')">
          <div class="card-top">
            <div><div class="card-wo">${j.woNumber}</div><div class="card-items">${j.items.map(i=>`${i.qty}× ${i.description}`).join(', ')||'No items'}</div></div>
            <div class="card-right">${total?`<div class="card-price">${UI.fmtMoney(total)}</div>`:''}</div>
          </div>
          <div class="card-meta">${UI.jobBadge(j.status)}<span class="card-date">${UI.fmtDate(j.timestamps.created)}</span></div>
        </div>`;
      }).join('')}
      <div style="height:10px"></div>
    `);
  }

  // ── Modal ─────────────────────────────────────────────────
  function openNew(returnToJob = false) {
    editingId = null;
    returnToJobModal = returnToJob;
    _populateModal(null);
    UI.openModal('customerModal');
  }

  function openEdit(id) {
    editingId = id;
    returnToJobModal = false;
    _populateModal(DB.getCustomer(id));
    UI.openModal('customerModal');
  }

  function _populateModal(customer) {
    const regions = DB.getRegions();
    document.getElementById('cm-title').textContent = customer ? 'Edit Customer' : 'New Customer';
    document.getElementById('cm-name').value = customer ? customer.name : '';
    document.getElementById('cm-phone').value = customer ? customer.phone : '';
    document.getElementById('cm-email').value = customer ? customer.email : '';
    document.getElementById('cm-address').value = customer ? customer.address : '';
    document.getElementById('cm-region').innerHTML =
      `<option value="">No region</option>` +
      regions.map(r=>`<option value="${r.id}"${customer&&customer.regionId===r.id?' selected':''}>${r.name} (${r.turnaroundDays}d)</option>`).join('') +
      `<option value="__new__">+ Add new region</option>`;
    const delBtn = document.getElementById('cm-delete');
    if (delBtn) delBtn.style.display = customer ? 'block' : 'none';
  }

  function onRegionChange(val) {
    if (val === '__new__') {
      UI.closeModal('customerModal');
      Settings.openNewRegion(true);
    }
  }

  function save() {
    const name = document.getElementById('cm-name').value.trim();
    if (!name) { UI.toast('Name is required', 'error'); return; }
    const regionVal = document.getElementById('cm-region').value;
    const data = {
      name,
      phone: document.getElementById('cm-phone').value.trim(),
      email: document.getElementById('cm-email').value.trim(),
      address: document.getElementById('cm-address').value.trim(),
      regionId: regionVal === '__new__' ? '' : regionVal
    };
    if (editingId) {
      DB.updateCustomer(editingId, data);
      UI.toast('Customer updated', 'success');
      UI.closeModal('customerModal');
      showDetail(editingId);
    } else {
      const c = DB.addCustomer(data);
      UI.toast(`${c.name} added`, 'success');
      UI.closeModal('customerModal');
      if (returnToJobModal) { UI.openModal('jobModal'); Jobs._refreshCustomerSelect(c.id); }
      else show();
    }
  }

  function del(id) {
    DB.deleteCustomer(id);
    UI.toast('Customer deleted');
    UI.closeModal('customerModal');
    show();
  }

  return { show, showDetail, openNew, openEdit, save, delete: del, _del: del, onRegionChange };
})();
