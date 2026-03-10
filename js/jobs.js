/* =============================================================
   SHARP JOBS — Jobs / Work Orders Module
   Version: 1.2.0
   Description: All work order logic — list, detail, create, edit.
   To modify job behaviour or fields: edit this file only.
   ============================================================= */

const Jobs = (() => {

  let filterStatus = 'all';
  let searchQ = '';
  let editingId = null;
  const unlockedJobs = new Set(); // session-only unlock tracker

  // ── Show Jobs List ────────────────────────────────────────
  function show() {
    UI.setTab('jobs');
    render();
  }

  function render() {
    const jobs = DB.getJobs();
    const customers = DB.getCustomers();

    let filtered = jobs.filter(j => {
      const matchStatus = filterStatus === 'all' || j.status === filterStatus;
      const customer = customers.find(c => c.id === j.customerId);
      const name = customer ? customer.name.toLowerCase() : '';
      const q = searchQ.toLowerCase();
      const matchSearch = !q || name.includes(q) || j.woNumber.toLowerCase().includes(q) ||
        (j.items||[]).some(i => i.description.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    }).sort((a,b) => b.timestamps.created - a.timestamps.created);

    const counts = {
      all: jobs.length,
      not_started: jobs.filter(j=>j.status==='not_started').length,
      in_progress: jobs.filter(j=>j.status==='in_progress').length,
      completed: jobs.filter(j=>j.status==='completed').length,
      delivered: jobs.filter(j=>['delivered','mailed'].includes(j.status)).length
    };

    const pills = [
      { key: 'all', label: `All (${counts.all})` },
      { key: 'not_started', label: `Not Started (${counts.not_started})` },
      { key: 'in_progress', label: `In Progress (${counts.in_progress})` },
      { key: 'completed', label: `Completed (${counts.completed})` },
      { key: 'delivered', label: `Done (${counts.delivered})` }
    ];

    UI.render(`
      ${UI.pageHeader('Work Orders', `${jobs.length} total`)}
      <div class="search-wrap">
        <input class="search-input" placeholder="🔍  Search by customer, WO number, items..." value="${searchQ}"
          oninput="Jobs._search(this.value)" autocomplete="off">
      </div>
      <div class="filter-row">
        ${pills.map(p => `<div class="pill${filterStatus===p.key?' active':''}" onclick="Jobs._filter('${p.key}')">${p.label}</div>`).join('')}
      </div>
      ${filtered.length === 0
        ? UI.emptyState('📋', 'No work orders found', filterStatus !== 'all' ? 'Try changing the filter' : 'Tap + to create your first job')
        : filtered.map((j, i) => jobCard(j, customers, i)).join('')}
      <div style="height:10px"></div>
    `);
  }

  function jobCard(job, customers, i) {
    const customer = customers.find(c => c.id === job.customerId);
    const name = customer ? customer.name : 'Unknown Customer';
    const overdue = UI.isOverdue(job);
    const itemSummary = job.items.length ? job.items.map(i => `${i.qty}× ${i.description}`).join(', ') : 'No items';
    const total = job.items.reduce((s,i)=>s+(parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1),0);

    return `<div class="card${overdue?' card-overdue':''}" style="animation-delay:${i*25}ms" onclick="Jobs.showDetail('${job.id}')">
      <div class="card-top">
        <div>
          <div class="card-wo">${job.woNumber}</div>
          <div class="card-name">${name}</div>
          <div class="card-items">${itemSummary}</div>
        </div>
        <div class="card-right">
          ${total ? `<div class="card-price">${UI.fmtMoney(total)}</div>` : ''}
          ${overdue ? '<div class="overdue-tag">OVERDUE</div>' : ''}
        </div>
      </div>
      <div class="card-meta">
        ${UI.jobBadge(job.status)}
        <span class="card-date">${UI.fmtDate(job.timestamps.created)}</span>
        ${job.dueDate ? `<span class="due-date${overdue?' due-overdue':''}">Due ${UI.fmtDate(job.dueDate)}</span>` : ''}
        <span class="delivery-method">${job.deliveryMethod === 'mail' ? '✉️ Mail' : '🚗 Drop-off'}</span>
      </div>
    </div>`;
  }

  // ── Lock Helpers ──────────────────────────────────────────
  function isJobPaid(job) {
    if (!job.invoiceId) return false;
    const inv = DB.getInvoice(job.invoiceId);
    return inv && inv.status === 'paid';
  }
  function isLocked(job) {
    return isJobPaid(job) && !unlockedJobs.has(job.id);
  }
  function unlock(id) {
    UI.confirm(
      'This job is paid and locked. Unlock to make changes?',
      () => { unlockedJobs.add(id); showDetail(id); },
      true
    );
  }

  // ── Job Detail ────────────────────────────────────────────
  function showDetail(id) {
    const job = DB.getJob(id);
    if (!job) return;
    _currentDetailId = id;
    const customer = DB.getCustomer(job.customerId);
    const region = customer ? DB.getRegion(customer.regionId) : null;
    const overdue = UI.isOverdue(job);
    const total = job.items.reduce((s,i)=>s+(parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1),0);
    const locked = isLocked(job);
    const paid = isJobPaid(job);
    UI.setTab('jobs');
    document.getElementById('fab').style.display = 'none';

    UI.render(`
      ${UI.backBtn('Work Orders', 'Jobs.show()')}

      ${paid ? `<div class="lock-banner${locked?'':' lock-banner-unlocked'}">
        ${locked
          ? `🔒 <span>Paid & locked</span><button class="lock-unlock-btn" onclick="Jobs.unlock('${job.id}')">Unlock to Edit</button>`
          : `🔓 <span>Unlocked for editing</span>`}
      </div>` : ''}

      <div class="detail-header">
        <div class="detail-wo">${job.woNumber}</div>
        <div class="detail-name">${customer ? customer.name : 'Unknown'}</div>
        ${customer && customer.phone ? `<a href="tel:${customer.phone}" class="detail-contact">📞 ${customer.phone}</a>` : ''}
        ${region ? `<div class="detail-region">📍 ${region.name}</div>` : ''}
      </div>

      <div class="detail-status-row">
        ${UI.jobBadge(job.status)}
        ${overdue ? '<span class="badge badge-red">OVERDUE</span>' : ''}
        ${paid ? '<span class="badge badge-green">PAID</span>' : ''}
        <span class="delivery-method">${job.deliveryMethod === 'mail' ? '✉️ Mail' : '🚗 Drop-off'}</span>
      </div>

      ${job.dueDate ? `<div class="detail-due${overdue?' detail-due-overdue':''}">Due: ${UI.fmtDate(job.dueDate)}</div>` : ''}

      <div class="detail-section">
        <h3>Items</h3>
        ${job.items.length ? `
          <table class="items-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Line</th></tr></thead>
            <tbody>
              ${job.items.map(i => {
                const line = (parseFloat(i.unitPrice)||0) * (parseInt(i.qty)||1);
                return `<tr><td>${i.description}</td><td>${i.qty}</td><td>${UI.fmtMoney(i.unitPrice)}</td><td>${UI.fmtMoney(line)}</td></tr>`;
              }).join('')}
            </tbody>
            <tfoot><tr><td colspan="3"><strong>Total</strong></td><td><strong>${UI.fmtMoney(total)}</strong></td></tr></tfoot>
          </table>` : '<p class="no-items">No items added</p>'}
      </div>

      ${job.notes ? `<div class="detail-section"><h3>Notes</h3><p class="detail-notes">${job.notes}</p></div>` : ''}

      <div class="detail-section">
        <h3>Timeline</h3>
        <div class="timeline">
          ${timelineRow('Created',          job.timestamps.created,   null,        true)}
          ${timelineRow('Date Started',     job.timestamps.started,   'started',   locked)}
          ${timelineRow('Date Completed',   job.timestamps.completed, 'completed', locked)}
          ${timelineRow('Date Delivered',   job.timestamps.delivered, 'delivered', locked)}
        </div>
        ${!locked && job.timestamps.delivered ? `
          <div class="delivery-type-row">
            <span class="detail-label">Delivery type</span>
            <div class="seg-ctrl">
              <button class="seg-btn${job.status==='delivered'?' seg-active':''}" onclick="Jobs.setDeliveryType('${job.id}','delivered')">🚗 Drop-off</button>
              <button class="seg-btn${job.status==='mailed'?' seg-active':''}" onclick="Jobs.setDeliveryType('${job.id}','mailed')">✉️ Mailed</button>
            </div>
          </div>` : ''}
        ${!locked ? `<div class="timeline-hint">Tap a date to set or clear it</div>` : ''}
      </div>

      <div class="detail-actions">
        ${locked ? '' : statusActions(job)}
        ${locked ? '' : `<button class="btn btn-ghost" onclick="Jobs.openEdit('${job.id}')">✏️ Edit Job</button>`}
        ${!locked && (job.status === 'completed' || job.status === 'delivered' || job.status === 'mailed')
          ? job.invoiceId
            ? `<button class="btn btn-ghost" onclick="Invoices.showDetail('${job.invoiceId}')">🧾 View Invoice</button>`
            : `<button class="btn btn-primary" onclick="Jobs.convertToInvoice('${job.id}')">🧾 Convert to Invoice</button>`
          : job.invoiceId ? `<button class="btn btn-ghost" onclick="Invoices.showDetail('${job.invoiceId}')">🧾 View Invoice</button>` : ''}
        ${locked ? '' : `<button class="btn btn-danger-ghost" onclick="UI.confirm('Delete ${job.woNumber}? This cannot be undone.', () => Jobs.delete('${job.id}'))">Delete Job</button>`}
      </div>
    `);
  }

  function timelineRow(label, ts, field, readOnly) {
    const dateVal = ts ? new Date(ts).toISOString().split('T')[0] : '';
    const timeVal = ts ? new Date(ts).toTimeString().slice(0,5) : '';
    if (readOnly || !field) {
      return `<div class="timeline-row">
        <span class="timeline-label">${label}</span>
        <span class="timeline-val${ts?'':' timeline-empty'}">${ts ? UI.fmtDateTime(ts) : '—'}</span>
      </div>`;
    }
    // Editable row — date + time pickers
    const jobId = _currentDetailId;
    return `<div class="timeline-row timeline-row-edit">
      <span class="timeline-label">${label}</span>
      <div class="timeline-inputs">
        <input type="date" id="ti-date-${field}" class="timeline-date-input" value="${dateVal}"
          onchange="Jobs._updateTimestamp('${jobId}','${field}',this.value,document.getElementById('ti-time-${field}').value)">
        <input type="time" id="ti-time-${field}" class="timeline-time-input" value="${timeVal}"
          onchange="Jobs._updateTimestamp('${jobId}','${field}',document.getElementById('ti-date-${field}').value,this.value)">
      </div>
    </div>`;
  }

  // store current detail id for timeline row callbacks
  let _currentDetailId = null;

  function statusActions(job) {
    // Status is now driven entirely by dates — no manual status buttons
    // Dates are shown as editable fields in the timeline section
    return '';
  }

  // ── Status Change ─────────────────────────────────────────
  function setStatus(id, status) {
    DB.updateJobStatus(id, status);
    UI.toast(`Status updated`, 'success');
    showDetail(id);
  }

  // ── Revert Status ─────────────────────────────────────────
  function revertStatus(id, prevStatus) {
    const job = DB.getJob(id);
    if (!job) return;
    // Clear timestamps for the status being reverted from
    const timestamps = { ...job.timestamps };
    if (job.status === 'in_progress') timestamps.started = null;
    if (job.status === 'completed') timestamps.completed = null;
    if (job.status === 'delivered' || job.status === 'mailed') timestamps.delivered = null;
    DB.updateJob(id, { status: prevStatus, timestamps });
    UI.toast('Status reverted', 'success');
    showDetail(id);
  }

  // ── Edit Timestamps ───────────────────────────────────────
  function _updateTimestamp(id, field, dateVal, timeVal) {
    const job = DB.getJob(id);
    const timestamps = { ...job.timestamps };

    if (!dateVal) {
      timestamps[field] = null;
    } else {
      const ts = new Date(`${dateVal}T${timeVal || '00:00'}`).getTime();
      if (isNaN(ts)) return;
      timestamps[field] = ts;
    }

    // Derive status from dates
    let status = 'not_started';
    if (timestamps.started)   status = 'in_progress';
    if (timestamps.completed) status = 'completed';
    if (timestamps.delivered) {
      // Preserve delivered vs mailed — if previously mailed keep mailed
      status = (job.status === 'mailed') ? 'mailed' : 'delivered';
    }

    DB.updateJob(id, { timestamps, status });
    UI.toast(dateVal ? 'Date updated' : 'Date cleared', 'success');
    showDetail(id);
  }

  // ── Delivered vs Mailed toggle ────────────────────────────
  function setDeliveryType(id, type) {
    const job = DB.getJob(id);
    if (!job || !job.timestamps.delivered) return;
    DB.updateJob(id, { status: type });
    showDetail(id);
  }

  // ── Convert to Invoice ────────────────────────────────────
  function convertToInvoice(jobId) {
    const inv = DB.createInvoiceFromJob(jobId);
    if (inv) { UI.toast('Invoice created', 'success'); Invoices.showDetail(inv.id); }
    else UI.toast('Could not create invoice', 'error');
  }

  // ── Delete ────────────────────────────────────────────────
  function del(id) {
    DB.deleteJob(id);
    UI.toast('Job deleted');
    show();
  }

  // ── New / Edit Job Modal ──────────────────────────────────
  let itemRows = [];

  function openNew() {
    editingId = null;
    itemRows = [{ id: DB.uid(), description: '', qty: 1, unitPrice: '' }];
    _populateModal(null);
    UI.openModal('jobModal');
  }

  function openEdit(id) {
    const job = DB.getJob(id);
    if (!job) return;
    editingId = id;
    itemRows = job.items.length ? job.items.map(i => ({...i})) : [{ id: DB.uid(), description: '', qty: 1, unitPrice: '' }];
    _populateModal(job);
    UI.openModal('jobModal');
  }

  function _populateModal(job) {
    const customers = DB.getCustomers();
    document.getElementById('modalTitle').textContent = job ? `Edit ${job.woNumber}` : 'New Work Order';
    document.getElementById('jm-customer').innerHTML =
      `<option value="">Select customer...</option>` +
      customers.map(c => `<option value="${c.id}"${job && job.customerId===c.id?' selected':''}>${c.name}</option>`).join('') +
      `<option value="__new__">+ Add new customer</option>`;
    document.getElementById('jm-delivery').value = job ? job.deliveryMethod : 'dropoff';
    document.getElementById('jm-notes').value = job ? job.notes : '';

    const dueDate = job && job.dueDate ? new Date(job.dueDate).toISOString().split('T')[0] : '';
    document.getElementById('jm-due').value = dueDate;

    _renderItemRows();
    _updateDueFromCustomer();
  }

  function _renderItemRows() {
    const container = document.getElementById('jm-items');
    container.innerHTML = itemRows.map((item, idx) => `
      <div class="item-row" id="ir-${item.id}">
        <input class="item-desc" type="text" placeholder="Description" value="${item.description}"
          oninput="Jobs._itemChange('${item.id}','description',this.value)" autocomplete="off">
        <div class="item-nums">
          <input class="item-qty" type="number" placeholder="Qty" value="${item.qty}" min="1"
            oninput="Jobs._itemChange('${item.id}','qty',this.value)">
          <input class="item-price" type="number" placeholder="Unit $" value="${item.unitPrice}" step="0.5" min="0"
            oninput="Jobs._itemChange('${item.id}','price',this.value)">
          <button class="item-del" onclick="Jobs._removeItem('${item.id}')" ${itemRows.length===1?'disabled':''}>✕</button>
        </div>
      </div>`).join('');
    _updateItemTotal();
  }

  function _updateItemTotal() {
    const total = itemRows.reduce((s,i)=>(s+(parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1)),0);
    const el = document.getElementById('jm-total');
    if (el) el.textContent = UI.fmtMoney(total);
  }

  function _itemChange(id, field, val) {
    const item = itemRows.find(i => i.id === id);
    if (!item) return;
    if (field === 'description') item.description = val;
    if (field === 'qty') item.qty = val;
    if (field === 'price') item.unitPrice = val;
    _updateItemTotal();
  }

  function _addItem() {
    itemRows.push({ id: DB.uid(), description: '', qty: 1, unitPrice: '' });
    _renderItemRows();
  }

  function _removeItem(id) {
    if (itemRows.length === 1) return;
    itemRows = itemRows.filter(i => i.id !== id);
    _renderItemRows();
  }

  function _search(q) { searchQ = q; render(); }
  function _filter(s) { filterStatus = s; render(); }

  function _updateDueFromCustomer() {
    const customerId = document.getElementById('jm-customer').value;
    if (!customerId || customerId === '__new__') return;
    const existing = document.getElementById('jm-due').value;
    if (existing && !editingId) return; // don't override if already set
    const due = DB.calcDueDate(customerId);
    if (due) document.getElementById('jm-due').value = new Date(due).toISOString().split('T')[0];
  }

  function _onCustomerChange(val) {
    if (val === '__new__') { UI.closeModal('jobModal'); Customers.openNew(true); return; }
    _updateDueFromCustomer();
  }

  function _refreshCustomerSelect(newCustomerId) {
    const customers = DB.getCustomers();
    const sel = document.getElementById('jm-customer');
    if (!sel) return;
    sel.innerHTML =
      `<option value="">Select customer...</option>` +
      customers.map(c => `<option value="${c.id}"${c.id === newCustomerId ? ' selected' : ''}>${c.name}</option>`).join('') +
      `<option value="__new__">+ Add new customer</option>`;
    _updateDueFromCustomer();
  }

  function save() {
    const customerId = document.getElementById('jm-customer').value;
    if (!customerId || customerId === '__new__') { UI.toast('Please select a customer', 'error'); return; }
    const dueVal = document.getElementById('jm-due').value;
    const dueDate = dueVal ? new Date(dueVal).getTime() : null;
    const calcDue = DB.calcDueDate(customerId);
    const dueDateOverridden = dueDate && calcDue && dueDate !== calcDue;
    const data = {
      customerId,
      deliveryMethod: document.getElementById('jm-delivery').value,
      items: itemRows.filter(i => i.description.trim()),
      dueDate,
      dueDateOverridden,
      notes: document.getElementById('jm-notes').value.trim()
    };
    if (editingId) {
      DB.updateJob(editingId, data);
      UI.toast('Job updated', 'success');
      UI.closeModal('jobModal');
      showDetail(editingId);
    } else {
      const job = DB.addJob(data);
      UI.toast(`${job.woNumber} created`, 'success');
      UI.closeModal('jobModal');
      show();
    }
  }

  return {
    show, showDetail, openNew, openEdit, save, setStatus, revertStatus, unlock, convertToInvoice, setDeliveryType,
    delete: del,
    _search, _filter, _addItem, _removeItem, _itemChange, _onCustomerChange, _refreshCustomerSelect, _updateTimestamp
  };
})();
