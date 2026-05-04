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

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}

function showToast(msg, type = 'info') {
  const old = document.getElementById('slideToast');
  if (old) old.remove();
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  const colors = { success:'#0d631b', error:'#ba1a1a', warning:'#b45309', info:'#1565c0' };
  const toast = document.createElement('div');
  toast.id = 'slideToast';
  toast.style.cssText = `
    position:fixed; top:-80px; left:50%; transform:translateX(-50%);
    z-index:99999; background:${colors[type]||colors.info}; color:white;
    padding:14px 22px; border-radius:12px; font-family:'Manrope',sans-serif;
    font-size:13.5px; font-weight:600; display:flex; align-items:center;
    gap:10px; box-shadow:0 8px 30px rgba(0,0,0,0.25);
    transition:top 0.4s cubic-bezier(0.34,1.56,0.64,1);
    min-width:280px; max-width:90vw; white-space:nowrap;
  `;
  toast.innerHTML = `<span style="font-size:18px">${icon}</span><span>${msg}</span>`;
  document.body.appendChild(toast);
  playNotifSound();
  setTimeout(() => { toast.style.top = '20px'; }, 10);
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.top = '-80px';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
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
  // Admin hash restore — admin.html এ থাকলে hash save করো
  if (window.location.pathname.includes('admin')) {
    const hash = window.location.hash.replace('#', '');
    if (hash) sessionStorage.setItem('adminLastSection', hash);
  }
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
  const TELEGRAM_LINK = 'https://t.me/biniyogapp_online'; // এখানে চ্যানেল লিঙ্ক বসাবেন

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
   <a href="https://whatsapp.com/channel/0029Vb7jPnfJuyAE05er3z29" target="_blank" class="float-btn whatsapp" title="WhatsApp চ্যানেল">
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  </a>
  <a href="${TELEGRAM_LINK}" target="_blank" class="float-btn telegram" title="Telegram চ্যানেল">
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="white">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  </a>
  <a href="support.html" class="float-btn chat" title="সাপোর্ট">🎧</a>
`;
  document.body.appendChild(div);
})();
