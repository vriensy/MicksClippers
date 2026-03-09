/* =============================================================
   SHARP JOBS — Shared UI Components
   Version: 1.0.0
   Description: Navigation, modals, toasts, shared helpers.
   To modify UI chrome or shared components: edit this file only.
   ============================================================= */

const UI = (() => {

  // ── State ─────────────────────────────────────────────────
  let currentTab = 'jobs';
  let toastTimer = null;

  // ── Toast ─────────────────────────────────────────────────
  function toast(msg, type = 'default', duration = 3000) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast toast-${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  // ── Navigation ────────────────────────────────────────────
  function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`nav-${tab}`);
    if (btn) btn.classList.add('active');
    const fab = document.getElementById('fab');
    if (fab) fab.style.display = ['jobs','customers'].includes(tab) ? 'flex' : 'none';
  }

  // ── Modal ─────────────────────────────────────────────────
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); el.scrollTop = 0; }
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }
  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  }

  // ── Confirm Dialog ────────────────────────────────────────
  function confirm(message, onConfirm, danger = true) {
    const el = document.getElementById('confirmModal');
    const msg = document.getElementById('confirmMessage');
    const btn = document.getElementById('confirmOk');
    if (!el || !msg || !btn) return;
    msg.textContent = message;
    btn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
    btn.onclick = () => { closeModal('confirmModal'); onConfirm(); };
    openModal('confirmModal');
  }

  // ── Render Screen ─────────────────────────────────────────
  function render(html) {
    const screen = document.getElementById('screen');
    if (screen) { screen.innerHTML = html; screen.scrollTo(0, 0); }
  }

  // ── Format Helpers ────────────────────────────────────────
  function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtDateTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function fmtMoney(n) {
    return '$' + (parseFloat(n) || 0).toFixed(2);
  }
  function isOverdue(job) {
    return job.dueDate && job.dueDate < Date.now() && !['delivered','mailed'].includes(job.status);
  }

  // ── Status Labels & Classes ───────────────────────────────
  const JOB_STATUS = {
    not_started: { label: 'Not Started', cls: 'badge-grey' },
    in_progress:  { label: 'In Progress', cls: 'badge-amber' },
    completed:    { label: 'Completed',   cls: 'badge-blue' },
    delivered:    { label: 'Delivered',   cls: 'badge-green' },
    mailed:       { label: 'Mailed',      cls: 'badge-green' }
  };
  const INV_STATUS = {
    draft:   { label: 'Draft',    cls: 'badge-grey' },
    sent:    { label: 'Sent',     cls: 'badge-blue' },
    partial: { label: 'Part Paid',cls: 'badge-amber' },
    paid:    { label: 'Paid',     cls: 'badge-green' },
    overdue: { label: 'Overdue',  cls: 'badge-red' }
  };

  function jobBadge(status) {
    const s = JOB_STATUS[status] || { label: status, cls: 'badge-grey' };
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  }
  function invBadge(status) {
    const s = INV_STATUS[status] || { label: status, cls: 'badge-grey' };
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  }

  // ── Back Button ───────────────────────────────────────────
  function backBtn(label, onclick) {
    return `<div class="back-btn" onclick="${onclick}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      ${label}
    </div>`;
  }

  // ── Empty State ───────────────────────────────────────────
  function emptyState(icon, message, subtext = '') {
    return `<div class="empty">
      <div class="empty-icon">${icon}</div>
      <p class="empty-msg">${message}</p>
      ${subtext ? `<p class="empty-sub">${subtext}</p>` : ''}
    </div>`;
  }

  // ── Section Label ─────────────────────────────────────────
  function sectionLabel(text) {
    return `<div class="section-label">${text}</div>`;
  }

  // ── Page Header ───────────────────────────────────────────
  function pageHeader(title, subtitle = '') {
    return `<div class="page-header">
      <h1>${title}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
    </div>`;
  }

  // ── Dismiss modals on overlay tap ─────────────────────────
  function initModalDismiss() {
    document.querySelectorAll('.modal-overlay').forEach(o => {
      o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); });
    });
  }

  return {
    toast, setTab, openModal, closeModal, closeAllModals, confirm,
    render, fmtDate, fmtDateTime, fmtMoney, isOverdue,
    jobBadge, invBadge, backBtn, emptyState, sectionLabel, pageHeader,
    initModalDismiss, get currentTab() { return currentTab; }
  };
})();
