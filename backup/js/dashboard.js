/* =============================================================
   SHARP JOBS — Dashboard Module
   Version: 1.0.0
   Description: Business stats and overview.
   To modify dashboard stats or layout: edit this file only.
   ============================================================= */

const Dashboard = (() => {

  function show() {
    UI.setTab('dashboard');
    document.getElementById('fab').style.display = 'none';
    render();
  }

  function render() {
    const s = DB.getStats();

    UI.render(`
      ${UI.pageHeader('Dashboard', 'Business overview')}

      ${UI.sectionLabel('Work Orders')}
      <div class="dash-grid">
        <div class="stat-card" onclick="Jobs._filter('not_started');Jobs.show()">
          <div class="stat-label">Not Started</div>
          <div class="stat-val" style="color:var(--text-mid)">${s.notStarted}</div>
          <div class="stat-sub">queued</div>
        </div>
        <div class="stat-card" onclick="Jobs._filter('in_progress');Jobs.show()">
          <div class="stat-label">In Progress</div>
          <div class="stat-val" style="color:var(--amber)">${s.inProgress}</div>
          <div class="stat-sub">being sharpened</div>
        </div>
        <div class="stat-card" onclick="Delivery.show()">
          <div class="stat-label">Delivery Queue</div>
          <div class="stat-val" style="color:var(--blue)">${s.deliveryQueue}</div>
          <div class="stat-sub">ready to send</div>
        </div>
        <div class="stat-card" onclick="Jobs._filter('delivered');Jobs.show()">
          <div class="stat-label">Completed</div>
          <div class="stat-val" style="color:var(--green)">${s.delivered}</div>
          <div class="stat-sub">delivered / mailed</div>
        </div>
        ${s.overdue > 0 ? `
        <div class="stat-card full" style="border-color:var(--red)">
          <div class="stat-label" style="color:var(--red)">⚠️ Overdue</div>
          <div class="stat-val" style="color:var(--red)">${s.overdue}</div>
          <div class="stat-sub">past due date</div>
        </div>` : ''}
      </div>

      ${UI.sectionLabel('Revenue')}
      <div class="dash-grid">
        <div class="stat-card">
          <div class="stat-label">Collected</div>
          <div class="stat-val">${UI.fmtMoney(s.totalCollected)}</div>
          <div class="stat-sub">paid invoices</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Outstanding</div>
          <div class="stat-val" style="color:var(--amber)">${UI.fmtMoney(s.outstanding)}</div>
          <div class="stat-sub">unpaid balance</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Job</div>
          <div class="stat-val">${UI.fmtMoney(s.avgJobValue)}</div>
          <div class="stat-sub">per invoice</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Last 30 Days</div>
          <div class="stat-val">${s.recentJobs}</div>
          <div class="stat-sub">new jobs</div>
        </div>
      </div>

      ${s.overdueInvoices > 0 ? `
      ${UI.sectionLabel('Alerts')}
      <div class="dash-grid">
        <div class="stat-card full" style="border-color:var(--red)" onclick="Invoices._filter('overdue');Invoices.show()">
          <div class="stat-label" style="color:var(--red)">⚠️ Overdue Invoices</div>
          <div class="stat-val" style="color:var(--red)">${s.overdueInvoices}</div>
          <div class="stat-sub">tap to view</div>
        </div>
      </div>` : ''}

      <div style="height:20px"></div>
    `);
  }

  return { show };
})();
