/* =============================================================
   SHARP JOBS — Invoices Module
   Version: 1.1.0
   Description: Invoice list, detail, payment tracking, PDF/print.
   To modify invoice behaviour or layout: edit this file only.
   ============================================================= */

const Invoices = (() => {

  let filterStatus = 'all';
  let adhocItemRows = [];

  function show() {
    UI.setTab('invoices');
    document.getElementById('fab').style.display = 'flex';
    DB.checkOverdueInvoices();
    render();
  }

  function render() {
    const invoices = DB.getInvoices().sort((a,b)=>b.createdAt-a.createdAt);
    const customers = DB.getCustomers();

    const filtered = filterStatus === 'all' ? invoices : invoices.filter(i => i.status === filterStatus);
    const counts = {
      all: invoices.length,
      draft: invoices.filter(i=>i.status==='draft').length,
      sent: invoices.filter(i=>i.status==='sent').length,
      partial: invoices.filter(i=>i.status==='partial').length,
      paid: invoices.filter(i=>i.status==='paid').length,
      overdue: invoices.filter(i=>i.status==='overdue').length
    };

    UI.render(`
      ${UI.pageHeader('Invoices', `${invoices.length} total`)}
      <div class="filter-row">
        ${[['all',`All (${counts.all})`],['draft',`Draft (${counts.draft})`],['sent',`Sent (${counts.sent})`],
           ['partial',`Part Paid (${counts.partial})`],['paid',`Paid (${counts.paid})`],['overdue',`Overdue (${counts.overdue})`]]
          .map(([k,l])=>`<div class="pill${filterStatus===k?' active':''}" onclick="Invoices._filter('${k}')">${l}</div>`).join('')}
      </div>
      ${filtered.length === 0
        ? UI.emptyState('🧾', 'No invoices', 'Convert a completed work order to create an invoice')
        : filtered.map((inv, i) => {
            const customer = customers.find(c => c.id === inv.customerId);
            const name = customer ? customer.name : 'Unknown';
            const remaining = inv.total - inv.amountPaid;
            return `<div class="card" style="animation-delay:${i*25}ms" onclick="Invoices.showDetail('${inv.id}')">
              <div class="card-top">
                <div>
                  <div class="card-wo">${inv.invNumber}</div>
                  <div class="card-name">${name}</div>
                </div>
                <div class="card-right"><div class="card-price">${UI.fmtMoney(inv.total)}</div></div>
              </div>
              <div class="card-meta">
                ${UI.invBadge(inv.status)}
                <span class="card-date">${UI.fmtDate(inv.createdAt)}</span>
                ${inv.status !== 'paid' ? `<span class="card-date">Due ${UI.fmtDate(inv.paymentDueDate)}</span>` : ''}
                ${inv.status === 'partial' ? `<span style="color:var(--amber)">Remaining: ${UI.fmtMoney(remaining)}</span>` : ''}
              </div>
            </div>`;
          }).join('')}
      <div style="height:10px"></div>
    `);
  }

  function showDetail(id) {
    const inv = DB.getInvoice(id);
    if (!inv) return;
    const customer = DB.getCustomer(inv.customerId);
    const settings = DB.getSettings();
    const remaining = inv.total - inv.amountPaid;
    UI.setTab('invoices');
    document.getElementById('fab').style.display = 'none';

    UI.render(`
      ${UI.backBtn('Invoices', 'Invoices.show()')}

      <div class="detail-header">
        <div class="detail-wo">${inv.invNumber}</div>
        <div class="detail-name">${customer ? customer.name : 'Unknown'}</div>
        ${customer && customer.phone ? `<div class="detail-contact">📞 ${customer.phone}</div>` : ''}
        ${customer && customer.email ? `<div class="detail-contact">✉️ ${customer.email}</div>` : ''}
      </div>

      <div class="detail-status-row">
        ${UI.invBadge(inv.status)}
        ${inv.gstEnabled ? '<span class="badge badge-grey">GST Inc.</span>' : ''}
      </div>

      <div class="detail-section">
        <h3>${inv.gstEnabled ? 'Tax Invoice' : 'Invoice'} Summary</h3>
        <table class="items-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Line</th></tr></thead>
          <tbody>
            ${inv.items.map(i => {
              const line = (parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1);
              return `<tr><td>${i.description}</td><td>${i.qty}</td><td>${UI.fmtMoney(i.unitPrice)}</td><td>${UI.fmtMoney(line)}</td></tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="3">Subtotal</td><td>${UI.fmtMoney(inv.subtotal)}</td></tr>
            ${inv.gstEnabled ? `<tr><td colspan="3">GST (10%)</td><td>${UI.fmtMoney(inv.gstAmount)}</td></tr>` : ''}
            <tr><td colspan="3"><strong>Total</strong></td><td><strong>${UI.fmtMoney(inv.total)}</strong></td></tr>
            ${inv.amountPaid > 0 ? `<tr><td colspan="3">Paid</td><td style="color:var(--green)">${UI.fmtMoney(inv.amountPaid)}</td></tr>` : ''}
            ${inv.status !== 'paid' ? `<tr><td colspan="3"><strong>Remaining</strong></td><td style="color:var(--amber)"><strong>${UI.fmtMoney(remaining)}</strong></td></tr>` : ''}
          </tfoot>
        </table>
      </div>

      <div class="detail-section">
        <h3>Payment Info</h3>
        <div class="detail-row"><span class="detail-label">Due Date</span><span class="detail-val">${UI.fmtDate(inv.paymentDueDate)}</span></div>
        ${settings.bsb ? `<div class="detail-row"><span class="detail-label">BSB</span><span class="detail-val">${settings.bsb}</span></div>` : ''}
        ${settings.accountNumber ? `<div class="detail-row"><span class="detail-label">Account</span><span class="detail-val">${settings.accountNumber}</span></div>` : ''}
        ${settings.accountName ? `<div class="detail-row"><span class="detail-label">Name</span><span class="detail-val">${settings.accountName}</span></div>` : ''}
      </div>

      ${inv.payments.length ? `
        <div class="detail-section">
          <h3>Payment History</h3>
          ${inv.payments.map(p=>`
            <div class="detail-row">
              <span class="detail-label">${UI.fmtDate(p.date)} · ${p.method}</span>
              <span class="detail-val" style="color:var(--green)">${UI.fmtMoney(p.amount)}</span>
            </div>`).join('')}
        </div>` : ''}

      <div class="detail-actions">
        ${inv.status !== 'paid' ? `<button class="btn btn-primary" onclick="Invoices.openPayment('${id}')">💰 Record Payment</button>` : ''}
        ${inv.status === 'draft' ? `<button class="btn btn-status-blue" onclick="Invoices.markSent('${id}')">📤 Mark as Sent</button>` : ''}
        <button class="btn btn-ghost" onclick="Invoices.printView('${id}')">🖨️ Print / PDF</button>
        <button class="btn btn-danger-ghost" onclick="UI.confirm('Delete ${inv.invNumber}?', () => Invoices.delete('${id}'))">Delete Invoice</button>
      </div>
    `);
  }

  // ── Payment Modal ─────────────────────────────────────────
  let payingInvoiceId = null;
  function openPayment(id) {
    payingInvoiceId = id;
    const inv = DB.getInvoice(id);
    const remaining = inv ? (inv.total - inv.amountPaid) : 0;
    document.getElementById('pay-amount').value = remaining > 0 ? remaining.toFixed(2) : '';
    document.getElementById('pay-method').value = 'cash';
    document.getElementById('pay-note').value = '';
    UI.openModal('invoicePaymentModal');
  }

  function savePayment() {
    const amount = parseFloat(document.getElementById('pay-amount').value);
    if (!amount || amount <= 0) { UI.toast('Enter a valid amount', 'error'); return; }
    DB.addPayment(payingInvoiceId, {
      amount,
      method: document.getElementById('pay-method').value,
      note: document.getElementById('pay-note').value.trim()
    });
    UI.toast('Payment recorded', 'success');
    UI.closeModal('invoicePaymentModal');
    showDetail(payingInvoiceId);
  }

  function markSent(id) {
    DB.updateInvoice(id, { status: 'sent', sentAt: Date.now() });
    UI.toast('Marked as sent', 'success');
    showDetail(id);
  }

  function del(id) {
    const inv = DB.getInvoice(id);
    // Clear the invoiceId on the linked job so it can be re-invoiced
    if (inv && inv.woId) DB.updateJob(inv.woId, { invoiceId: null });
    DB.deleteInvoice(id);
    UI.toast('Invoice deleted');
    show();
  }

  // ── Print View (in-app, iOS safe) ─────────────────────────
  function printView(id) {
    const inv = DB.getInvoice(id);
    const customer = DB.getCustomer(inv.customerId);
    const settings = DB.getSettings();
    const title = inv.gstEnabled ? 'Tax Invoice' : 'Invoice';

    const printHTML = `
      <div class="print-close-bar">
        <button class="btn btn-ghost btn-sm" onclick="Invoices._closePrint()" style="width:auto;padding:8px 16px">✕ Close</button>
        <button class="btn btn-primary btn-sm" onclick="window.print()" style="width:auto;padding:8px 16px">🖨️ Print / Save PDF</button>
      </div>
      <div class="print-doc" id="printDoc">
        <div class="pdoc-header">
          <div>
            ${settings.logo ? `<img src="${settings.logo}" class="pdoc-logo">` : ''}
            <div class="pdoc-bizname">${settings.businessName || 'Your Business'}</div>
            ${settings.abn ? `<div class="pdoc-abn">ABN: ${settings.abn}</div>` : ''}
            <div class="pdoc-bizdetail">
              ${[settings.address, settings.phone, settings.email].filter(Boolean).join('<br>')}
            </div>
          </div>
          <div class="pdoc-invblock">
            <div class="pdoc-title">${title}</div>
            <div class="pdoc-meta">${inv.invNumber}</div>
            <div class="pdoc-meta">Date: ${UI.fmtDate(inv.createdAt)}</div>
            <div class="pdoc-meta">Due: ${UI.fmtDate(inv.paymentDueDate)}</div>
          </div>
        </div>
        ${customer ? `<div class="pdoc-to">
          <div class="pdoc-to-label">Bill To</div>
          <strong>${customer.name}</strong><br>
          ${[customer.phone, customer.email, customer.address].filter(Boolean).join('<br>')}
        </div>` : ''}
        <table class="pdoc-table">
          <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
          <tbody>
            ${inv.items.map(i => `<tr><td>${i.description}</td><td>${i.qty}</td><td>${UI.fmtMoney(i.unitPrice)}</td><td>${UI.fmtMoney((parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1))}</td></tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="3">Subtotal</td><td>${UI.fmtMoney(inv.subtotal)}</td></tr>
            ${inv.gstEnabled ? `<tr><td colspan="3">GST (10%)</td><td>${UI.fmtMoney(inv.gstAmount)}</td></tr>` : ''}
            <tr class="pdoc-total-row"><td colspan="3"><strong>Total</strong></td><td><strong>${UI.fmtMoney(inv.total)}</strong></td></tr>
          </tfoot>
        </table>
        ${(settings.bsb || settings.accountNumber) ? `<div class="pdoc-payment">
          <div class="pdoc-payment-label">Payment Details</div>
          ${settings.accountName ? `<strong>${settings.accountName}</strong><br>` : ''}
          ${settings.bsb ? `BSB: ${settings.bsb}<br>` : ''}
          ${settings.accountNumber ? `Account: ${settings.accountNumber}` : ''}
        </div>` : ''}
      </div>`;

    document.getElementById('fab').style.display = 'none';
    UI.render(printHTML);
  }

  function _closePrint() { showDetail(DB.getInvoices()[0]?.id); Invoices.show(); }

  // ── Ad-hoc Invoice ────────────────────────────────────────
  function openAdHoc() {
    adhocItemRows = [{ id: DB.uid(), description: '', qty: 1, unitPrice: '' }];
    const customers = DB.getCustomers();
    const settings = DB.getSettings();
    document.getElementById('ai-customer').innerHTML =
      `<option value="">No customer (walk-in)</option>` +
      customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('ai-gst').checked = settings.gstEnabled;
    const defaultDue = new Date(Date.now() + settings.paymentTermsDays * 86400000).toISOString().split('T')[0];
    document.getElementById('ai-due').value = defaultDue;
    _renderAdhocItems();
    UI.openModal('adhocInvModal');
  }

  function _renderAdhocItems() {
    const container = document.getElementById('ai-items');
    container.innerHTML = adhocItemRows.map(item => `
      <div class="item-row">
        <input class="item-desc" type="text" placeholder="Description" value="${item.description}"
          oninput="Invoices._adhocItemChange('${item.id}','description',this.value)" autocomplete="off">
        <div class="item-nums">
          <input class="item-qty" type="number" placeholder="Qty" value="${item.qty}" min="1"
            oninput="Invoices._adhocItemChange('${item.id}','qty',this.value)">
          <input class="item-price" type="number" placeholder="Unit $" value="${item.unitPrice}" step="0.5" min="0"
            oninput="Invoices._adhocItemChange('${item.id}','price',this.value)">
          <button class="item-del" onclick="Invoices._adhocRemoveItem('${item.id}')" ${adhocItemRows.length===1?'disabled':''}>✕</button>
        </div>
      </div>`).join('');
    _updateAdhocTotal();
  }

  function _updateAdhocTotal() {
    const total = adhocItemRows.reduce((s,i)=>s+(parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1),0);
    const el = document.getElementById('ai-total');
    if (el) el.textContent = UI.fmtMoney(total);
  }

  function _adhocItemChange(id, field, val) {
    const item = adhocItemRows.find(i => i.id === id);
    if (!item) return;
    if (field === 'description') item.description = val;
    if (field === 'qty') item.qty = val;
    if (field === 'price') item.unitPrice = val;
    _updateAdhocTotal();
  }

  function _adhocAddItem() {
    adhocItemRows.push({ id: DB.uid(), description: '', qty: 1, unitPrice: '' });
    _renderAdhocItems();
  }

  function _adhocRemoveItem(id) {
    if (adhocItemRows.length === 1) return;
    adhocItemRows = adhocItemRows.filter(i => i.id !== id);
    _renderAdhocItems();
  }

  function saveAdHoc() {
    const items = adhocItemRows.filter(i => i.description.trim());
    if (!items.length) { UI.toast('Add at least one item', 'error'); return; }
    const dueVal = document.getElementById('ai-due').value;
    const inv = DB.createAdHocInvoice({
      customerId: document.getElementById('ai-customer').value || null,
      items,
      gstEnabled: document.getElementById('ai-gst').checked,
      paymentDueDate: dueVal ? new Date(dueVal).getTime() : null
    });
    UI.toast(`${inv.invNumber} created`, 'success');
    UI.closeModal('adhocInvModal');
    showDetail(inv.id);
  }

  function _filter(s) { filterStatus = s; render(); }

  return {
    show, showDetail, openPayment, savePayment, markSent, printView, _closePrint,
    openAdHoc, saveAdHoc, _adhocAddItem, _adhocRemoveItem, _adhocItemChange,
    delete: del, _filter
  };
})();
