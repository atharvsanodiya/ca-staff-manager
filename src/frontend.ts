export function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CA Staff Manager</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  .toast{position:fixed;top:1rem;right:1rem;z-index:9999;padding:1rem 1.5rem;border-radius:.5rem;color:#fff;font-weight:500;animation:slideIn .3s ease}
  @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:50;display:flex;align-items:center;justify-content:center}
  .spinner{border:3px solid #e5e7eb;border-top:3px solid #6366f1;border-radius:50%;width:24px;height:24px;animation:spin 1s linear infinite;display:inline-block}
  @keyframes spin{to{transform:rotate(360deg)}}
  .sidebar-link{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;border-radius:.5rem;transition:all .15s;cursor:pointer}
  .sidebar-link:hover,.sidebar-link.active{background:#4f46e5;color:#fff}
  .badge{display:inline-flex;align-items:center;padding:.125rem .625rem;border-radius:9999px;font-size:.75rem;font-weight:600}
  body{font-family:system-ui,-apple-system,sans-serif}
</style>
</head>
<body class="bg-gray-50 min-h-screen">
<div id="app"></div>
<script>
// ==================== STATE ====================
const S = {
  token: localStorage.getItem('token'),
  user: null,
  page: 'dashboard',
  tasks: [],
  users: [],
  categories: [],
  activity: [],
  stats: {},
  taskDetail: null,
  loading: false,
  sidebarOpen: true,
};

// ==================== API ====================
async function api(path, opts = {}) {
  const headers = { ...opts.headers };
  if (S.token) headers['Authorization'] = 'Bearer ' + S.token;
  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const r = await fetch('/api' + path, { ...opts, headers });
  if (r.status === 401) { logout(); return null; }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('json')) return r.json();
  return r;
}

// ==================== AUTH ====================
async function login(e) {
  e.preventDefault();
  const u = document.getElementById('login-user').value;
  const p = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    const res = await api('/auth/login', { method: 'POST', body: { username: u, password: p } });
    if (res && res.token) {
      S.token = res.token;
      S.user = res.user;
      localStorage.setItem('token', res.token);
      S.page = 'dashboard';
      render();
      loadDashboard();
    } else {
      errEl.textContent = (res && res.error) || 'Login failed';
    }
  } catch(ex) { errEl.textContent = 'Connection error'; }
}

function logout() {
  S.token = null; S.user = null;
  localStorage.removeItem('token');
  render();
}

async function checkAuth() {
  if (!S.token) return false;
  const res = await api('/auth/me');
  if (res && res.user) { S.user = res.user; return true; }
  S.token = null; localStorage.removeItem('token');
  return false;
}

// ==================== DATA LOADING ====================
async function loadDashboard() {
  S.stats = await api('/dashboard/stats') || {};
  render();
}

async function loadTasks(filters = '') {
  const res = await api('/tasks' + (filters ? '?' + filters : ''));
  S.tasks = (res && res.tasks) || [];
  render();
}

async function loadTaskDetail(id) {
  S.taskDetail = await api('/tasks/' + id);
  render();
}

async function loadUsers() {
  const res = await api('/users');
  S.users = (res && res.users) || [];
  render();
}

async function loadCategories() {
  const res = await api('/categories');
  S.categories = (res && res.categories) || [];
}

async function loadActivity() {
  const res = await api('/activity');
  S.activity = (res && res.activity) || [];
  render();
}

// ==================== TOAST ====================
function toast(msg, type = 'success') {
  const d = document.createElement('div');
  d.className = 'toast ' + (type === 'error' ? 'bg-red-500' : 'bg-green-500');
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}

// ==================== NAVIGATION ====================
function nav(page) {
  S.page = page;
  S.taskDetail = null;
  render();
  if (page === 'dashboard') loadDashboard();
  else if (page === 'tasks') loadTasks();
  else if (page === 'staff') loadUsers();
  else if (page === 'activity') loadActivity();
}

// ==================== RENDER ====================
function render() {
  const app = document.getElementById('app');
  if (!S.token || !S.user) { app.innerHTML = renderLogin(); return; }
  app.innerHTML = renderLayout();
  attachEvents();
}

function renderLogin() {
  return '<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600">' +
    '<div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">' +
    '<div class="text-center mb-8">' +
    '<div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>' +
    '<h1 class="text-2xl font-bold text-gray-800">CA Staff Manager</h1>' +
    '<p class="text-gray-500 mt-1">Sign in to your account</p></div>' +
    '<form onsubmit="login(event)">' +
    '<div class="mb-4"><label class="block text-sm font-medium text-gray-700 mb-1">Username</label>' +
    '<input id="login-user" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Enter username" required></div>' +
    '<div class="mb-6"><label class="block text-sm font-medium text-gray-700 mb-1">Password</label>' +
    '<input id="login-pass" type="password" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Enter password" required></div>' +
    '<div id="login-error" class="text-red-500 text-sm mb-4"></div>' +
    '<button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">Sign In</button>' +
    '</form></div></div>';
}

function renderLayout() {
  const isAdmin = S.user.role === 'admin';
  const menuItems = isAdmin
    ? [['dashboard','Dashboard','M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'],
       ['tasks','Tasks','M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'],
       ['staff','Staff','M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'],
       ['activity','Activity Log','M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z']]
    : [['dashboard','My Dashboard','M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'],
       ['tasks','My Tasks','M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'],
       ['activity','My Activity','M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z']];

  const sidebar = '<aside class="fixed left-0 top-0 h-full w-64 bg-indigo-900 text-indigo-100 p-4 z-40 transform transition-transform ' + (S.sidebarOpen ? '' : '-translate-x-full') + ' lg:translate-x-0">' +
    '<div class="flex items-center gap-3 mb-8 px-2"><div class="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white text-lg">CA</div>' +
    '<div><div class="font-bold text-white">Staff Manager</div><div class="text-xs text-indigo-300">v1.0</div></div></div>' +
    '<nav class="space-y-1">' +
    menuItems.map(function(m) {
      return '<div class="sidebar-link ' + (S.page === m[0] ? 'active' : '') + '" onclick="nav(\\''+m[0]+'\\')"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="'+m[2]+'"/></svg><span>'+m[1]+'</span></div>';
    }).join('') +
    '</nav></aside>';

  const topbar = '<header class="fixed top-0 left-0 lg:left-64 right-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-30">' +
    '<button class="lg:hidden p-2 rounded-lg hover:bg-gray-100" onclick="S.sidebarOpen=!S.sidebarOpen;render()"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg></button>' +
    '<h2 class="text-lg font-semibold text-gray-800 capitalize">' + S.page.replace('_', ' ') + '</h2>' +
    '<div class="flex items-center gap-4">' +
    '<span class="badge ' + (isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700') + '">' + S.user.role + '</span>' +
    '<span class="text-sm font-medium text-gray-700">' + S.user.full_name + '</span>' +
    '<button onclick="logout()" class="text-sm text-red-500 hover:text-red-700 font-medium">Logout</button></div></header>';

  let content = '';
  if (S.page === 'dashboard') content = renderDashboard();
  else if (S.page === 'tasks') content = S.taskDetail ? renderTaskDetail() : renderTasks();
  else if (S.page === 'staff') content = renderStaff();
  else if (S.page === 'activity') content = renderActivity();

  return sidebar + topbar + '<main class="lg:ml-64 mt-16 p-6">' + content + '</main>';
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  const s = S.stats;
  const isAdmin = S.user.role === 'admin';

  const cards = [
    { label: 'Total Tasks', val: s.total || 0, color: 'indigo', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'Pending', val: s.pending || 0, color: 'yellow', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'In Progress', val: s.in_progress || 0, color: 'blue', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Completed', val: s.completed || 0, color: 'green', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];
  if (isAdmin) cards.push({ label: 'Overdue', val: s.overdue || 0, color: 'red', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' });

  let html = '<div class="grid grid-cols-2 lg:grid-cols-' + (isAdmin ? '5' : '4') + ' gap-4 mb-8">';
  cards.forEach(function(c) {
    html += '<div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><div class="flex items-center justify-between">' +
      '<div><p class="text-sm text-gray-500">' + c.label + '</p><p class="text-2xl font-bold text-gray-800 mt-1">' + c.val + '</p></div>' +
      '<div class="w-12 h-12 bg-' + c.color + '-100 rounded-lg flex items-center justify-center"><svg class="w-6 h-6 text-' + c.color + '-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="' + c.icon + '"/></svg></div></div></div>';
  });
  html += '</div>';

  // Recent Tasks
  html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6"><h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Tasks</h3>';
  if (s.recent_tasks && s.recent_tasks.length > 0) {
    html += '<div class="space-y-3">';
    s.recent_tasks.forEach(function(t) {
      html += '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onclick="S.page=\\'tasks\\';loadTaskDetail(' + t.id + ')">' +
        '<div class="flex items-center gap-3">' +
        '<span class="badge" style="background:' + t.category_color + '20;color:' + t.category_color + '">' + t.category_name + '</span>' +
        '<span class="font-medium text-gray-700">' + escHtml(t.title) + '</span></div>' +
        '<div class="flex items-center gap-2"><span class="badge ' + statusColor(t.status) + '">' + t.status + '</span>' +
        (t.deadline ? '<span class="text-xs text-gray-400">' + fmtDate(t.deadline) + '</span>' : '') + '</div></div>';
    });
    html += '</div>';
  } else {
    html += '<p class="text-gray-400">No tasks yet</p>';
  }
  html += '</div>';

  // Admin: Task distribution
  if (isAdmin && s.tasks_by_category) {
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">';
    html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6"><h3 class="text-lg font-semibold text-gray-800 mb-4">Tasks by Category</h3><div class="space-y-3">';
    s.tasks_by_category.forEach(function(c) {
      html += '<div class="flex items-center justify-between"><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background:' + c.color + '"></div><span class="text-sm text-gray-600">' + c.name + '</span></div><span class="font-semibold text-gray-800">' + c.count + '</span></div>';
    });
    html += '</div></div>';

    html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6"><h3 class="text-lg font-semibold text-gray-800 mb-4">Staff Workload</h3><div class="space-y-3">';
    if (s.tasks_by_staff) {
      s.tasks_by_staff.forEach(function(st) {
        const pct = st.total > 0 ? Math.round((st.completed / st.total) * 100) : 0;
        html += '<div><div class="flex justify-between text-sm mb-1"><span class="text-gray-600">' + st.full_name + '</span><span class="text-gray-500">' + st.completed + '/' + st.total + ' completed</span></div>' +
          '<div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-indigo-500 h-2 rounded-full" style="width:' + pct + '%"></div></div></div>';
      });
    }
    html += '</div></div></div>';
  }

  return html;
}

// ==================== TASKS ====================
function renderTasks() {
  const isAdmin = S.user.role === 'admin';
  let html = '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">';
  html += '<div class="flex flex-wrap gap-2">' +
    '<select id="filter-status" onchange="applyFilters()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="">All Status</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="overdue">Overdue</option></select>' +
    '<select id="filter-category" onchange="applyFilters()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="">All Categories</option>' +
    S.categories.map(function(c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('') + '</select>' +
    '<select id="filter-priority" onchange="applyFilters()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="">All Priorities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>' +
    '</div>';
  if (isAdmin) {
    html += '<button onclick="showTaskModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>New Task</button>';
  }
  html += '</div>';

  // Tasks table
  html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div class="overflow-x-auto"><table class="w-full"><thead class="bg-gray-50"><tr>' +
    '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Task</th>' +
    '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>' +
    '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Priority</th>' +
    '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>' +
    '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Deadline</th>' +
    '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Assignees</th>' +
    '</tr></thead><tbody class="divide-y divide-gray-100">';

  if (S.tasks.length === 0) {
    html += '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No tasks found</td></tr>';
  }
  S.tasks.forEach(function(t) {
    html += '<tr class="hover:bg-gray-50 cursor-pointer" onclick="loadTaskDetail(' + t.id + ')">' +
      '<td class="px-4 py-3"><div class="font-medium text-gray-800">' + escHtml(t.title) + '</div>' + (t.description ? '<div class="text-xs text-gray-400 truncate max-w-xs">' + escHtml(t.description).substring(0, 60) + '</div>' : '') + '</td>' +
      '<td class="px-4 py-3"><span class="badge" style="background:' + (t.category_color || '#6366f1') + '20;color:' + (t.category_color || '#6366f1') + '">' + (t.category_name || '') + '</span></td>' +
      '<td class="px-4 py-3"><span class="badge ' + priorityColor(t.priority) + '">' + t.priority + '</span></td>' +
      '<td class="px-4 py-3"><span class="badge ' + statusColor(t.status || t.my_status || 'pending') + '">' + (t.status || t.my_status || 'pending') + '</span></td>' +
      '<td class="px-4 py-3 text-sm text-gray-500">' + (t.deadline ? fmtDate(t.deadline) : '-') + '</td>' +
      '<td class="px-4 py-3"><div class="flex -space-x-2">' + (t.assignees || []).map(function(a) { return '<div class="w-7 h-7 bg-indigo-200 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700 border-2 border-white" title="' + a.full_name + '">' + a.full_name.charAt(0) + '</div>'; }).join('') + '</div></td>' +
      '</tr>';
  });
  html += '</tbody></table></div></div>';

  return html;
}

// ==================== TASK DETAIL ====================
function renderTaskDetail() {
  if (!S.taskDetail || !S.taskDetail.task) return '<p>Loading...</p>';
  const t = S.taskDetail.task;
  const assignees = S.taskDetail.assignees || [];
  const attachments = S.taskDetail.attachments || [];
  const acts = S.taskDetail.activity || [];
  const isAdmin = S.user.role === 'admin';

  let html = '<button onclick="S.taskDetail=null;nav(\\'tasks\\')" class="text-indigo-600 hover:text-indigo-800 font-medium mb-4 inline-flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>Back to Tasks</button>';

  html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">';

  // Main info
  html += '<div class="lg:col-span-2 space-y-6">';
  html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6"><div class="flex items-start justify-between mb-4"><div>' +
    '<h2 class="text-xl font-bold text-gray-800">' + escHtml(t.title) + '</h2>' +
    '<div class="flex gap-2 mt-2">' +
    '<span class="badge" style="background:' + t.category_color + '20;color:' + t.category_color + '">' + t.category_name + '</span>' +
    '<span class="badge ' + priorityColor(t.priority) + '">' + t.priority + '</span>' +
    '<span class="badge ' + statusColor(t.status) + '">' + t.status + '</span></div></div>';

  if (isAdmin) {
    html += '<div class="flex gap-2">' +
      '<button onclick="showEditTaskModal(' + t.id + ')" class="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100">Edit</button>' +
      '<button onclick="deleteTask(' + t.id + ')" class="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100">Delete</button></div>';
  }
  html += '</div>';

  if (t.description) html += '<p class="text-gray-600 mb-4">' + escHtml(t.description) + '</p>';
  html += '<div class="grid grid-cols-2 gap-4 text-sm">' +
    '<div><span class="text-gray-400">Deadline:</span> <span class="font-medium">' + (t.deadline ? fmtDate(t.deadline) : 'None') + '</span></div>' +
    '<div><span class="text-gray-400">Created:</span> <span class="font-medium">' + fmtDate(t.created_at) + '</span></div>' +
    '<div><span class="text-gray-400">Created by:</span> <span class="font-medium">' + t.creator_name + '</span></div>' +
    '</div></div>';

  // Assignees
  html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6"><h3 class="text-lg font-semibold text-gray-800 mb-4">Assignees & Progress</h3>';
  if (assignees.length === 0) {
    html += '<p class="text-gray-400">No one assigned</p>';
  } else {
    html += '<div class="space-y-3">';
    assignees.forEach(function(a) {
      const isMine = S.user.id === a.user_id;
      html += '<div class="p-4 bg-gray-50 rounded-lg"><div class="flex items-center justify-between mb-2">' +
        '<div class="flex items-center gap-3"><div class="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center font-bold text-indigo-700">' + a.full_name.charAt(0) + '</div>' +
        '<div><div class="font-medium text-gray-800">' + a.full_name + '</div><div class="text-xs text-gray-400">' + a.username + '</div></div></div>' +
        '<span class="badge ' + statusColor(a.status) + '">' + a.status + '</span></div>';

      if (a.notes) html += '<p class="text-sm text-gray-500 mt-2 ml-13">Notes: ' + escHtml(a.notes) + '</p>';
      if (a.completed_at) html += '<p class="text-xs text-gray-400 mt-1 ml-13">Completed: ' + fmtDate(a.completed_at) + '</p>';

      // Action buttons
      if (isMine || isAdmin) {
        html += '<div class="flex gap-2 mt-3">';
        if (a.status === 'pending') {
          html += '<button onclick="updateAssignment(' + t.id + ',' + a.user_id + ',\\'in_progress\\')" class="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">Start Working</button>';
        }
        if (a.status === 'in_progress') {
          html += '<button onclick="updateAssignment(' + t.id + ',' + a.user_id + ',\\'completed\\')" class="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600">Mark Complete</button>';
        }
        if (a.status !== 'pending') {
          html += '<button onclick="updateAssignment(' + t.id + ',' + a.user_id + ',\\'pending\\')" class="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400">Reset</button>';
        }
        html += '<button onclick="promptNote(' + t.id + ',' + a.user_id + ')" class="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200">Add Note</button>';
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // Attachments
  html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6"><h3 class="text-lg font-semibold text-gray-800 mb-4">Attachments</h3>';
  html += '<form id="upload-form" class="mb-4 flex gap-2"><input type="file" id="file-input" class="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100">' +
    '<button type="button" onclick="uploadFile(' + t.id + ')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Upload</button></form>';
  if (attachments.length > 0) {
    html += '<div class="space-y-2">';
    attachments.forEach(function(att) {
      html += '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div class="flex items-center gap-3">' +
        '<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>' +
        '<div><div class="text-sm font-medium text-gray-700">' + escHtml(att.original_name) + '</div><div class="text-xs text-gray-400">' + fmtSize(att.size) + ' • ' + att.uploader_name + '</div></div></div>' +
        '<div class="flex gap-2"><a href="/api/attachments/' + att.id + '/download" target="_blank" class="px-3 py-1 bg-indigo-50 text-indigo-600 text-sm rounded-lg hover:bg-indigo-100">Download</a>';
      if (isAdmin) html += '<button onclick="deleteAttachment(' + att.id + ',' + t.id + ')" class="px-3 py-1 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100">Delete</button>';
      html += '</div></div>';
    });
    html += '</div>';
  } else {
    html += '<p class="text-gray-400 text-sm">No attachments</p>';
  }
  html += '</div></div>';

  // Sidebar
  html += '<div class="space-y-6">';
  // Activity
  html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6"><h3 class="text-lg font-semibold text-gray-800 mb-4">Activity</h3><div class="space-y-3">';
  if (acts.length === 0) {
    html += '<p class="text-gray-400 text-sm">No activity</p>';
  }
  acts.forEach(function(a) {
    html += '<div class="flex gap-3"><div class="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div><div><div class="text-sm text-gray-600">' + escHtml(a.details || a.action) + '</div><div class="text-xs text-gray-400">' + a.full_name + ' • ' + fmtDate(a.created_at) + '</div></div></div>';
  });
  html += '</div></div></div>';

  html += '</div>';
  return html;
}

// ==================== STAFF ====================
function renderStaff() {
  const isAdmin = S.user.role === 'admin';
  let html = '';
  if (isAdmin) {
    html += '<div class="flex justify-end mb-6"><button onclick="showStaffModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>Add Staff</button></div>';
  }

  html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
  S.users.filter(function(u) { return u.role === 'staff'; }).forEach(function(u) {
    html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">' +
      '<div class="flex items-center gap-4 mb-4">' +
      '<div class="w-14 h-14 bg-indigo-200 rounded-full flex items-center justify-center text-xl font-bold text-indigo-700">' + u.full_name.charAt(0) + '</div>' +
      '<div><h3 class="font-semibold text-gray-800">' + u.full_name + '</h3><p class="text-sm text-gray-400">@' + u.username + '</p></div>' +
      '<span class="ml-auto badge ' + (u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') + '">' + (u.is_active ? 'Active' : 'Inactive') + '</span></div>' +
      '<div class="space-y-2 text-sm text-gray-600">' +
      '<div class="flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>' + u.email + '</div>' +
      (u.phone ? '<div class="flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>' + u.phone + '</div>' : '') +
      '<div class="flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>Active Tasks: ' + (u.active_tasks || 0) + ' / Total: ' + (u.total_tasks || 0) + '</div></div>';
    if (isAdmin) {
      html += '<div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">' +
        '<button onclick="showEditStaffModal(' + u.id + ')" class="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100">Edit</button>' +
        '<button onclick="toggleStaffActive(' + u.id + ',' + (u.is_active ? 0 : 1) + ')" class="flex-1 px-3 py-2 ' + (u.is_active ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600') + ' rounded-lg text-sm font-medium">' + (u.is_active ? 'Deactivate' : 'Activate') + '</button></div>';
    }
    html += '</div>';
  });
  html += '</div>';

  return html;
}

// ==================== ACTIVITY LOG ====================
function renderActivity() {
  let html = '<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div class="overflow-x-auto"><table class="w-full"><thead class="bg-gray-50"><tr>' +
    '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>' +
    '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>' +
    '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>' +
    '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>' +
    '</tr></thead><tbody class="divide-y divide-gray-100">';
  if (S.activity.length === 0) {
    html += '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-400">No activity</td></tr>';
  }
  S.activity.forEach(function(a) {
    html += '<tr class="hover:bg-gray-50"><td class="px-4 py-3 text-sm text-gray-500">' + fmtDate(a.created_at) + '</td>' +
      '<td class="px-4 py-3 text-sm font-medium text-gray-700">' + a.full_name + '</td>' +
      '<td class="px-4 py-3"><span class="badge bg-indigo-100 text-indigo-700">' + a.action + '</span></td>' +
      '<td class="px-4 py-3 text-sm text-gray-500">' + escHtml(a.details || '') + '</td></tr>';
  });
  html += '</tbody></table></div></div>';
  return html;
}

// ==================== MODALS ====================
function showTaskModal() {
  const staffList = S.users.filter(function(u) { return u.role === 'staff' && u.is_active; });
  const catOptions = S.categories.map(function(c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
  const staffChecks = staffList.map(function(u) {
    return '<label class="flex items-center gap-2"><input type="checkbox" name="assignees" value="' + u.id + '" class="rounded text-indigo-600"> ' + u.full_name + '</label>';
  }).join('');

  const m = document.createElement('div');
  m.className = 'modal-overlay';
  m.id = 'task-modal';
  m.innerHTML = '<div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">' +
    '<div class="flex justify-between items-center mb-6"><h2 class="text-xl font-bold text-gray-800">New Task</h2><button onclick="closeModal(\\'task-modal\\')" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>' +
    '<div class="space-y-4">' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Title *</label><input id="task-title" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea id="task-desc" rows="3" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"></textarea></div>' +
    '<div class="grid grid-cols-2 gap-4">' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Category *</label><select id="task-category" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg">' + catOptions + '</select></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Priority</label><select id="task-priority" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div></div>' +
    '<div class="grid grid-cols-2 gap-4">' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Deadline</label><input id="task-deadline" type="date" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Reminder</label><input id="task-reminder" type="datetime-local" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-2">Assign To</label><div class="space-y-2 max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg">' + staffChecks + '</div></div>' +
    '<button onclick="createTask()" class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700">Create Task</button></div></div>';
  document.body.appendChild(m);
}

async function createTask() {
  const checkboxes = document.querySelectorAll('input[name="assignees"]:checked');
  const ids = Array.from(checkboxes).map(function(cb) { return Number(cb.value); });

  const body = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-desc').value,
    category_id: Number(document.getElementById('task-category').value),
    priority: document.getElementById('task-priority').value,
    deadline: document.getElementById('task-deadline').value || null,
    reminder_at: document.getElementById('task-reminder').value || null,
    assignee_ids: ids,
  };

  if (!body.title) { toast('Title is required', 'error'); return; }
  const res = await api('/tasks', { method: 'POST', body: body });
  if (res && res.id) {
    toast('Task created!');
    closeModal('task-modal');
    loadTasks();
  } else {
    toast((res && res.error) || 'Failed to create task', 'error');
  }
}

function showEditTaskModal(taskId) {
  const t = S.taskDetail.task;
  const assignees = S.taskDetail.assignees || [];
  const assignedIds = assignees.map(function(a) { return a.user_id; });
  const staffList = S.users.filter(function(u) { return u.role === 'staff'; });

  if (staffList.length === 0) {
    loadUsers().then(function() { _showEditForm(t, assignedIds); });
  } else {
    _showEditForm(t, assignedIds);
  }
}

function _showEditForm(t, assignedIds) {
  const staffList = S.users.filter(function(u) { return u.role === 'staff'; });
  const catOptions = S.categories.map(function(c) { return '<option value="' + c.id + '" ' + (c.id === t.category_id ? 'selected' : '') + '>' + c.name + '</option>'; }).join('');
  const staffChecks = staffList.map(function(u) {
    return '<label class="flex items-center gap-2"><input type="checkbox" name="edit-assignees" value="' + u.id + '" ' + (assignedIds.includes(u.id) ? 'checked' : '') + ' class="rounded text-indigo-600"> ' + u.full_name + '</label>';
  }).join('');

  const pOpts = ['low','medium','high','urgent'].map(function(p) { return '<option value="'+p+'" '+(p===t.priority?'selected':'')+'>'+p+'</option>'; }).join('');
  const sOpts = ['pending','in_progress','completed','overdue'].map(function(s) { return '<option value="'+s+'" '+(s===t.status?'selected':'')+'>'+s+'</option>'; }).join('');

  const m = document.createElement('div');
  m.className = 'modal-overlay';
  m.id = 'edit-task-modal';
  m.innerHTML = '<div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">' +
    '<div class="flex justify-between items-center mb-6"><h2 class="text-xl font-bold text-gray-800">Edit Task</h2><button onclick="closeModal(\\'edit-task-modal\\')" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>' +
    '<div class="space-y-4">' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Title *</label><input id="edit-title" value="' + escAttr(t.title) + '" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea id="edit-desc" rows="3" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg">' + escHtml(t.description || '') + '</textarea></div>' +
    '<div class="grid grid-cols-2 gap-4">' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Category</label><select id="edit-category" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg">' + catOptions + '</select></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Priority</label><select id="edit-priority" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg">' + pOpts + '</select></div></div>' +
    '<div class="grid grid-cols-2 gap-4">' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Status</label><select id="edit-status" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg">' + sOpts + '</select></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Deadline</label><input id="edit-deadline" type="date" value="' + (t.deadline ? t.deadline.split('T')[0] : '') + '" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-2">Assign To</label><div class="space-y-2 max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg">' + staffChecks + '</div></div>' +
    '<button onclick="saveTask(' + t.id + ')" class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700">Save Changes</button></div></div>';
  document.body.appendChild(m);
}

async function saveTask(id) {
  const checkboxes = document.querySelectorAll('input[name="edit-assignees"]:checked');
  const ids = Array.from(checkboxes).map(function(cb) { return Number(cb.value); });
  const body = {
    title: document.getElementById('edit-title').value,
    description: document.getElementById('edit-desc').value,
    category_id: Number(document.getElementById('edit-category').value),
    priority: document.getElementById('edit-priority').value,
    status: document.getElementById('edit-status').value,
    deadline: document.getElementById('edit-deadline').value || null,
    assignee_ids: ids,
  };
  const res = await api('/tasks/' + id, { method: 'PUT', body: body });
  if (res && res.message) {
    toast('Task updated!');
    closeModal('edit-task-modal');
    loadTaskDetail(id);
  } else { toast('Update failed', 'error'); }
}

async function deleteTask(id) {
  if (!confirm('Delete this task? This cannot be undone.')) return;
  const res = await api('/tasks/' + id, { method: 'DELETE' });
  if (res && res.message) { toast('Task deleted'); S.taskDetail = null; nav('tasks'); }
  else { toast('Delete failed', 'error'); }
}

// Staff Modal
function showStaffModal() {
  const m = document.createElement('div');
  m.className = 'modal-overlay';
  m.id = 'staff-modal';
  m.innerHTML = '<div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">' +
    '<div class="flex justify-between items-center mb-6"><h2 class="text-xl font-bold text-gray-800">Add Staff</h2><button onclick="closeModal(\\'staff-modal\\')" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>' +
    '<div class="space-y-4">' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label><input id="staff-name" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Username *</label><input id="staff-username" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Password *</label><input id="staff-password" type="password" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Email *</label><input id="staff-email" type="email" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Phone</label><input id="staff-phone" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div>' +
    '<button onclick="createStaff()" class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700">Add Staff</button></div></div>';
  document.body.appendChild(m);
}

async function createStaff() {
  const body = {
    full_name: document.getElementById('staff-name').value,
    username: document.getElementById('staff-username').value,
    password: document.getElementById('staff-password').value,
    email: document.getElementById('staff-email').value,
    phone: document.getElementById('staff-phone').value,
    role: 'staff'
  };
  if (!body.full_name || !body.username || !body.password || !body.email) { toast('Fill all required fields', 'error'); return; }
  const res = await api('/users', { method: 'POST', body: body });
  if (res && res.id) { toast('Staff added!'); closeModal('staff-modal'); loadUsers(); }
  else { toast((res && res.error) || 'Failed', 'error'); }
}

function showEditStaffModal(id) {
  const u = S.users.find(function(x) { return x.id === id; });
  if (!u) return;
  const m = document.createElement('div');
  m.className = 'modal-overlay';
  m.id = 'edit-staff-modal';
  m.innerHTML = '<div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">' +
    '<div class="flex justify-between items-center mb-6"><h2 class="text-xl font-bold text-gray-800">Edit Staff</h2><button onclick="closeModal(\\'edit-staff-modal\\')" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>' +
    '<div class="space-y-4">' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input id="es-name" value="' + escAttr(u.full_name) + '" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Email</label><input id="es-email" value="' + escAttr(u.email) + '" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Phone</label><input id="es-phone" value="' + escAttr(u.phone || '') + '" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep)</label><input id="es-password" type="password" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg"></div>' +
    '<button onclick="saveStaff(' + u.id + ')" class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700">Save Changes</button></div></div>';
  document.body.appendChild(m);
}

async function saveStaff(id) {
  const body = {
    full_name: document.getElementById('es-name').value,
    email: document.getElementById('es-email').value,
    phone: document.getElementById('es-phone').value,
  };
  const pw = document.getElementById('es-password').value;
  if (pw) body.password = pw;
  const u = S.users.find(function(x) { return x.id === id; });
  body.is_active = u ? u.is_active : 1;
  const res = await api('/users/' + id, { method: 'PUT', body: body });
  if (res && res.message) { toast('Staff updated!'); closeModal('edit-staff-modal'); loadUsers(); }
  else { toast('Update failed', 'error'); }
}

async function toggleStaffActive(id, active) {
  const u = S.users.find(function(x) { return x.id === id; });
  if (!u) return;
  const res = await api('/users/' + id, { method: 'PUT', body: { full_name: u.full_name, email: u.email, phone: u.phone, is_active: active } });
  if (res && res.message) { toast(active ? 'Staff activated' : 'Staff deactivated'); loadUsers(); }
}

// Assignment
async function updateAssignment(taskId, userId, status) {
  const res = await api('/tasks/' + taskId + '/assignments/' + userId, { method: 'PUT', body: { status: status } });
  if (res && res.message) { toast('Status updated!'); loadTaskDetail(taskId); }
  else { toast('Update failed', 'error'); }
}

function promptNote(taskId, userId) {
  const note = prompt('Enter a note for this assignment:');
  if (note !== null) {
    const a = (S.taskDetail.assignees || []).find(function(x) { return x.user_id === userId; });
    api('/tasks/' + taskId + '/assignments/' + userId, { method: 'PUT', body: { status: a ? a.status : 'pending', notes: note } })
      .then(function() { toast('Note added'); loadTaskDetail(taskId); });
  }
}

// File upload
async function uploadFile(taskId) {
  const input = document.getElementById('file-input');
  if (!input.files || !input.files[0]) { toast('Select a file', 'error'); return; }
  const fd = new FormData();
  fd.append('file', input.files[0]);
  const res = await api('/tasks/' + taskId + '/attachments', { method: 'POST', body: fd });
  if (res && res.id) { toast('File uploaded!'); loadTaskDetail(taskId); }
  else { toast('Upload failed', 'error'); }
}

async function deleteAttachment(attId, taskId) {
  if (!confirm('Delete this attachment?')) return;
  const res = await api('/attachments/' + attId, { method: 'DELETE' });
  if (res && res.message) { toast('Deleted'); loadTaskDetail(taskId); }
}

// Filters
function applyFilters() {
  const parts = [];
  const s = document.getElementById('filter-status');
  const c = document.getElementById('filter-category');
  const p = document.getElementById('filter-priority');
  if (s && s.value) parts.push('status=' + s.value);
  if (c && c.value) parts.push('category_id=' + c.value);
  if (p && p.value) parts.push('priority=' + p.value);
  loadTasks(parts.join('&'));
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ==================== HELPERS ====================
function escHtml(s) { if (!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s) { if (!s) return ''; return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function fmtDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}); } catch(e) { return d; } }
function fmtSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB'; }
function statusColor(s) {
  if (s === 'completed') return 'bg-green-100 text-green-700';
  if (s === 'in_progress') return 'bg-blue-100 text-blue-700';
  if (s === 'overdue') return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-700';
}
function priorityColor(p) {
  if (p === 'urgent') return 'bg-red-100 text-red-700';
  if (p === 'high') return 'bg-orange-100 text-orange-700';
  if (p === 'medium') return 'bg-blue-100 text-blue-700';
  return 'bg-green-100 text-green-700';
}

function attachEvents() {}

// ==================== INIT ====================
async function init() {
  const ok = await checkAuth();
  if (ok) {
    await loadCategories();
    render();
    loadDashboard();
  } else {
    render();
  }
}

init();
</script>
</body>
</html>`;
}
