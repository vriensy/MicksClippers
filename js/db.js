/* =============================================================
   SHARP JOBS — Database / Storage Layer
   Version: 1.0.0
   Description: All data models, read/write, and ID generation.
   To modify data structure: edit this file only.
   ============================================================= */

const DB = (() => {

  // ── Keys ──────────────────────────────────────────────────
  const KEYS = {
    jobs:       'sj_jobs',
    customers:  'sj_customers',
    invoices:   'sj_invoices',
    regions:    'sj_regions',
    settings:   'sj_settings',
    counters:   'sj_counters',
    ghConfig:   'sj_gh_config',
    installedVersions: 'sj_installed_versions'
  };

  // ── Helpers ───────────────────────────────────────────────
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }
  function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ── Counters (WO / INV numbering) ─────────────────────────
  function getCounter(type) {
    const c = load(KEYS.counters) || {};
    return c[type] || 0;
  }
  function nextId(type, prefix) {
    const c = load(KEYS.counters) || {};
    c[type] = (c[type] || 0) + 1;
    save(KEYS.counters, c);
    return `${prefix}-${String(c[type]).padStart(4, '0')}`;
  }

  // ── Settings ──────────────────────────────────────────────
  const defaultSettings = {
    businessName: '',
    abn: '',
    address: '',
    phone: '',
    email: '',
    logo: '',           // base64 string
    bsb: '',
    accountNumber: '',
    accountName: '',
    gstEnabled: true,
    paymentTermsDays: 14
  };
  function getSettings() { return { ...defaultSettings, ...(load(KEYS.settings) || {}) }; }
  function saveSettings(s) { save(KEYS.settings, s); }

  // ── GitHub Config ─────────────────────────────────────────
  const defaultGh = { username: '', repo: '', branch: 'main', token: '' };
  function getGhConfig() { return { ...defaultGh, ...(load(KEYS.ghConfig) || {}) }; }
  function saveGhConfig(c) { save(KEYS.ghConfig, c); }

  // ── Installed Versions ────────────────────────────────────
  function getInstalledVersions() { return load(KEYS.installedVersions) || {}; }
  function saveInstalledVersions(v) { save(KEYS.installedVersions, v); }

  // ── Regions ───────────────────────────────────────────────
  function getRegions() { return load(KEYS.regions) || []; }
  function saveRegions(r) { save(KEYS.regions, r); }
  function addRegion({ name, turnaroundDays }) {
    const regions = getRegions();
    const region = { id: uid(), name, turnaroundDays: parseInt(turnaroundDays) || 7, createdAt: Date.now() };
    regions.push(region);
    saveRegions(regions);
    return region;
  }
  function updateRegion(id, data) {
    const regions = getRegions().map(r => r.id === id ? { ...r, ...data } : r);
    saveRegions(regions);
  }
  function deleteRegion(id) { saveRegions(getRegions().filter(r => r.id !== id)); }
  function getRegion(id) { return getRegions().find(r => r.id === id) || null; }

  // ── Customers ─────────────────────────────────────────────
  function getCustomers() { return load(KEYS.customers) || []; }
  function saveCustomers(c) { save(KEYS.customers, c); }
  function addCustomer({ name, phone, email, address, regionId }) {
    const customers = getCustomers();
    const customer = { id: uid(), name, phone: phone||'', email: email||'', address: address||'', regionId: regionId||'', createdAt: Date.now() };
    customers.push(customer);
    saveCustomers(customers);
    return customer;
  }
  function updateCustomer(id, data) {
    saveCustomers(getCustomers().map(c => c.id === id ? { ...c, ...data } : c));
  }
  function deleteCustomer(id) { saveCustomers(getCustomers().filter(c => c.id !== id)); }
  function getCustomer(id) { return getCustomers().find(c => c.id === id) || null; }

  // ── Jobs ──────────────────────────────────────────────────
  /*
    Job model:
    {
      id, woNumber, customerId,
      deliveryMethod: 'dropoff' | 'mail',
      status: 'not_started' | 'in_progress' | 'completed' | 'delivered' | 'mailed',
      items: [{ id, description, qty, unitPrice }],
      dueDate: timestamp,
      dueDateOverridden: bool,
      notes: '',
      invoiceId: null | id,
      timestamps: { created, started, completed, delivered }
    }
  */
  function getJobs() { return load(KEYS.jobs) || []; }
  function saveJobs(j) { save(KEYS.jobs, j); }
  function addJob({ customerId, deliveryMethod, items, dueDate, dueDateOverridden, notes }) {
    const jobs = getJobs();
    const job = {
      id: uid(),
      woNumber: nextId('wo', 'WO'),
      customerId,
      deliveryMethod: deliveryMethod || 'dropoff',
      status: 'not_started',
      items: items || [],
      dueDate: dueDate || null,
      dueDateOverridden: dueDateOverridden || false,
      notes: notes || '',
      invoiceId: null,
      timestamps: { created: Date.now(), started: null, completed: null, delivered: null }
    };
    jobs.unshift(job);
    saveJobs(jobs);
    return job;
  }
  function updateJob(id, data) {
    saveJobs(getJobs().map(j => j.id === id ? { ...j, ...data } : j));
  }
  function updateJobStatus(id, status) {
    const jobs = getJobs();
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    job.status = status;
    const now = Date.now();
    if (status === 'in_progress' && !job.timestamps.started) job.timestamps.started = now;
    if (status === 'completed' && !job.timestamps.completed) job.timestamps.completed = now;
    if ((status === 'delivered' || status === 'mailed') && !job.timestamps.delivered) job.timestamps.delivered = now;
    saveJobs(jobs);
    return job;
  }
  function deleteJob(id) { saveJobs(getJobs().filter(j => j.id !== id)); }
  function getJob(id) { return getJobs().find(j => j.id === id) || null; }
  function getDeliveryQueue() { return getJobs().filter(j => j.status === 'completed'); }

  // ── Invoices ──────────────────────────────────────────────
  /*
    Invoice model:
    {
      id, invNumber, woId, customerId,
      status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue',
      gstEnabled: bool,
      items: [{ description, qty, unitPrice }],
      subtotal, gstAmount, total,
      paymentDueDate: timestamp,
      payments: [{ id, amount, method, note, date }],
      amountPaid,
      createdAt, sentAt
    }
  */
  function getInvoices() { return load(KEYS.invoices) || []; }
  function saveInvoices(inv) { save(KEYS.invoices, inv); }
  function createInvoiceFromJob(jobId) {
    const job = getJob(jobId);
    if (!job) return null;
    const settings = getSettings();
    const subtotal = job.items.reduce((s, i) => s + (parseFloat(i.unitPrice) * parseInt(i.qty || 1)), 0);
    const gstEnabled = settings.gstEnabled;
    const gstAmount = gstEnabled ? subtotal * 0.1 : 0;
    const total = subtotal + gstAmount;
    const paymentDueDate = Date.now() + (settings.paymentTermsDays * 86400000);
    const invoices = getInvoices();
    // Use same number as WO but INV prefix
    const invNumber = job.woNumber.replace('WO-', 'INV-');
    const inv = {
      id: uid(),
      invNumber,
      woId: jobId,
      customerId: job.customerId,
      status: 'draft',
      gstEnabled,
      items: job.items.map(i => ({ ...i })),
      subtotal, gstAmount, total,
      paymentDueDate,
      payments: [],
      amountPaid: 0,
      createdAt: Date.now(),
      sentAt: null
    };
    invoices.unshift(inv);
    saveInvoices(invoices);
    // Link invoice back to job
    updateJob(jobId, { invoiceId: inv.id });
    return inv;
  }
  function updateInvoice(id, data) {
    saveInvoices(getInvoices().map(i => i.id === id ? { ...i, ...data } : i));
  }
  function addPayment(invoiceId, { amount, method, note }) {
    const invoices = getInvoices();
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    inv.payments.push({ id: uid(), amount: parseFloat(amount), method, note: note||'', date: Date.now() });
    inv.amountPaid = inv.payments.reduce((s, p) => s + p.amount, 0);
    if (inv.amountPaid >= inv.total) inv.status = 'paid';
    else if (inv.amountPaid > 0) inv.status = 'partial';
    saveInvoices(invoices);
    return inv;
  }
  function checkOverdueInvoices() {
    const now = Date.now();
    const invoices = getInvoices().map(inv => {
      if (['draft','paid'].includes(inv.status)) return inv;
      if (inv.paymentDueDate < now && inv.status !== 'paid') inv.status = 'overdue';
      return inv;
    });
    saveInvoices(invoices);
  }
  function deleteInvoice(id) { saveInvoices(getInvoices().filter(i => i.id !== id)); }
  function getInvoice(id) { return getInvoices().find(i => i.id === id) || null; }

  // ── Full Data Export / Import ──────────────────────────────
  function exportAllData() {
    return {
      exportedAt: Date.now(),
      version: '1.0.0',
      jobs: getJobs(),
      customers: getCustomers(),
      invoices: getInvoices(),
      regions: getRegions(),
      settings: getSettings(),
      counters: load(KEYS.counters) || {}
    };
  }
  function importAllData(data) {
    if (!data || !data.version) throw new Error('Invalid backup file');
    if (data.jobs)      saveJobs(data.jobs);
    if (data.customers) saveCustomers(data.customers);
    if (data.invoices)  saveInvoices(data.invoices);
    if (data.regions)   saveRegions(data.regions);
    if (data.settings)  saveSettings(data.settings);
    if (data.counters)  save(KEYS.counters, data.counters);
  }

  // ── UID ───────────────────────────────────────────────────
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

  // ── Due Date Calculator ───────────────────────────────────
  function calcDueDate(customerId) {
    const customer = getCustomer(customerId);
    if (!customer) return null;
    const region = getRegion(customer.regionId);
    if (!region) return null;
    return Date.now() + (region.turnaroundDays * 86400000);
  }

  // ── Dashboard Stats ───────────────────────────────────────
  function getStats() {
    const jobs = getJobs();
    const invoices = getInvoices();
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86400000;
    checkOverdueInvoices();
    return {
      totalJobs: jobs.length,
      notStarted: jobs.filter(j => j.status === 'not_started').length,
      inProgress: jobs.filter(j => j.status === 'in_progress').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      delivered: jobs.filter(j => j.status === 'delivered' || j.status === 'mailed').length,
      overdue: jobs.filter(j => j.dueDate && j.dueDate < now && !['delivered','mailed'].includes(j.status)).length,
      deliveryQueue: jobs.filter(j => j.status === 'completed').length,
      recentJobs: jobs.filter(j => j.timestamps.created > thirtyDaysAgo).length,
      totalInvoiced: invoices.reduce((s, i) => s + i.total, 0),
      totalCollected: invoices.reduce((s, i) => s + i.amountPaid, 0),
      outstanding: invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total - i.amountPaid), 0),
      overdueInvoices: invoices.filter(i => i.status === 'overdue').length,
      unpaidInvoices: invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).length,
      avgJobValue: jobs.length ? (invoices.reduce((s,i)=>s+i.total,0) / Math.max(invoices.length,1)) : 0
    };
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // Settings
    getSettings, saveSettings,
    getGhConfig, saveGhConfig,
    getInstalledVersions, saveInstalledVersions,
    // Regions
    getRegions, addRegion, updateRegion, deleteRegion, getRegion,
    // Customers
    getCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomer,
    // Jobs
    getJobs, addJob, updateJob, updateJobStatus, deleteJob, getJob, getDeliveryQueue,
    // Invoices
    getInvoices, createInvoiceFromJob, updateInvoice, addPayment, deleteInvoice, getInvoice, checkOverdueInvoices,
    // Data
    exportAllData, importAllData,
    calcDueDate, getStats, uid
  };
})();
