export function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-50">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AKSHAY MALU & ASSOCIATES | Chartered Accountants</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        fontFamily: {
          sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
          mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
        },
        colors: {
          brand: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            600: '#475569',
            800: '#1e293b',
            900: '#0f172a',
            950: '#020617'
          }
        }
      }
    }
  }
</script>
<style>
  * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  body { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; }
  .tabular { font-variant-numeric: tabular-nums; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px); z-index: 50; display: flex; align-items: center; justify-content: center; }
  .slide-enter { animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  @keyframes slideIn { from { opacity: 0; transform: translateY(6px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .toast-container { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem; }
  .toast-item { animation: toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
  @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  /* Clean custom scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>
</head>
<body class="h-full text-slate-900 bg-slate-50 selection:bg-slate-200 selection:text-slate-900">
<div id="app" class="h-full"></div>
<div id="toast-root" class="toast-container"></div>

<script>
// ==================== STATE MANAGEMENT ====================
const S = {
  token: localStorage.getItem('ca_token'),
  user: null,
  page: 'dashboard',
  tasks: [],
  filteredTasks: [],
  users: [],
  categories: [],
  activity: [],
  stats: {},
  taskDetail: null,
  searchQuery: '',
  selectedCategory: '',
  selectedStatus: '',
  selectedPriority: '',
  sidebarOpen: false,
  activeTab: 'all', // all, pending, in_progress, completed, overdue
};

// ==================== API CLIENT ====================
async function api(path, opts = {}) {
  const headers = { ...opts.headers };
  if (S.token) headers['Authorization'] = 'Bearer ' + S.token;
  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  try {
    const r = await fetch('/api' + path, { ...opts, headers });
    if (r.status === 401) { logout(); return null; }
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('json')) return r.json();
    return r;
  } catch (err) {
    console.error('API Error:', err);
    toast('Network connection failed', 'error');
    return null;
  }
}

// ==================== AUTHENTICATION ====================
async function login(e) {
  if (e) e.preventDefault();
  const uInput = document.getElementById('login-user');
  const pInput = document.getElementById('login-pass');
  if (!uInput || !pInput) return;
  const u = uInput.value.trim();
  const p = pInput.value;
  const errEl = document.getElementById('login-error');
  if (errEl) errEl.textContent = '';
  
  if (!u || !p) {
    if (errEl) errEl.textContent = 'Please enter both username and password.';
    return;
  }
  
  const res = await api('/auth/login', { method: 'POST', body: { username: u, password: p } });
  if (res && res.token) {
    S.token = res.token;
    S.user = res.user;
    localStorage.setItem('ca_token', res.token);
    S.page = 'dashboard';
    toast('Welcome back, ' + res.user.full_name);
    await refreshAllData();
    render();
  } else {
    if (errEl) errEl.textContent = (res && res.error) || 'Invalid username or password.';
    toast((res && res.error) || 'Authentication failed', 'error');
  }
}

function logout() {
  S.token = null;
  S.user = null;
  localStorage.removeItem('ca_token');
  render();
  toast('Signed out successfully');
}

async function checkAuth() {
  if (!S.token) return false;
  const res = await api('/auth/me');
  if (res && res.user) {
    S.user = res.user;
    return true;
  }
  S.token = null;
  localStorage.removeItem('ca_token');
  return false;
}

// ==================== DATA SYNC ====================
async function refreshAllData() {
  await Promise.all([
    loadCategories(),
    loadDashboardStats(),
    loadTasks(),
    loadUsers(),
    loadActivity()
  ]);
}

async function loadDashboardStats() {
  S.stats = await api('/dashboard/stats') || {};
}

async function loadTasks() {
  const parts = [];
  if (S.selectedStatus) parts.push('status=' + encodeURIComponent(S.selectedStatus));
  if (S.selectedCategory) parts.push('category_id=' + encodeURIComponent(S.selectedCategory));
  if (S.selectedPriority) parts.push('priority=' + encodeURIComponent(S.selectedPriority));
  if (S.searchQuery) parts.push('search=' + encodeURIComponent(S.searchQuery));
  
  const query = parts.length ? '?' + parts.join('&') : '';
  const res = await api('/tasks' + query);
  S.tasks = (res && res.tasks) || [];
  applyLocalFilters();
}

function applyLocalFilters() {
  let list = [...S.tasks];
  if (S.activeTab !== 'all') {
    list = list.filter(t => (t.status || t.my_status) === S.activeTab);
  }
  if (S.searchQuery) {
    const q = S.searchQuery.toLowerCase();
    list = list.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.category_name && t.category_name.toLowerCase().includes(q))
    );
  }
  S.filteredTasks = list;
}

async function loadTaskDetail(id) {
  const res = await api('/tasks/' + id);
  if (res && res.task) {
    S.taskDetail = res;
    render();
  } else {
    toast('Task not found', 'error');
  }
}

async function loadUsers() {
  const res = await api('/users');
  S.users = (res && res.users) || [];
}

async function loadCategories() {
  const res = await api('/categories');
  S.categories = (res && res.categories) || [];
}

async function loadActivity() {
  const res = await api('/activity');
  S.activity = (res && res.activity) || [];
}

// ==================== TOAST SYSTEM ====================
function toast(msg, type = 'success') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  const isErr = type === 'error';
  el.className = 'toast-item flex items-center gap-2.5 px-4 py-3 rounded-lg text-xs font-medium border shadow-sm transition-all ' +
    (isErr 
      ? 'bg-rose-50 text-rose-900 border-rose-200' 
      : 'bg-slate-900 text-white border-slate-800');
  
  const icon = isErr
    ? '<svg class="w-4 h-4 text-rose-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>'
    : '<svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
  
  el.innerHTML = icon + '<span>' + escHtml(msg) + '</span>';
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 200);
  }, 3200);
}

// ==================== NAVIGATION ====================
function nav(page) {
  S.page = page;
  S.taskDetail = null;
  S.sidebarOpen = false;
  render();
  if (page === 'dashboard') { loadDashboardStats(); loadTasks(); }
  else if (page === 'tasks') { loadTasks(); }
  else if (page === 'staff') { loadUsers(); }
  else if (page === 'activity') { loadActivity(); }
}

// ==================== RENDERING CORE ====================
function render() {
  const app = document.getElementById('app');
  if (!S.token || !S.user) {
    app.innerHTML = renderLogin();
    return;
  }
  app.innerHTML = renderAppShell();
}

// ==================== LOGIN VIEW ====================
function renderLogin() {
  return '<div class="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">' +
    '<div class="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">' +
      // CA Firm Seal Monogram
      '<div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-lg tracking-wider mb-4 shadow-sm border border-slate-700 font-mono">' +
        'AM' +
      '</div>' +
      '<h1 class="text-xl font-bold tracking-tight text-slate-900">AKSHAY MALU & ASSOCIATES</h1>' +
      '<p class="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Chartered Accountants • Practice Compliance Suite</p>' +
      '<p class="text-xs text-slate-400 mt-0.5 font-mono">FRN: 024819C • CA Akshay Malu, Managing Partner</p>' +
    '</div>' +

    '<div class="sm:mx-auto sm:w-full sm:max-w-md">' +
      '<div class="bg-white py-8 px-6 sm:px-8 border border-slate-200/80 rounded-xl shadow-xs">' +
        '<form onsubmit="login(event)" class="space-y-4">' +
          '<div>' +
            '<label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Staff Identifier / Username</label>' +
            '<input id="login-user" type="text" required placeholder="admin or staff username" class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition">' +
          '</div>' +
          '<div>' +
            '<label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Secure Password</label>' +
            '<input id="login-pass" type="password" required placeholder="••••••••" class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition">' +
          '</div>' +
          '<div id="login-error" class="text-xs font-medium text-rose-600"></div>' +
          '<button type="submit" class="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors shadow-xs">' +
            'Authenticate & Enter Office' +
          '</button>' +
        '</form>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// ==================== APP SHELL ====================
function renderAppShell() {
  const isAdmin = S.user.role === 'admin';
  const navItems = isAdmin ? [
    { id: 'dashboard', label: 'Office Overview', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>' },
    { id: 'tasks', label: 'Client Engagements', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>' },
    { id: 'staff', label: 'Staff & Associates', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>' },
    { id: 'activity', label: 'Statutory Audit Trail', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>' }
  ] : [
    { id: 'dashboard', label: 'My Workbench', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>' },
    { id: 'tasks', label: 'My Assigned Filings', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>' },
    { id: 'activity', label: 'My Work History', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>' }
  ];

  // Restrained sidebar adhering to taste-skill guidelines (neutral grey pill, no violet glowing blobs)
  const sidebar = '<aside class="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-40 flex flex-col transition-transform lg:translate-x-0 ' + (S.sidebarOpen ? 'translate-x-0' : '-translate-x-full') + '">' +
    // Brand header
    '<div class="p-5 border-b border-slate-100 flex items-center justify-between">' +
      '<div class="flex items-center gap-3">' +
        '<div class="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wider font-mono shadow-xs">' +
          'AM' +
        '</div>' +
        '<div class="min-w-0">' +
          '<h2 class="text-xs font-bold text-slate-900 tracking-tight leading-none uppercase truncate">Akshay Malu & Co.</h2>' +
          '<p class="text-[10px] text-slate-400 font-medium tracking-normal mt-1 leading-none">Chartered Accountants</p>' +
        '</div>' +
      '</div>' +
      '<button onclick="S.sidebarOpen=false;render()" class="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded">' +
        '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
      '</button>' +
    '</div>' +

    // Navigation links
    '<div class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">' +
      '<div class="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Operations</div>' +
      navItems.map(item => {
        const isActive = S.page === item.id;
        return '<button onclick="nav(\\'' + item.id + '\\')" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ' +
          (isActive 
            ? 'bg-slate-100 text-slate-900 font-semibold' 
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50') + '">' +
          '<svg class="w-4 h-4 ' + (isActive ? 'text-slate-900' : 'text-slate-400') + '" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + item.icon + '</svg>' +
          '<span>' + item.label + '</span>' +
        '</button>';
      }).join('') +

      // Statutory Deadlines Quick Strip
      '<div class="mt-8 px-3 pt-4 border-t border-slate-100">' +
        '<div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono mb-2.5">Key Cutoffs (Nov)</div>' +
        '<div class="space-y-1.5 text-[11px]">' +
          '<div class="flex items-center justify-between py-1 px-2 rounded bg-slate-50 text-slate-600">' +
            '<span>07 Nov • TDS Chln</span>' +
            '<span class="font-mono text-[10px] text-amber-700 font-semibold">5d left</span>' +
          '</div>' +
          '<div class="flex items-center justify-between py-1 px-2 rounded bg-slate-50 text-slate-600">' +
            '<span>11 Nov • GSTR-1</span>' +
            '<span class="font-mono text-[10px] text-slate-500">9d left</span>' +
          '</div>' +
          '<div class="flex items-center justify-between py-1 px-2 rounded bg-slate-50 text-slate-600">' +
            '<span>20 Nov • GSTR-3B</span>' +
            '<span class="font-mono text-[10px] text-slate-500">18d left</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // User profile footer
    '<div class="p-3 border-t border-slate-100 bg-slate-50/50">' +
      '<div class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60 shadow-2xs">' +
        '<div class="flex items-center gap-2.5 min-w-0">' +
          '<div class="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0 font-mono">' +
            S.user.full_name.charAt(0) +
          '</div>' +
          '<div class="min-w-0">' +
            '<div class="text-xs font-semibold text-slate-900 truncate leading-tight">' + escHtml(S.user.full_name) + '</div>' +
            '<div class="text-[10px] text-slate-400 capitalize truncate font-mono">' + S.user.role + '</div>' +
          '</div>' +
        '</div>' +
        '<button onclick="logout()" title="Sign out" class="p-1.5 text-slate-400 hover:text-rose-600 rounded transition">' +
          '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</aside>';

  // Top header bar (Taste-skill rule: quiet, carries search & primary noun)
  const header = '<header class="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between lg:pl-70">' +
    '<div class="flex items-center gap-3">' +
      '<button onclick="S.sidebarOpen=true;render()" class="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg">' +
        '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>' +
      '</button>' +
      '<div>' +
        '<h1 class="text-base font-semibold text-slate-900 leading-tight capitalize">' + 
          (S.page === 'dashboard' ? (isAdmin ? 'Practice Overview' : 'Staff Workbench') : S.page.replace('_', ' ')) +
        '</h1>' +
        '<div class="text-[11px] text-slate-400 font-mono hidden sm:block">FY 2024–25 • Assessment Year 2025–26</div>' +
      '</div>' +
    '</div>' +

    '<div class="flex items-center gap-3">' +
      // Global Search input with taste-skill quiet look
      '<div class="relative hidden sm:block w-64">' +
        '<input type="text" id="global-search" oninput="handleSearch(this.value)" placeholder="Search client, task, section... (/)" value="' + escAttr(S.searchQuery) + '" class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition">' +
        '<svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>' +
      '</div>' +

      // Role switcher pill for demo evaluation
      '<div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-mono">' +
        '<span class="w-1.5 h-1.5 rounded-full ' + (isAdmin ? 'bg-emerald-500' : 'bg-sky-500') + '"></span>' +
        '<span>' + (isAdmin ? 'Partner Access' : 'Associate Access') + '</span>' +
      '</div>' +

      (isAdmin ? '<button onclick="showTaskModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>New Engagement</button>' : '') +
    '</div>' +
  '</header>';

  let mainContent = '';
  if (S.page === 'dashboard') mainContent = renderDashboardContent();
  else if (S.page === 'tasks') mainContent = renderTasksContent();
  else if (S.page === 'staff') mainContent = renderStaffContent();
  else if (S.page === 'activity') mainContent = renderActivityContent();

  const taskDetailDrawer = S.taskDetail ? renderTaskDetailDrawer() : '';

  return sidebar +
    '<div class="min-h-full flex flex-col">' +
      header +
      '<main class="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">' +
        mainContent +
      '</main>' +
    '</div>' +
    taskDetailDrawer;
}

// ==================== DASHBOARD CONTENT ====================
function renderDashboardContent() {
  const s = S.stats;
  const isAdmin = S.user.role === 'admin';

  // Taste-skill Section 14: One container split by hairlines, label over value, no icons in circles!
  const kpis = isAdmin ? [
    { label: 'Total Engagements', val: s.total || 0, sub: 'All statutory assignments' },
    { label: 'Pending Start', val: s.pending || 0, sub: 'Awaiting allocation/docs' },
    { label: 'In Execution', val: s.in_progress || 0, sub: 'Reconciliation & scrutiny' },
    { label: 'Completed (Cycle)', val: s.completed || 0, sub: 'Returns filed & acknowledged' },
    { label: 'Immediate Attention', val: s.overdue || 0, sub: 'Due <= 48 hrs or overdue', warn: (s.overdue > 0) }
  ] : [
    { label: 'My Total Work', val: s.total || 0, sub: 'All assigned tasks' },
    { label: 'Pending Start', val: s.pending || 0, sub: 'Not yet initiated' },
    { label: 'In Progress', val: s.in_progress || 0, sub: 'Active work in flight' },
    { label: 'Completed', val: s.completed || 0, sub: 'Sign-off submitted' }
  ];

  let html = '<div class="space-y-6">';

  // Top KPI Ribbon
  html += '<div class="grid grid-cols-2 md:grid-cols-4 ' + (isAdmin ? 'lg:grid-cols-5' : '') + ' bg-white border border-slate-200/80 rounded-xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-100 shadow-2xs">';
  kpis.forEach(k => {
    html += '<div class="p-4 sm:p-5">' +
      '<div class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">' + k.label + '</div>' +
      '<div class="mt-2 text-2xl font-bold tracking-tight ' + (k.warn ? 'text-rose-700' : 'text-slate-900') + ' tabular font-mono">' + k.val + '</div>' +
      '<div class="mt-1 text-[11px] text-slate-500 truncate">' + k.sub + '</div>' +
    '</div>';
  });
  html += '</div>';

  // Quick Action / Search & Filter Section
  html += '<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">';
  html += '<div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">';
  
  const tabs = [
    { id: 'all', label: 'All Tasks' },
    { id: 'pending', label: 'Pending' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' }
  ];
  tabs.forEach(t => {
    const isAct = S.activeTab === t.id;
    html += '<button onclick="setTab(\\'' + t.id + '\\')" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ' +
      (isAct 
        ? 'bg-slate-900 text-white shadow-xs' 
        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50') + '">' +
      t.label +
    '</button>';
  });
  html += '</div>';

  // Category filter dropdown
  html += '<div class="flex items-center gap-2">' +
    '<select onchange="filterByCategory(this.value)" class="text-xs py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900">' +
      '<option value="">All Categories (ITR, GST, TDS...)</option>' +
      S.categories.map(c => '<option value="' + c.id + '" ' + (S.selectedCategory == c.id ? 'selected' : '') + '>' + c.name + '</option>').join('') +
    '</select>' +
  '</div>';
  html += '</div>';

  // Recent Engagements Table
  html += '<div class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">';
  html += '<div class="p-4 border-b border-slate-100 flex items-center justify-between">' +
    '<div>' +
      '<h3 class="text-sm font-semibold text-slate-900">Active Practice Engagements</h3>' +
      '<p class="text-xs text-slate-400">Current client deadlines and work allocation</p>' +
    '</div>' +
    '<button onclick="nav(\\'tasks\\')" class="text-xs font-semibold text-slate-700 hover:text-slate-900">View Full Register &rarr;</button>' +
  '</div>';

  html += renderTaskTable(S.filteredTasks.slice(0, 8));
  html += '</div>';

  // Admin Workload Breakdown & Category Summary
  if (isAdmin && s.tasks_by_category && s.tasks_by_staff) {
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
    
    // Category Distribution
    html += '<div class="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">' +
      '<div class="flex items-center justify-between mb-4">' +
        '<h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Workload by Practice Category</h4>' +
        '<span class="text-[11px] text-slate-400">' + S.tasks.length + ' matters</span>' +
      '</div>' +
      '<div class="space-y-3">';
    
    s.tasks_by_category.forEach(c => {
      const pct = S.tasks.length > 0 ? Math.round((c.count / S.tasks.length) * 100) : 0;
      html += '<div>' +
        '<div class="flex items-center justify-between text-xs mb-1.5">' +
          '<span class="font-medium text-slate-700 flex items-center gap-2">' +
            '<span class="w-2 h-2 rounded-full" style="background-color: ' + c.color + '"></span>' +
            c.name +
          '</span>' +
          '<span class="font-mono text-slate-500">' + c.count + ' <span class="text-slate-400 text-[10px]">(' + pct + '%)</span></span>' +
        '</div>' +
        '<div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">' +
          '<div class="h-1.5 rounded-full" style="width: ' + pct + '%; background-color: ' + c.color + '"></div>' +
        '</div>' +
      '</div>';
    });
    html += '</div></div>';

    // Staff Workload Gauge
    html += '<div class="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">' +
      '<div class="flex items-center justify-between mb-4">' +
        '<h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Staff Allocation & Completion</h4>' +
        '<button onclick="nav(\\'staff\\')" class="text-xs font-semibold text-slate-600 hover:text-slate-900">Manage Team</button>' +
      '</div>' +
      '<div class="space-y-3.5">';
    
    s.tasks_by_staff.forEach(st => {
      const pct = st.total > 0 ? Math.round((st.completed / st.total) * 100) : 0;
      html += '<div>' +
        '<div class="flex items-center justify-between text-xs mb-1.5">' +
          '<span class="font-medium text-slate-800">' + escHtml(st.full_name) + '</span>' +
          '<span class="font-mono text-slate-500 text-[11px]">' + st.completed + '/' + st.total + ' completed</span>' +
        '</div>' +
        '<div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">' +
          '<div class="bg-slate-900 h-1.5 rounded-full transition-all" style="width: ' + pct + '%"></div>' +
        '</div>' +
      '</div>';
    });
    html += '</div></div>';

    html += '</div>';
  }

  html += '</div>';
  return html;
}

// ==================== TASK LIST & TABLE ====================
function renderTasksContent() {
  const isAdmin = S.user.role === 'admin';
  let html = '<div class="space-y-4">';

  // Top Controls & Filtering Bar
  html += '<div class="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">' +
    '<div class="flex flex-wrap items-center gap-2">' +
      // Status Tabs
      '<div class="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">' +
        ['all', 'pending', 'in_progress', 'completed'].map(tab => 
          '<button onclick="setTab(\\'' + tab + '\\')" class="px-2.5 py-1 rounded-md capitalize font-medium transition ' +
          (S.activeTab === tab ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-500 hover:text-slate-800') + '">' +
          (tab === 'all' ? 'All Engagements' : tab.replace('_', ' ')) +
          '</button>'
        ).join('') +
      '</div>' +

      // Category filter
      '<select onchange="filterByCategory(this.value)" class="text-xs py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-slate-700">' +
        '<option value="">All Categories</option>' +
        S.categories.map(c => '<option value="' + c.id + '" ' + (S.selectedCategory == c.id ? 'selected' : '') + '>' + c.name + '</option>').join('') +
      '</select>' +

      // Priority filter
      '<select onchange="filterByPriority(this.value)" class="text-xs py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-slate-700">' +
        '<option value="">All Priorities</option>' +
        '<option value="urgent" ' + (S.selectedPriority === 'urgent' ? 'selected' : '') + '>Urgent</option>' +
        '<option value="high" ' + (S.selectedPriority === 'high' ? 'selected' : '') + '>High</option>' +
        '<option value="medium" ' + (S.selectedPriority === 'medium' ? 'selected' : '') + '>Medium</option>' +
        '<option value="low" ' + (S.selectedPriority === 'low' ? 'selected' : '') + '>Low</option>' +
      '</select>' +
    '</div>' +

    '<div class="flex items-center gap-2">' +
      '<span class="text-xs text-slate-400 font-mono">' + S.filteredTasks.length + ' matters found</span>' +
      (isAdmin ? '<button onclick="showTaskModal()" class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>New Task</button>' : '') +
    '</div>' +
  '</div>';

  // Task Table Container
  html += '<div class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">';
  html += renderTaskTable(S.filteredTasks);
  html += '</div>';

  html += '</div>';
  return html;
}

function renderTaskTable(tasks) {
  if (!tasks || tasks.length === 0) {
    return '<div class="p-12 text-center">' +
      '<div class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">' +
        '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>' +
      '</div>' +
      '<h4 class="text-sm font-semibold text-slate-800">No matching client engagements</h4>' +
      '<p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">No records found matching the active filters or search terms. Try adjusting your filter parameters.</p>' +
    '</div>';
  }

  // Taste-skill Section 7: Tables are rules and alignment. No zebra striping, no header bands, numbers right-aligned.
  let html = '<div class="overflow-x-auto"><table class="w-full text-left text-xs border-collapse">' +
    '<thead><tr class="border-b border-slate-200 text-slate-500 font-medium font-mono text-[11px]">' +
      '<th class="py-3 px-4">Client Matter / Scope</th>' +
      '<th class="py-3 px-3">Practice Area</th>' +
      '<th class="py-3 px-3">Priority</th>' +
      '<th class="py-3 px-3">Statutory Status</th>' +
      '<th class="py-3 px-3">Statutory Deadline</th>' +
      '<th class="py-3 px-4">Assigned Team</th>' +
    '</tr></thead>' +
    '<tbody class="divide-y divide-slate-100">';

  tasks.forEach(t => {
    const statusVal = t.status || t.my_status || 'pending';
    const deadlineInfo = getDeadlineBadge(t.deadline);
    const assignees = t.assignees || [];

    html += '<tr onclick="loadTaskDetail(' + t.id + ')" class="hover:bg-slate-50/80 cursor-pointer transition-colors group">' +
      // Title & Description
      '<td class="py-3.5 px-4">' +
        '<div class="font-semibold text-slate-900 group-hover:text-slate-950 flex items-center gap-1.5">' +
          escHtml(t.title) +
        '</div>' +
        (t.description ? '<div class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">' + escHtml(t.description) + '</div>' : '') +
      '</td>' +

      // Category Pill
      '<td class="py-3.5 px-3">' +
        '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ' + getCategoryClass(t.category_name) + '">' +
          escHtml(t.category_name || 'General') +
        '</span>' +
      '</td>' +

      // Priority
      '<td class="py-3.5 px-3">' +
        '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ' + getPriorityClass(t.priority) + '">' +
          t.priority +
        '</span>' +
      '</td>' +

      // Status
      '<td class="py-3.5 px-3">' +
        '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ' + getStatusClass(statusVal) + '">' +
          '<span class="w-1.5 h-1.5 rounded-full ' + getStatusDot(statusVal) + '"></span>' +
          statusVal.replace('_', ' ') +
        '</span>' +
      '</td>' +

      // Deadline
      '<td class="py-3.5 px-3 font-mono text-slate-600">' +
        (t.deadline ? '<div>' + fmtDate(t.deadline) + '</div>' + deadlineInfo : '<span class="text-slate-400">—</span>') +
      '</td>' +

      // Assignees
      '<td class="py-3.5 px-4">' +
        '<div class="flex items-center -space-x-1.5">' +
          (assignees.length > 0 ? assignees.map(a => 
            '<div class="w-6 h-6 rounded-full bg-slate-100 border border-white text-slate-700 flex items-center justify-center font-bold text-[10px] font-mono" title="' + escAttr(a.full_name) + ' (' + a.status + ')">' +
              a.full_name.charAt(0) +
            '</div>'
          ).join('') : '<span class="text-slate-400 text-xs">Unassigned</span>') +
        '</div>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

// ==================== TASK DETAIL DRAWER (SLIDE-OVER) ====================
function renderTaskDetailDrawer() {
  if (!S.taskDetail || !S.taskDetail.task) return '';
  const t = S.taskDetail.task;
  const assignees = S.taskDetail.assignees || [];
  const attachments = S.taskDetail.attachments || [];
  const activity = S.taskDetail.activity || [];
  const isAdmin = S.user.role === 'admin';
  const deadlineBadge = getDeadlineBadge(t.deadline);

  let html = '<div class="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs flex justify-end transition-opacity">' +
    '<div class="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col slide-enter border-l border-slate-200">' +
      // Drawer Header
      '<div class="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/60">' +
        '<div class="space-y-1.5 min-w-0 pr-4">' +
          '<div class="flex flex-wrap items-center gap-2">' +
            '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ' + getCategoryClass(t.category_name) + '">' +
              escHtml(t.category_name) +
            '</span>' +
            '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ' + getPriorityClass(t.priority) + '">' +
              t.priority +
            '</span>' +
            '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ' + getStatusClass(t.status) + '">' +
              '<span class="w-1.5 h-1.5 rounded-full ' + getStatusDot(t.status) + '"></span>' +
              t.status.replace('_', ' ') +
            '</span>' +
          '</div>' +
          '<h2 class="text-lg font-bold text-slate-900 tracking-tight leading-snug">' + escHtml(t.title) + '</h2>' +
          '<div class="text-xs text-slate-400 font-mono">Engagement Ref #' + t.id + ' • Initiated ' + fmtDate(t.created_at) + ' by ' + escHtml(t.creator_name) + '</div>' +
        '</div>' +
        '<div class="flex items-center gap-1">' +
          (isAdmin ? '<button onclick="showEditTaskModal(' + t.id + ')" class="p-2 text-slate-400 hover:text-slate-700 rounded-lg" title="Edit Engagement"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>' : '') +
          (isAdmin ? '<button onclick="deleteTask(' + t.id + ')" class="p-2 text-slate-400 hover:text-rose-600 rounded-lg" title="Delete Engagement"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>' : '') +
          '<button onclick="closeDrawer()" class="p-2 text-slate-400 hover:text-slate-700 rounded-lg" title="Close"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>' +
        '</div>' +
      '</div>' +

      // Drawer Body (Scrollable)
      '<div class="flex-1 overflow-y-auto p-6 space-y-6 text-xs">' +
        // Scope Description
        '<div>' +
          '<div class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono mb-2">Scope of Work & Client Mandate</div>' +
          '<div class="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg text-slate-700 leading-relaxed font-sans">' +
            (t.description ? escHtml(t.description) : '<span class="text-slate-400 italic">No detailed scope documented.</span>') +
          '</div>' +
        '</div>' +

        // Key Dates Card
        '<div class="grid grid-cols-2 gap-3 p-3.5 border border-slate-200/80 rounded-lg bg-white">' +
          '<div>' +
            '<span class="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-semibold">Statutory Deadline</span>' +
            '<div class="mt-1 font-semibold text-slate-900 font-mono text-xs flex items-center gap-1.5">' +
              (t.deadline ? fmtDate(t.deadline) + deadlineBadge : 'No cutoff specified') +
            '</div>' +
          '</div>' +
          '<div>' +
            '<span class="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-semibold">Filing Reminder</span>' +
            '<div class="mt-1 font-semibold text-slate-900 font-mono text-xs">' +
              (t.reminder_at ? fmtDate(t.reminder_at) : 'No reminder scheduled') +
            '</div>' +
          '</div>' +
        '</div>' +

        // Assigned Staff Team & Independent Tracking
        '<div>' +
          '<div class="flex items-center justify-between mb-2.5">' +
            '<div class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">Assigned Staff & Independent Progress</div>' +
            '<span class="text-[10px] text-slate-400 font-mono">' + assignees.length + ' associates</span>' +
          '</div>' +
          '<div class="space-y-2">';

  if (assignees.length === 0) {
    html += '<p class="text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-slate-200">No staff currently assigned to this engagement.</p>';
  } else {
    assignees.forEach(a => {
      const isMe = a.user_id === S.user.id;
      html += '<div class="p-3.5 rounded-lg border ' + (isMe ? 'border-slate-300 bg-slate-50/70 ring-1 ring-slate-200' : 'border-slate-200 bg-white') + ' space-y-2.5">' +
        '<div class="flex items-center justify-between">' +
          '<div class="flex items-center gap-2.5">' +
            '<div class="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs font-mono">' +
              a.full_name.charAt(0) +
            '</div>' +
            '<div>' +
              '<div class="font-semibold text-slate-900 flex items-center gap-1.5">' +
                escHtml(a.full_name) +
                (isMe ? '<span class="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">You</span>' : '') +
              '</div>' +
              '<div class="text-[10px] text-slate-400 font-mono">@' + a.username + '</div>' +
            '</div>' +
          '</div>' +
          '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ' + getStatusClass(a.status) + '">' +
            a.status.replace('_', ' ') +
          '</span>' +
        '</div>';

      if (a.notes) {
        html += '<div class="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/60 font-sans">' +
          '<span class="font-semibold text-slate-400 font-mono text-[10px] uppercase">Notes: </span>' + escHtml(a.notes) +
        '</div>';
      }

      if (a.completed_at) {
        html += '<div class="text-[10px] text-emerald-700 font-mono">Completed at: ' + fmtDate(a.completed_at) + '</div>';
      }

      // Action triggers for current user or admin
      if (isMe || isAdmin) {
        html += '<div class="pt-1 flex flex-wrap items-center gap-1.5">' +
          (a.status !== 'in_progress' ? '<button onclick="updateStaffAssignment(' + t.id + ',' + a.user_id + ',\\'in_progress\\')" class="px-2.5 py-1 bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 rounded text-[11px] font-medium transition">Start Work</button>' : '') +
          (a.status !== 'completed' ? '<button onclick="updateStaffAssignment(' + t.id + ',' + a.user_id + ',\\'completed\\')" class="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-medium transition">Sign Off Complete</button>' : '') +
          (a.status === 'completed' ? '<button onclick="updateStaffAssignment(' + t.id + ',' + a.user_id + ',\\'pending\\')" class="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded text-[11px] font-medium transition">Reopen</button>' : '') +
          '<button onclick="promptProgressNote(' + t.id + ',' + a.user_id + ')" class="px-2.5 py-1 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-medium transition">Add Work Note</button>' +
        '</div>';
      }
      html += '</div>';
    });
  }
  html += '</div></div>';

  // Attachments Section
  html += '<div>' +
    '<div class="flex items-center justify-between mb-2.5">' +
      '<div class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">Statutory Documentation & Attachments</div>' +
      '<span class="text-[10px] text-slate-400 font-mono">' + attachments.length + ' files</span>' +
    '</div>' +

    // Upload box
    '<div class="mb-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex items-center justify-between gap-3">' +
      '<input type="file" id="drawer-file-input" class="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer">' +
      '<button onclick="uploadDrawerFile(' + t.id + ')" class="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition">Upload to Cloud</button>' +
    '</div>';

  if (attachments.length === 0) {
    html += '<p class="text-slate-400 italic p-3 text-center border border-slate-100 rounded-lg">No documents attached yet (Challans, GSTR JSON, Computation sheets).</p>';
  } else {
    html += '<div class="space-y-1.5">';
    attachments.forEach(att => {
      html += '<div class="flex items-center justify-between p-2.5 bg-slate-50/70 border border-slate-200/80 rounded-lg">' +
        '<div class="flex items-center gap-2.5 min-w-0">' +
          '<svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>' +
          '<div class="min-w-0">' +
            '<div class="font-medium text-slate-900 truncate">' + escHtml(att.original_name) + '</div>' +
            '<div class="text-[10px] text-slate-400 font-mono">' + fmtSize(att.size) + ' • ' + escHtml(att.uploader_name) + ' • ' + fmtDate(att.uploaded_at) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flex items-center gap-1.5 flex-shrink-0">' +
          '<a href="/api/attachments/' + att.id + '/download" target="_blank" class="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded text-[11px] font-medium transition shadow-2xs">Download</a>' +
          (isAdmin ? '<button onclick="deleteAttachment(' + att.id + ',' + t.id + ')" class="p-1 text-slate-400 hover:text-rose-600 rounded"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>' : '') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // Audit Trail
  html += '<div>' +
    '<div class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono mb-2.5">Engagement Audit Trail</div>' +
    '<div class="border border-slate-200/80 rounded-lg p-3 bg-white divide-y divide-slate-100 max-h-48 overflow-y-auto">';
  
  if (activity.length === 0) {
    html += '<p class="text-slate-400 italic">No audit records logged.</p>';
  } else {
    activity.forEach(a => {
      html += '<div class="py-2 first:pt-0 last:pb-0 flex items-start gap-2">' +
        '<span class="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 flex-shrink-0"></span>' +
        '<div class="min-w-0 flex-1">' +
          '<div class="text-slate-700 leading-snug">' + escHtml(a.details || a.action) + '</div>' +
          '<div class="text-[10px] text-slate-400 font-mono mt-0.5">' + escHtml(a.full_name) + ' • ' + fmtDate(a.created_at) + '</div>' +
        '</div>' +
      '</div>';
    });
  }
  html += '</div></div>';

  html += '</div>' + // End scrollable body
    '</div></div>'; // End drawer container

  return html;
}

// ==================== STAFF DIRECTORY VIEW ====================
function renderStaffContent() {
  const isAdmin = S.user.role === 'admin';
  let html = '<div class="space-y-6">';

  html += '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">' +
    '<div>' +
      '<h3 class="text-sm font-semibold text-slate-900">Staff & Associates Management</h3>' +
      '<p class="text-xs text-slate-400">Create staff login credentials, assign practice areas, and monitor workload</p>' +
    '</div>' +
    (isAdmin ? '<button onclick="showStaffModal()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>Create Staff Account</button>' : '') +
  '</div>';

  const staffMembers = S.users.filter(u => u.role === 'staff');
  if (staffMembers.length === 0) {
    html += '<div class="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-2xs">' +
      '<div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">' +
        '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>' +
      '</div>' +
      '<h4 class="text-sm font-semibold text-slate-900">No staff accounts registered yet</h4>' +
      '<p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">Create accounts for your articled assistants and associates. They can then log in using their credentials.</p>' +
      (isAdmin ? '<button onclick="showStaffModal()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition">Create First Staff Account</button>' : '') +
    '</div>';
  } else {
    html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
    staffMembers.forEach(u => {
      const activeTasks = u.active_tasks || 0;
      const totalTasks = u.total_tasks || 0;
      const completedTasks = Math.max(0, totalTasks - activeTasks);
      const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

      html += '<div class="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4">' +
        '<div class="flex items-start justify-between">' +
          '<div class="flex items-center gap-3">' +
            '<div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm font-mono border border-slate-200">' +
              u.full_name.charAt(0) +
            '</div>' +
            '<div>' +
              '<h4 class="font-semibold text-slate-900 leading-tight">' + escHtml(u.full_name) + '</h4>' +
              '<div class="text-[11px] text-slate-400 font-mono">@' + u.username + '</div>' +
            '</div>' +
          '</div>' +
          '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ' +
            (u.is_active ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200') + '">' +
            (u.is_active ? 'Active' : 'Inactive') +
          '</span>' +
        '</div>' +

        // Contact details
        '<div class="space-y-1.5 text-xs text-slate-600 font-mono">' +
          '<div class="flex items-center gap-2">' +
            '<svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>' +
            '<a href="mailto:' + escAttr(u.email) + '" class="hover:underline truncate">' + escHtml(u.email) + '</a>' +
          '</div>' +
          (u.phone ? '<div class="flex items-center gap-2">' +
            '<svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>' +
            '<span>' + escHtml(u.phone) + '</span>' +
          '</div>' : '') +
        '</div>' +

        // Workload gauge
        '<div class="pt-2 border-t border-slate-100">' +
          '<div class="flex items-center justify-between text-[11px] mb-1.5">' +
            '<span class="text-slate-500">Active Load: <strong class="text-slate-900 font-mono">' + activeTasks + '</strong> matters</span>' +
            '<span class="text-slate-400 font-mono">' + completedTasks + '/' + totalTasks + ' done</span>' +
          '</div>' +
          '<div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">' +
            '<div class="bg-slate-800 h-1.5 rounded-full" style="width: ' + pct + '%"></div>' +
          '</div>' +
        '</div>';

      if (isAdmin) {
        html += '<div class="pt-2 flex items-center gap-2">' +
          '<button onclick="showEditStaffModal(' + u.id + ')" class="flex-1 py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-medium transition text-center">Edit</button>' +
          '<button onclick="toggleStaffActive(' + u.id + ',' + (u.is_active ? 0 : 1) + ')" class="py-1.5 px-3 text-xs font-medium rounded border transition ' +
            (u.is_active ? 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50' : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100') + '">' +
            (u.is_active ? 'Deactivate' : 'Activate') +
          '</button>' +
          '<button onclick="deleteStaff(' + u.id + ')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition" title="Delete Staff Account"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>' +
        '</div>';
      }

      html += '</div>';
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// ==================== STATUTORY ACTIVITY LOG VIEW ====================
function renderActivityContent() {
  let html = '<div class="space-y-4">' +
    '<div class="flex items-center justify-between">' +
      '<div>' +
        '<h3 class="text-sm font-semibold text-slate-900">Firm Statutory Activity Log</h3>' +
        '<p class="text-xs text-slate-400">Tamper-evident audit register of logins, engagements, file updates, and sign-offs</p>' +
      '</div>' +
      '<button onclick="loadActivity()" class="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">' +
        '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>' +
        'Refresh Log' +
      '</button>' +
    '</div>';

  html += '<div class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">' +
    '<div class="overflow-x-auto"><table class="w-full text-left text-xs border-collapse">' +
      '<thead><tr class="border-b border-slate-200 text-slate-500 font-medium font-mono text-[11px]">' +
        '<th class="py-3 px-4">Timestamp (IST)</th>' +
        '<th class="py-3 px-4">Initiating Associate</th>' +
        '<th class="py-3 px-4">Action Type</th>' +
        '<th class="py-3 px-4">Audit Scope & Details</th>' +
      '</tr></thead>' +
      '<tbody class="divide-y divide-slate-100">';

  if (S.activity.length === 0) {
    html += '<tr><td colspan="4" class="p-8 text-center text-slate-400 italic">No audit records recorded yet.</td></tr>';
  } else {
    S.activity.forEach(a => {
      html += '<tr class="hover:bg-slate-50/70">' +
        '<td class="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">' + fmtDate(a.created_at) + '</td>' +
        '<td class="py-3 px-4 font-semibold text-slate-800">' + escHtml(a.full_name) + '</td>' +
        '<td class="py-3 px-4">' +
          '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ' + getActivityBadge(a.action) + '">' +
            escHtml(a.action) +
          '</span>' +
        '</td>' +
        '<td class="py-3 px-4 text-slate-600 font-sans">' + escHtml(a.details || '') + '</td>' +
      '</tr>';
    });
  }

  html += '</tbody></table></div></div></div>';
  return html;
}

// ==================== MODALS (CREATE TASK, EDIT, STAFF) ====================
function showTaskModal() {
  const staffList = S.users.filter(u => u.role === 'staff' && u.is_active);
  const catOptions = S.categories.map(c => '<option value="' + c.id + '">' + escHtml(c.name) + '</option>').join('');
  const staffCheckboxes = staffList.map(u => 
    '<label class="flex items-center gap-2.5 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">' +
      '<input type="checkbox" name="assignees" value="' + u.id + '" class="rounded border-slate-300 text-slate-900 focus:ring-slate-900">' +
      '<span class="text-xs font-medium text-slate-800">' + escHtml(u.full_name) + '</span>' +
      '<span class="text-[10px] text-slate-400 font-mono ml-auto">@' + u.username + '</span>' +
    '</label>'
  ).join('');

  const m = document.createElement('div');
  m.className = 'modal-overlay';
  m.id = 'modal-new-task';
  m.innerHTML = '<div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto slide-enter border border-slate-200">' +
    '<div class="flex justify-between items-start mb-5 pb-3 border-b border-slate-100">' +
      '<div>' +
        '<h3 class="text-base font-bold text-slate-900">Create Client Engagement</h3>' +
        '<p class="text-xs text-slate-400">Initialize a statutory audit, return filing, or project report assignment</p>' +
      '</div>' +
      '<button onclick="closeModal(\\'modal-new-task\\')" class="text-slate-400 hover:text-slate-600 p-1">&times;</button>' +
    '</div>' +
    '<div class="space-y-4 text-xs">' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Engagement Title / Client Matter *</label>' +
        '<input id="task-title" required placeholder="e.g. GSTR-3B Filing for Alpha Tech Pvt Ltd" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900">' +
      '</div>' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Scope & Instructions</label>' +
        '<textarea id="task-desc" rows="3" placeholder="Specify books reconciliation steps, disallowance checks, challan criteria..." class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"></textarea>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Practice Category *</label>' +
          '<select id="task-category" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white">' + catOptions + '</select>' +
        '</div>' +
        '<div>' +
          '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Statutory Priority</label>' +
          '<select id="task-priority" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white">' +
            '<option value="low">Low (Routine)</option>' +
            '<option value="medium" selected>Medium (Standard)</option>' +
            '<option value="high">High (Priority)</option>' +
            '<option value="urgent">Urgent (Due Imminently)</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Filing Deadline</label>' +
          '<input id="task-deadline" type="date" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">' +
        '</div>' +
        '<div>' +
          '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Review Reminder</label>' +
          '<input id="task-reminder" type="datetime-local" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1.5">Assign Associate Staff</label>' +
        '<div class="p-2 border border-slate-200 rounded-lg max-h-36 overflow-y-auto space-y-1 bg-slate-50/50">' +
          staffCheckboxes +
        '</div>' +
      '</div>' +
      '<div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">' +
        '<button type="button" onclick="closeModal(\\'modal-new-task\\')" class="px-3.5 py-2 text-slate-600 hover:text-slate-800 rounded-lg">Cancel</button>' +
        '<button type="button" onclick="submitCreateTask()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs">Create Engagement</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  document.body.appendChild(m);
}

async function submitCreateTask() {
  const checkboxes = document.querySelectorAll('input[name="assignees"]:checked');
  const ids = Array.from(checkboxes).map(cb => Number(cb.value));

  const body = {
    title: document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-desc').value.trim(),
    category_id: Number(document.getElementById('task-category').value),
    priority: document.getElementById('task-priority').value,
    deadline: document.getElementById('task-deadline').value || null,
    reminder_at: document.getElementById('task-reminder').value || null,
    assignee_ids: ids,
  };

  if (!body.title) {
    toast('Engagement title is required', 'error');
    return;
  }

  const res = await api('/tasks', { method: 'POST', body });
  if (res && res.id) {
    toast('Client engagement registered successfully');
    closeModal('modal-new-task');
    await loadTasks();
    await loadDashboardStats();
    render();
  } else {
    toast((res && res.error) || 'Creation failed', 'error');
  }
}

function showEditTaskModal(id) {
  const t = S.taskDetail.task;
  const currentAssignees = (S.taskDetail.assignees || []).map(a => a.user_id);
  const staffList = S.users.filter(u => u.role === 'staff');
  const catOptions = S.categories.map(c => 
    '<option value="' + c.id + '" ' + (c.id === t.category_id ? 'selected' : '') + '>' + escHtml(c.name) + '</option>'
  ).join('');

  const staffCheckboxes = staffList.map(u => 
    '<label class="flex items-center gap-2.5 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">' +
      '<input type="checkbox" name="edit-assignees" value="' + u.id + '" ' + (currentAssignees.includes(u.id) ? 'checked' : '') + ' class="rounded border-slate-300 text-slate-900 focus:ring-slate-900">' +
      '<span class="text-xs font-medium text-slate-800">' + escHtml(u.full_name) + '</span>' +
    '</label>'
  ).join('');

  const m = document.createElement('div');
  m.className = 'modal-overlay';
  m.id = 'modal-edit-task';
  m.innerHTML = '<div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto slide-enter border border-slate-200">' +
    '<div class="flex justify-between items-start mb-5 pb-3 border-b border-slate-100">' +
      '<div>' +
        '<h3 class="text-base font-bold text-slate-900">Edit Client Engagement #' + t.id + '</h3>' +
        '<p class="text-xs text-slate-400">Update parameters, status, or reallocate staff</p>' +
      '</div>' +
      '<button onclick="closeModal(\\'modal-edit-task\\')" class="text-slate-400 hover:text-slate-600 p-1">&times;</button>' +
    '</div>' +
    '<div class="space-y-4 text-xs">' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Title *</label>' +
        '<input id="edit-title" value="' + escAttr(t.title) + '" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">' +
      '</div>' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Description</label>' +
        '<textarea id="edit-desc" rows="3" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">' + escHtml(t.description || '') + '</textarea>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Category</label>' +
          '<select id="edit-category" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white">' + catOptions + '</select>' +
        '</div>' +
        '<div>' +
          '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Priority</label>' +
          '<select id="edit-priority" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white">' +
            ['low', 'medium', 'high', 'urgent'].map(p => '<option value="' + p + '" ' + (p === t.priority ? 'selected' : '') + '>' + p + '</option>').join('') +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Overall Status</label>' +
          '<select id="edit-status" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white">' +
            ['pending', 'in_progress', 'completed', 'overdue'].map(s => '<option value="' + s + '" ' + (s === t.status ? 'selected' : '') + '>' + s + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Deadline Date</label>' +
          '<input id="edit-deadline" type="date" value="' + (t.deadline ? t.deadline.split('T')[0] : '') + '" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1.5">Assignees</label>' +
        '<div class="p-2 border border-slate-200 rounded-lg max-h-36 overflow-y-auto space-y-1 bg-slate-50/50">' +
          staffCheckboxes +
        '</div>' +
      '</div>' +
      '<div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">' +
        '<button type="button" onclick="closeModal(\\'modal-edit-task\\')" class="px-3.5 py-2 text-slate-600 hover:text-slate-800 rounded-lg">Cancel</button>' +
        '<button type="button" onclick="submitEditTask(' + t.id + ')" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs">Save Changes</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  document.body.appendChild(m);
}

async function submitEditTask(id) {
  const checkboxes = document.querySelectorAll('input[name="edit-assignees"]:checked');
  const ids = Array.from(checkboxes).map(cb => Number(cb.value));

  const body = {
    title: document.getElementById('edit-title').value.trim(),
    description: document.getElementById('edit-desc').value.trim(),
    category_id: Number(document.getElementById('edit-category').value),
    priority: document.getElementById('edit-priority').value,
    status: document.getElementById('edit-status').value,
    deadline: document.getElementById('edit-deadline').value || null,
    assignee_ids: ids,
  };

  const res = await api('/tasks/' + id, { method: 'PUT', body });
  if (res && res.message) {
    toast('Engagement updated');
    closeModal('modal-edit-task');
    await loadTaskDetail(id);
    await loadTasks();
  } else {
    toast('Update failed', 'error');
  }
}

async function deleteTask(id) {
  if (!confirm('Are you sure you want to permanently remove this engagement and all linked files?')) return;
  const res = await api('/tasks/' + id, { method: 'DELETE' });
  if (res && res.message) {
    toast('Engagement removed');
    closeDrawer();
    await loadTasks();
    await loadDashboardStats();
    render();
  } else {
    toast('Delete failed', 'error');
  }
}

// Staff modal
function showStaffModal() {
  const m = document.createElement('div');
  m.className = 'modal-overlay';
  m.id = 'modal-new-staff';
  m.innerHTML = '<div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 slide-enter border border-slate-200">' +
    '<div class="flex justify-between items-start mb-5 pb-3 border-b border-slate-100">' +
      '<div>' +
        '<h3 class="text-base font-bold text-slate-900">Create Staff Account</h3>' +
        '<p class="text-xs text-slate-400">Set up login credentials for an associate or articled assistant</p>' +
      '</div>' +
      '<button onclick="closeModal(\\'modal-new-staff\\')" class="text-slate-400 hover:text-slate-600 p-1">&times;</button>' +
    '</div>' +
    '<div class="space-y-3.5 text-xs">' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Full Name *</label>' +
        '<input id="staff-name" required placeholder="e.g. Pooja Mehta" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900">' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Username (Login ID) *</label>' +
          '<input id="staff-username" required placeholder="pooja" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900">' +
        '</div>' +
        '<div>' +
          '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Password *</label>' +
          '<input id="staff-password" type="password" required placeholder="••••••••" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900">' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Email Address *</label>' +
        '<input id="staff-email" type="email" required placeholder="pooja@camalu.in" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900">' +
      '</div>' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Phone / Mobile</label>' +
        '<input id="staff-phone" placeholder="9876543210" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900">' +
      '</div>' +
      '<div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-sans leading-relaxed">' +
        '<strong>Security note:</strong> The staff member will use the specified username and password to log in. No one can access the system without authorized credentials.' +
      '</div>' +
      '<div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">' +
        '<button type="button" onclick="closeModal(\\'modal-new-staff\\')" class="px-3.5 py-2 text-slate-600 hover:text-slate-800 rounded-lg">Cancel</button>' +
        '<button type="button" onclick="submitCreateStaff()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs transition">Create Account</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  document.body.appendChild(m);
}

async function submitCreateStaff() {
  const nameEl = document.getElementById('staff-name');
  const userEl = document.getElementById('staff-username');
  const passEl = document.getElementById('staff-password');
  const emailEl = document.getElementById('staff-email');
  const phoneEl = document.getElementById('staff-phone');

  const body = {
    full_name: nameEl ? nameEl.value.trim() : '',
    username: userEl ? userEl.value.trim().toLowerCase() : '',
    password: passEl ? passEl.value : '',
    email: emailEl ? emailEl.value.trim() : '',
    phone: phoneEl ? phoneEl.value.trim() : null,
    role: 'staff'
  };

  if (!body.full_name || !body.username || !body.password || !body.email) {
    toast('Please fill all mandatory fields (Name, Username, Password, Email)', 'error');
    return;
  }

  if (body.username.includes(' ')) {
    toast('Username cannot contain spaces', 'error');
    return;
  }

  const res = await api('/users', { method: 'POST', body });
  if (res && res.id) {
    toast('Staff account created for ' + body.full_name + ' (@' + body.username + ')');
    closeModal('modal-new-staff');
    await loadUsers();
    render();
  } else {
    toast((res && res.error) || 'Registration failed', 'error');
  }
}

async function deleteStaff(id) {
  const u = S.users.find(x => x.id === id);
  if (!u) return;
  if (!confirm('Permanently delete staff account for "' + u.full_name + '" (@' + u.username + ')?\n\nAll assignment history for this user will be removed.')) return;
  const res = await api('/users/' + id, { method: 'DELETE' });
  if (res && res.message) {
    toast('Staff account removed');
    await loadUsers();
    render();
  } else {
    toast((res && res.error) || 'Failed to delete staff member', 'error');
  }
}

function showEditStaffModal(id) {
  const u = S.users.find(x => x.id === id);
  if (!u) return;
  const m = document.createElement('div');
  m.className = 'modal-overlay';
  m.id = 'modal-edit-staff';
  m.innerHTML = '<div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 slide-enter border border-slate-200">' +
    '<div class="flex justify-between items-start mb-5 pb-3 border-b border-slate-100">' +
      '<div>' +
        '<h3 class="text-base font-bold text-slate-900">Edit Associate: ' + escHtml(u.full_name) + '</h3>' +
        '<p class="text-xs text-slate-400">Update contact info or reset password</p>' +
      '</div>' +
      '<button onclick="closeModal(\\'modal-edit-staff\\')" class="text-slate-400 hover:text-slate-600 p-1">&times;</button>' +
    '</div>' +
    '<div class="space-y-3.5 text-xs">' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Full Name</label>' +
        '<input id="es-name" value="' + escAttr(u.full_name) + '" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">' +
      '</div>' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Email</label>' +
        '<input id="es-email" value="' + escAttr(u.email) + '" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">' +
      '</div>' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Phone</label>' +
        '<input id="es-phone" value="' + escAttr(u.phone || '') + '" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">' +
      '</div>' +
      '<div>' +
        '<label class="block font-semibold uppercase tracking-wider text-[10px] text-slate-600 font-mono mb-1">Reset Password (leave empty to retain)</label>' +
        '<input id="es-password" type="password" placeholder="New password" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">' +
      '</div>' +
      '<div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">' +
        '<button type="button" onclick="closeModal(\\'modal-edit-staff\\')" class="px-3.5 py-2 text-slate-600 hover:text-slate-800 rounded-lg">Cancel</button>' +
        '<button type="button" onclick="submitEditStaff(' + u.id + ')" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs">Save Associate</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  document.body.appendChild(m);
}

async function submitEditStaff(id) {
  const body = {
    full_name: document.getElementById('es-name').value.trim(),
    email: document.getElementById('es-email').value.trim(),
    phone: document.getElementById('es-phone').value.trim() || null,
  };
  const pw = document.getElementById('es-password').value;
  if (pw) body.password = pw;

  const res = await api('/users/' + id, { method: 'PUT', body });
  if (res && res.message) {
    toast('Associate record updated');
    closeModal('modal-edit-staff');
    await loadUsers();
    render();
  } else {
    toast('Update failed', 'error');
  }
}

async function toggleStaffActive(id, newStatus) {
  const u = S.users.find(x => x.id === id);
  if (!u) return;
  const res = await api('/users/' + id, { method: 'PUT', body: { full_name: u.full_name, email: u.email, phone: u.phone, is_active: newStatus } });
  if (res && res.message) {
    toast(newStatus ? 'Associate activated' : 'Associate deactivated');
    await loadUsers();
    render();
  }
}

// ==================== ASSIGNMENTS & ATTACHMENTS ====================
async function updateStaffAssignment(taskId, userId, status) {
  const res = await api('/tasks/' + taskId + '/assignments/' + userId, { method: 'PUT', body: { status } });
  if (res && res.message) {
    toast('Assignment updated: ' + status);
    await loadTaskDetail(taskId);
    await loadTasks();
    await loadDashboardStats();
  } else {
    toast('Failed to update assignment', 'error');
  }
}

function promptProgressNote(taskId, userId) {
  const currentAss = (S.taskDetail.assignees || []).find(x => x.user_id === userId);
  const note = prompt('Enter your progress update / notes for this engagement:', currentAss ? (currentAss.notes || '') : '');
  if (note !== null) {
    api('/tasks/' + taskId + '/assignments/' + userId, {
      method: 'PUT',
      body: { status: currentAss ? currentAss.status : 'in_progress', notes: note }
    }).then(() => {
      toast('Progress note recorded');
      loadTaskDetail(taskId);
    });
  }
}

async function uploadDrawerFile(taskId) {
  const input = document.getElementById('drawer-file-input');
  if (!input.files || !input.files[0]) {
    toast('Select a document to upload', 'error');
    return;
  }
  const file = input.files[0];
  const fd = new FormData();
  fd.append('file', file);
  
  toast('Uploading to Cloudflare R2...');
  const res = await api('/tasks/' + taskId + '/attachments', { method: 'POST', body: fd });
  if (res && res.id) {
    toast('Document successfully secured in R2 storage');
    loadTaskDetail(taskId);
  } else {
    toast('Upload failed', 'error');
  }
}

async function deleteAttachment(attId, taskId) {
  if (!confirm('Permanently delete this attachment?')) return;
  const res = await api('/attachments/' + attId, { method: 'DELETE' });
  if (res && res.message) {
    toast('Document deleted');
    loadTaskDetail(taskId);
  }
}

// ==================== FILTERING & TABS ====================
function setTab(tab) {
  S.activeTab = tab;
  applyLocalFilters();
  render();
}

function filterByCategory(catId) {
  S.selectedCategory = catId;
  loadTasks().then(() => render());
}

function filterByPriority(prio) {
  S.selectedPriority = prio;
  loadTasks().then(() => render());
}

function handleSearch(val) {
  S.searchQuery = val;
  applyLocalFilters();
  const tableContainer = document.querySelector('tbody');
  if (tableContainer) {
    applyLocalFilters();
    render();
    const input = document.getElementById('global-search');
    if (input) {
      input.focus();
      input.selectionStart = input.selectionEnd = input.value.length;
    }
  }
}

function closeDrawer() {
  S.taskDetail = null;
  render();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ==================== UTILITIES & STYLING TOKENS ====================
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return d;
  }
}

function fmtSize(b) {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function getCategoryClass(cat) {
  if (!cat) return 'bg-slate-50 text-slate-700 border-slate-200';
  const c = cat.toLowerCase();
  if (c.includes('gst')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (c.includes('itr')) return 'bg-rose-50 text-rose-800 border-rose-200';
  if (c.includes('tds')) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (c.includes('bookkeeping')) return 'bg-sky-50 text-sky-800 border-sky-200';
  if (c.includes('project')) return 'bg-violet-50 text-violet-800 border-violet-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function getPriorityClass(p) {
  if (p === 'urgent') return 'bg-rose-50 text-rose-800 border-rose-200';
  if (p === 'high') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (p === 'medium') return 'bg-sky-50 text-sky-800 border-sky-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function getStatusClass(s) {
  if (s === 'completed') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (s === 'in_progress') return 'bg-sky-50 text-sky-800 border-sky-200';
  if (s === 'overdue') return 'bg-rose-50 text-rose-800 border-rose-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

function getStatusDot(s) {
  if (s === 'completed') return 'bg-emerald-600';
  if (s === 'in_progress') return 'bg-sky-600';
  if (s === 'overdue') return 'bg-rose-600';
  return 'bg-amber-600';
}

function getActivityBadge(action) {
  if (!action) return 'bg-slate-50 text-slate-700 border-slate-200';
  if (action.includes('created')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (action.includes('login')) return 'bg-slate-100 text-slate-700 border-slate-200';
  if (action.includes('file')) return 'bg-sky-50 text-sky-800 border-sky-200';
  if (action.includes('completed')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function getDeadlineBadge(deadline) {
  if (!deadline) return '';
  const now = new Date();
  const d = new Date(deadline);
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return ' <span class="text-[10px] text-rose-700 font-semibold font-mono">Overdue ' + Math.abs(diffDays) + 'd</span>';
  } else if (diffDays === 0) {
    return ' <span class="text-[10px] text-rose-700 font-semibold font-mono">Due Today</span>';
  } else if (diffDays <= 3) {
    return ' <span class="text-[10px] text-amber-700 font-semibold font-mono">' + diffDays + 'd left</span>';
  }
  return ' <span class="text-[10px] text-slate-400 font-mono">' + diffDays + 'd left</span>';
}

// Global Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (S.taskDetail) closeDrawer();
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
  }
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    const search = document.getElementById('global-search');
    if (search) search.focus();
  }
  if ((e.key === 'n' || e.key === 'N') && S.user && S.user.role === 'admin' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    showTaskModal();
  }
});

// ==================== APP INITIALIZATION ====================
async function initApp() {
  const isAuthed = await checkAuth();
  if (isAuthed) {
    await refreshAllData();
  }
  render();
}

initApp();
</script>
</body>
</html>`;
}
