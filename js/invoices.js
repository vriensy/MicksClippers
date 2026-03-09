/* =============================================================
   SHARP JOBS — Invoices Module
   Version: 1.0.0
   Description: Invoice list, detail, payment tracking, PDF/print.
   To modify invoice behaviour or layout: edit this file only.
   ============================================================= */

const Invoices = (() => {

  let filterStatus = 'all';

  function show() {
    UI.setTab('invoices');
    document.getElementById('fab').style.display = 'none';
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
    document.getElementById('pay-amount').value = '';
    document.getElementById('pay-method').value = 'cash';
    document.getElementById('pay-note').value = '';
    UI.openModal('paymentModal');
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
    UI.closeModal('paymentModal');
    showDetail(payingInvoiceId);
  }

  function markSent(id) {
    DB.updateInvoice(id, { status: 'sent', sentAt: Date.now() });
    UI.toast('Marked as sent', 'success');
    showDetail(id);
  }

  function del(id) {
    DB.deleteInvoice(id);
    UI.toast('Invoice deleted');
    show();
  }

  // ── Print View ────────────────────────────────────────────
  function printView(id) {
    const inv = DB.getInvoice(id);
    const customer = DB.getCustomer(inv.customerId);
    const settings = DB.getSettings();
    const title = inv.gstEnabled ? 'Tax Invoice' : 'Invoice';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${title} ${inv.invNumber}</title>
    <style>
      body { font-family: -apple-system, sans-serif; max-width: 680px; margin: 40px auto; padding: 0 20px; color: #222; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
      .biz-name { font-size: 22px; font-weight: 700; }
      .biz-detail { font-size: 13px; color: #555; line-height: 1.6; }
      .inv-title { font-size: 28px; font-weight: 700; text-align: right; }
      .inv-meta { font-size: 13px; color: #555; text-align: right; }
      .to { margin-bottom: 24px; }
      .to-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1px; }
      table { width: 100%; border-collapse: collapse; margin: 24px 0; }
      th { background: #f5f5f5; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
      td { padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
      tfoot td { border-top: 2px solid #222; font-weight: 600; }
      .payment-box { background: #f9f9f9; border-radius: 8px; padding: 16px; margin-top: 24px; }
      .payment-box h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 8px; }
      .abn { font-size: 12px; color: #888; margin-top: 4px; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <div class="header">
      <div>
        ${settings.logo ? `<img src="${settings.logo}" style="max-height:60px;margin-bottom:8px"><br>` : ''}
        <div class="biz-name">${settings.businessName || 'Your Business'}</div>
        ${settings.abn ? `<div class="abn">ABN: ${settings.abn}</div>` : ''}
        <div class="biz-detail">
          ${settings.address ? settings.address + '<br>' : ''}
          ${settings.phone ? settings.phone + '<br>' : ''}
          ${settings.email ? settings.email : ''}
        </div>
      </div>
      <div>
        <div class="inv-title">${title}</div>
        <div class="inv-meta">
          ${inv.invNumber}<br>
          Date: ${UI.fmtDate(inv.createdAt)}<br>
          Due: ${UI.fmtDate(inv.paymentDueDate)}
        </div>
      </div>
    </div>
    ${customer ? `<div class="to"><div class="to-label">Bill To</div>
      <strong>${customer.name}</strong><br>
      ${customer.phone ? customer.phone + '<br>' : ''}
      ${customer.email ? customer.email + '<br>' : ''}
      ${customer.address ? customer.address : ''}
    </div>` : ''}
    <table>
      <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>
        ${inv.items.map(i=>`<tr><td>${i.description}</td><td>${i.qty}</td><td>${UI.fmtMoney(i.unitPrice)}</td><td>${UI.fmtMoney((parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1))}</td></tr>`).join('')}
      </tbody>
      <tfoot>
        <tr><td colspan="3">Subtotal</td><td>${UI.fmtMoney(inv.subtotal)}</td></tr>
        ${inv.gstEnabled ? `<tr><td colspan="3">GST (10%)</td><td>${UI.fmtMoney(inv.gstAmount)}</td></tr>` : ''}
        <tr><td colspan="3"><strong>Total</strong></td><td><strong>${UI.fmtMoney(inv.total)}</strong></td></tr>
      </tfoot>
    </table>
    ${(settings.bsb || settings.accountNumber) ? `<div class="payment-box">
      <h3>Payment Details</h3>
      ${settings.accountName ? `<strong>${settings.accountName}</strong><br>` : ''}
      ${settings.bsb ? `BSB: ${settings.bsb}<br>` : ''}
      ${settings.accountNumber ? `Account: ${settings.accountNumber}` : ''}
    </div>` : ''}
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  function _filter(s) { filterStatus = s; render(); }

  return { show, showDetail, openPayment, savePayment, markSent, printView, delete: del, _filter };
})();
