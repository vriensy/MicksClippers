/* =============================================================
   SHARP JOBS — Delivery Queue Module
   Version: 1.0.0
   Description: Shows completed jobs awaiting delivery or mailing.
   To modify delivery queue behaviour: edit this file only.
   ============================================================= */

const Delivery = (() => {

  function show() {
    UI.setTab('delivery');
    document.getElementById('fab').style.display = 'none';
    render();
  }

  function render() {
    const queue = DB.getDeliveryQueue();
    const customers = DB.getCustomers();
    const regions = DB.getRegions();

    // Group by region
    const grouped = {};
    queue.forEach(job => {
      const customer = customers.find(c => c.id === job.customerId);
      const regionId = customer ? customer.regionId : 'none';
      const region = regions.find(r => r.id === regionId);
      const regionName = region ? region.name : 'No Region';
      if (!grouped[regionName]) grouped[regionName] = [];
      grouped[regionName].push({ job, customer, region });
    });

    const regionNames = Object.keys(grouped).sort();

    UI.render(`
      ${UI.pageHeader('Delivery Queue', `${queue.length} job${queue.length!==1?'s':''} ready`)}
      ${queue.length === 0
        ? UI.emptyState('🚗', 'Nothing to deliver', 'Completed jobs will appear here')
        : regionNames.map(regionName => `
            ${UI.sectionLabel(`📍 ${regionName} (${grouped[regionName].length})`)}
            ${grouped[regionName].map(({ job, customer }) => deliveryCard(job, customer)).join('')}
          `).join('')}
      <div style="height:10px"></div>
    `);
  }

  function deliveryCard(job, customer) {
    const name = customer ? customer.name : 'Unknown';
    const phone = customer ? customer.phone : '';
    const overdue = UI.isOverdue(job);
    const total = job.items.reduce((s,i)=>(s+(parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1)),0);
    const itemSummary = job.items.length ? job.items.map(i=>`${i.qty}× ${i.description}`).join(', ') : 'No items';

    return `<div class="card${overdue?' card-overdue':''}">
      <div class="card-top">
        <div>
          <div class="card-wo">${job.woNumber}</div>
          <div class="card-name">${name}</div>
          <div class="card-items">${itemSummary}</div>
          ${phone ? `<a href="tel:${phone}" class="card-phone">📞 ${phone}</a>` : ''}
        </div>
        <div class="card-right">
          ${total ? `<div class="card-price">${UI.fmtMoney(total)}</div>` : ''}
          ${overdue ? '<div class="overdue-tag">OVERDUE</div>' : ''}
        </div>
      </div>
      ${job.dueDate ? `<div class="card-due${overdue?' due-overdue':''}">Due ${UI.fmtDate(job.dueDate)}</div>` : ''}
      <div class="delivery-actions">
        <button class="btn btn-status-green btn-sm" onclick="Delivery.markDelivered('${job.id}','delivered')">🚗 Delivered</button>
        <button class="btn btn-status-blue btn-sm" onclick="Delivery.markDelivered('${job.id}','mailed')">✉️ Mailed</button>
        <button class="btn btn-ghost btn-sm" onclick="Jobs.showDetail('${job.id}')">View</button>
      </div>
    </div>`;
  }

  function markDelivered(id, method) {
    DB.updateJobStatus(id, method);
    UI.toast(method === 'mailed' ? 'Marked as mailed ✉️' : 'Marked as delivered 🚗', 'success');
    render();
  }

  return { show, markDelivered };
})();
