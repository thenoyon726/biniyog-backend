/* ════════════════════════════════════════════════
   বিনিয়োগ অ্যাপ - Shared Utilities v2.0
   ════════════════════════════════════════════════ */

const API_BASE = 'https://biniyog-backend.onrender.com/api';

// ── Auth Helpers ─────────────────────────────────
function getToken() { return localStorage.getItem('biniyog_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('biniyog_user') || '{}'); } catch { return {}; }
}
function setUser(user) { localStorage.setItem('biniyog_user', JSON.stringify(user)); }
function logout() {
  localStorage.removeItem('biniyog_token');
  localStorage.removeItem('biniyog_user');
  window.location.href = 'login.html';
}

// ── API Fetch ────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });
  const data = await res.json();
  if (res.status === 401) { logout(); return null; }
  return data;
}

// ── Auth Guard ───────────────────────────────────
function requireAuth(adminRequired = false) {
  const token = getToken();
  const user = getUser();
  if (!token) { window.location.href = 'login.html'; return false; }
  if (adminRequired && user.role !== 'admin') { window.location.href = 'dashboard.html'; return false; }
  return true;
}

// ── Load Sidebar User Info ───────────────────────
function loadSidebarUser() {
  const user = getUser();
  const nameEl = document.getElementById('sidebarName');
  const avatarEl = document.getElementById('sidebarAvatar');
  const roleEl = document.getElementById('sidebarRole');
  if (nameEl && user.name) nameEl.textContent = user.name;
  if (avatarEl && user.name) avatarEl.textContent = user.name.charAt(0).toUpperCase();
  if (roleEl) roleEl.textContent = user.role === 'admin' ? 'অ্যাডমিন 👑' : 'সদস্য';
}

// ── Load Notification Count ──────────────────────
async function loadNotifCount() {
  try {
    const data = await apiFetch('/notifications');
    if (data?.success) {
      const badges = document.querySelectorAll('.notif-badge');
      badges.forEach(b => {
        b.textContent = data.unreadCount;
        b.style.display = data.unreadCount > 0 ? 'flex' : 'none';
      });
    }
  } catch {}
}

// ── Toast ────────────────────────────────────────
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span id="toastMsg">${msg}</span>`;
  toast.className = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Sidebar Mobile ───────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('open');
}

// ── Format Currency ──────────────────────────────
function formatBDT(amount) {
  return '৳' + parseFloat(amount || 0).toLocaleString('bn-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function formatBDTEn(amount) {
  return '৳' + parseFloat(amount || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Format Date ──────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Status Badge HTML ────────────────────────────
function statusBadge(status) {
  const map = {
    pending: ['badge-pending', 'অপেক্ষমান'],
    approved: ['badge-approved', 'অনুমোদিত'],
    rejected: ['badge-rejected', 'বাতিল'],
    completed: ['badge-completed', 'সম্পন্ন'],
    active: ['badge-active', 'সক্রিয়']
  };
  const [cls, label] = map[status] || ['badge-pending', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ── Type Label ───────────────────────────────────
function typeLabel(type) {
  const map = { deposit: '💰 ডিপোজিট', withdraw: '💸 উইথড্র', profit: '📈 মুনাফা', investment: '🏦 বিনিয়োগ', referral: '🎁 রেফারেল', refund: '↩️ রিফান্ড' };
  return map[type] || type;
}

// ── Refresh user from API ────────────────────────
async function refreshUser() {
  const data = await apiFetch('/auth/me');
  if (data?.success) {
    setUser(data.user);
    return data.user;
  }
  return getUser();
}

// ── On Page Load ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSidebarUser();
  loadNotifCount();
  // Sidebar overlay click to close
  document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);
  // Set active nav item
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && href === currentPage) item.classList.add('active');
  });
});
// ── Floating Support Buttons ──────────────────────
(function() {
  const WHATSAPP_NUMBER = '8801XXXXXXXXX'; // এখানে নম্বর বসাবেন
  const TELEGRAM_LINK = 'https://t.me/yourchannel'; // এখানে চ্যানেল লিঙ্ক বসাবেন

  const style = document.createElement('style');
  style.textContent = `
    .float-btns { position:fixed; bottom:90px; right:16px; display:flex; flex-direction:column; gap:10px; z-index:9999; }
    .float-btn { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.3); text-decoration:none; transition:transform 0.2s; border:none; }
    .float-btn:hover { transform:scale(1.1); }
    .float-btn.whatsapp { background:#25D366; }
    .float-btn.telegram { background:#229ED9; }
    .float-btn.chat { background:#f59e0b; }
  `;
  document.head.appendChild(style);

  const div = document.createElement('div');
  div.className = 'float-btns';
  div.innerHTML = `
    <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" class="float-btn whatsapp" title="WhatsApp সাপোর্ট">💬</a>
    <a href="${TELEGRAM_LINK}" target="_blank" class="float-btn telegram" title="Telegram চ্যানেল">✈️</a>
    <a href="support.html" class="float-btn chat" title="লাইভ চ্যাট">🎧</a>
  `;
  document.body.appendChild(div);
})();
