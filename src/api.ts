// API Routes for CA Staff Manager
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { hashPassword, verifyPassword, createToken, verifyToken } from './auth';

type Variables = {
  user: { sub: number; username: string; role: 'admin' | 'staff'; full_name: string };
};

const api = new Hono<{ Bindings: Env; Variables: Variables }>();

api.use('*', cors());

// Auth middleware
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.slice(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  c.set('user', { sub: payload.sub, username: payload.username, role: payload.role, full_name: payload.full_name });
  await next();
}

// Admin-only middleware
function adminOnly(c: any, next: any) {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }
  return next();
}

// Helper: log activity
async function logActivity(db: D1Database, userId: number, action: string, entityType: string, entityId: number | null, details: string | null) {
  await db.prepare(
    'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, action, entityType, entityId, details).run();
}

// ============ AUTH ROUTES ============

api.post('/auth/login', async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) {
    return c.json({ error: 'Username and password required' }, 400);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1')
    .bind(username).first();

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash as string);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = await createToken(user as any, c.env.JWT_SECRET);
  await logActivity(c.env.DB, user.id as number, 'login', 'user', user.id as number, 'User logged in');

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    }
  });
});

api.get('/auth/me', authMiddleware, async (c) => {
  const currentUser = c.get('user');
  const user = await c.env.DB.prepare('SELECT id, username, full_name, email, role, phone, is_active, created_at FROM users WHERE id = ?')
    .bind(currentUser.sub).first();
  return c.json({ user });
});

// ============ DASHBOARD ============

api.get('/dashboard/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  let stats: any = {};

  if (user.role === 'admin') {
    const total = await c.env.DB.prepare('SELECT COUNT(*) as count FROM tasks').first();
    const pending = await c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'").first();
    const inProgress = await c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'").first();
    const completed = await c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").first();
    const overdue = await c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'overdue' OR (deadline < datetime('now') AND status NOT IN ('completed'))").first();
    const staffCount = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'staff'").first();

    const recentTasks = await c.env.DB.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t JOIN categories c ON t.category_id = c.id
      ORDER BY t.created_at DESC LIMIT 5
    `).all();

    const tasksByCategory = await c.env.DB.prepare(`
      SELECT c.name, c.color, COUNT(t.id) as count
      FROM categories c LEFT JOIN tasks t ON c.id = t.category_id
      GROUP BY c.id ORDER BY count DESC
    `).all();

    const tasksByStaff = await c.env.DB.prepare(`
      SELECT u.full_name, COUNT(ta.id) as total,
        SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM users u LEFT JOIN task_assignments ta ON u.id = ta.user_id
      WHERE u.role = 'staff'
      GROUP BY u.id
    `).all();

    stats = {
      total: (total as any)?.count || 0,
      pending: (pending as any)?.count || 0,
      in_progress: (inProgress as any)?.count || 0,
      completed: (completed as any)?.count || 0,
      overdue: (overdue as any)?.count || 0,
      staff_count: (staffCount as any)?.count || 0,
      recent_tasks: recentTasks.results,
      tasks_by_category: tasksByCategory.results,
      tasks_by_staff: tasksByStaff.results,
    };
  } else {
    const myTotal = await c.env.DB.prepare('SELECT COUNT(*) as count FROM task_assignments WHERE user_id = ?').bind(user.sub).first();
    const myPending = await c.env.DB.prepare("SELECT COUNT(*) as count FROM task_assignments WHERE user_id = ? AND status = 'pending'").bind(user.sub).first();
    const myInProgress = await c.env.DB.prepare("SELECT COUNT(*) as count FROM task_assignments WHERE user_id = ? AND status = 'in_progress'").bind(user.sub).first();
    const myCompleted = await c.env.DB.prepare("SELECT COUNT(*) as count FROM task_assignments WHERE user_id = ? AND status = 'completed'").bind(user.sub).first();

    const myRecentTasks = await c.env.DB.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, ta.status as my_status
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      JOIN categories c ON t.category_id = c.id
      WHERE ta.user_id = ?
      ORDER BY t.created_at DESC LIMIT 5
    `).bind(user.sub).all();

    stats = {
      total: (myTotal as any)?.count || 0,
      pending: (myPending as any)?.count || 0,
      in_progress: (myInProgress as any)?.count || 0,
      completed: (myCompleted as any)?.count || 0,
      recent_tasks: myRecentTasks.results,
    };
  }

  return c.json(stats);
});

// ============ CATEGORIES ============

api.get('/categories', authMiddleware, async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM categories ORDER BY name').all();
  return c.json({ categories: result.results });
});

// ============ TASKS ============

api.get('/tasks', authMiddleware, async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const categoryId = c.req.query('category_id');
  const priority = c.req.query('priority');
  const assignedTo = c.req.query('assigned_to');

  let query = `
    SELECT t.*, c.name as category_name, c.color as category_color,
      u.full_name as creator_name
    FROM tasks t
    JOIN categories c ON t.category_id = c.id
    JOIN users u ON t.created_by = u.id
  `;
  const conditions: string[] = [];
  const params: any[] = [];

  if (user.role === 'staff') {
    query = `
      SELECT t.*, c.name as category_name, c.color as category_color,
        u.full_name as creator_name, ta.status as my_status, ta.notes as my_notes
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      JOIN categories c ON t.category_id = c.id
      JOIN users u ON t.created_by = u.id
    `;
    conditions.push('ta.user_id = ?');
    params.push(user.sub);
  }

  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (categoryId) { conditions.push('t.category_id = ?'); params.push(Number(categoryId)); }
  if (priority) { conditions.push('t.priority = ?'); params.push(priority); }
  if (assignedTo && user.role === 'admin') {
    query += ' JOIN task_assignments ta2 ON t.id = ta2.task_id';
    conditions.push('ta2.user_id = ?');
    params.push(Number(assignedTo));
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY t.created_at DESC';

  const stmt = c.env.DB.prepare(query);
  const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

  // Get assignees for each task
  const tasks = result.results;
  for (const task of tasks as any[]) {
    const assignees = await c.env.DB.prepare(`
      SELECT ta.*, u.full_name, u.username
      FROM task_assignments ta JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = ?
    `).bind(task.id).all();
    task.assignees = assignees.results;
  }

  return c.json({ tasks });
});

api.post('/tasks', authMiddleware, adminOnly, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { title, description, category_id, priority, deadline, reminder_at, assignee_ids } = body;

  if (!title || !category_id) {
    return c.json({ error: 'Title and category are required' }, 400);
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO tasks (title, description, category_id, priority, deadline, reminder_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(title, description || null, category_id, priority || 'medium', deadline || null, reminder_at || null, user.sub).run();

  const taskId = result.meta.last_row_id;

  // Assign to staff
  if (assignee_ids && assignee_ids.length > 0) {
    for (const userId of assignee_ids) {
      await c.env.DB.prepare(
        'INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)'
      ).bind(taskId, userId).run();
    }
  }

  await logActivity(c.env.DB, user.sub, 'created', 'task', taskId as number, `Created task: ${title}`);

  return c.json({ id: taskId, message: 'Task created successfully' }, 201);
});

api.get('/tasks/:id', authMiddleware, async (c) => {
  const taskId = Number(c.req.param('id'));

  const task = await c.env.DB.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color, u.full_name as creator_name
    FROM tasks t
    JOIN categories c ON t.category_id = c.id
    JOIN users u ON t.created_by = u.id
    WHERE t.id = ?
  `).bind(taskId).first();

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const assignees = await c.env.DB.prepare(`
    SELECT ta.*, u.full_name, u.username, u.email
    FROM task_assignments ta JOIN users u ON ta.user_id = u.id
    WHERE ta.task_id = ?
  `).bind(taskId).all();

  const attachments = await c.env.DB.prepare(`
    SELECT a.*, u.full_name as uploader_name
    FROM attachments a JOIN users u ON a.uploaded_by = u.id
    WHERE a.task_id = ?
    ORDER BY a.uploaded_at DESC
  `).bind(taskId).all();

  const activity = await c.env.DB.prepare(`
    SELECT al.*, u.full_name
    FROM activity_log al JOIN users u ON al.user_id = u.id
    WHERE al.entity_type = 'task' AND al.entity_id = ?
    ORDER BY al.created_at DESC LIMIT 20
  `).bind(taskId).all();

  return c.json({
    task,
    assignees: assignees.results,
    attachments: attachments.results,
    activity: activity.results,
  });
});

api.put('/tasks/:id', authMiddleware, adminOnly, async (c) => {
  const user = c.get('user');
  const taskId = Number(c.req.param('id'));
  const body = await c.req.json();
  const { title, description, category_id, priority, status, deadline, reminder_at, assignee_ids } = body;

  await c.env.DB.prepare(`
    UPDATE tasks SET title = ?, description = ?, category_id = ?, priority = ?, status = ?,
    deadline = ?, reminder_at = ?, updated_at = datetime('now') WHERE id = ?
  `).bind(title, description || null, category_id, priority, status, deadline || null, reminder_at || null, taskId).run();

  // Update assignees if provided
  if (assignee_ids !== undefined) {
    await c.env.DB.prepare('DELETE FROM task_assignments WHERE task_id = ?').bind(taskId).run();
    for (const userId of assignee_ids) {
      await c.env.DB.prepare(
        'INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)'
      ).bind(taskId, userId).run();
    }
  }

  await logActivity(c.env.DB, user.sub, 'updated', 'task', taskId, `Updated task: ${title}`);

  return c.json({ message: 'Task updated' });
});

api.delete('/tasks/:id', authMiddleware, adminOnly, async (c) => {
  const user = c.get('user');
  const taskId = Number(c.req.param('id'));

  // Delete R2 attachments
  const attachments = await c.env.DB.prepare('SELECT r2_key FROM attachments WHERE task_id = ?').bind(taskId).all();
  for (const att of attachments.results as any[]) {
    try { await c.env.R2.delete(att.r2_key); } catch {}
  }

  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();
  await logActivity(c.env.DB, user.sub, 'deleted', 'task', taskId, 'Deleted task');

  return c.json({ message: 'Task deleted' });
});

// ============ TASK ASSIGNMENTS ============

api.put('/tasks/:id/assignments/:userId', authMiddleware, async (c) => {
  const currentUser = c.get('user');
  const taskId = Number(c.req.param('id'));
  const userId = Number(c.req.param('userId'));

  // Staff can only update their own assignment
  if (currentUser.role === 'staff' && currentUser.sub !== userId) {
    return c.json({ error: 'Can only update your own assignment' }, 403);
  }

  const body = await c.req.json();
  const { status, notes } = body;

  const completedAt = status === 'completed' ? "datetime('now')" : null;

  if (status === 'completed') {
    await c.env.DB.prepare(`
      UPDATE task_assignments SET status = ?, notes = ?, completed_at = datetime('now') WHERE task_id = ? AND user_id = ?
    `).bind(status, notes || null, taskId, userId).run();
  } else {
    await c.env.DB.prepare(`
      UPDATE task_assignments SET status = ?, notes = ?, completed_at = NULL WHERE task_id = ? AND user_id = ?
    `).bind(status, notes || null, taskId, userId).run();
  }

  // Check if all assignments are completed → update task status
  const pending = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM task_assignments WHERE task_id = ? AND status != 'completed'"
  ).bind(taskId).first();

  if ((pending as any)?.count === 0) {
    await c.env.DB.prepare("UPDATE tasks SET status = 'completed', updated_at = datetime('now') WHERE id = ?").bind(taskId).run();
  } else if (status === 'in_progress') {
    await c.env.DB.prepare("UPDATE tasks SET status = 'in_progress', updated_at = datetime('now') WHERE id = ? AND status = 'pending'").bind(taskId).run();
  }

  const assignee = await c.env.DB.prepare('SELECT full_name FROM users WHERE id = ?').bind(userId).first();
  await logActivity(c.env.DB, currentUser.sub, `assignment_${status}`, 'task', taskId, `${(assignee as any)?.full_name} marked as ${status}`);

  return c.json({ message: 'Assignment updated' });
});

// ============ FILE ATTACHMENTS ============

api.post('/tasks/:id/attachments', authMiddleware, async (c) => {
  const user = c.get('user');
  const taskId = Number(c.req.param('id'));

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const filename = `${taskId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const r2Key = `attachments/${filename}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2.put(r2Key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    // Record in DB
    const result = await c.env.DB.prepare(
      'INSERT INTO attachments (task_id, filename, original_name, content_type, size, r2_key, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(taskId, filename, file.name, file.type, file.size, r2Key, user.sub).run();

    await logActivity(c.env.DB, user.sub, 'uploaded_file', 'task', taskId, `Uploaded: ${file.name}`);

    return c.json({ id: result.meta.last_row_id, message: 'File uploaded' }, 201);
  } catch (err: any) {
    return c.json({ error: 'Upload failed: ' + err.message }, 500);
  }
});

api.get('/attachments/:id/download', authMiddleware, async (c) => {
  const attId = Number(c.req.param('id'));
  const attachment = await c.env.DB.prepare('SELECT * FROM attachments WHERE id = ?').bind(attId).first();

  if (!attachment) {
    return c.json({ error: 'Attachment not found' }, 404);
  }

  const obj = await c.env.R2.get(attachment.r2_key as string);
  if (!obj) {
    return c.json({ error: 'File not found in storage' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', attachment.content_type as string);
  headers.set('Content-Disposition', `attachment; filename="${attachment.original_name}"`);

  return new Response(obj.body, { headers });
});

api.delete('/attachments/:id', authMiddleware, adminOnly, async (c) => {
  const user = c.get('user');
  const attId = Number(c.req.param('id'));
  const attachment = await c.env.DB.prepare('SELECT * FROM attachments WHERE id = ?').bind(attId).first();

  if (!attachment) {
    return c.json({ error: 'Attachment not found' }, 404);
  }

  try { await c.env.R2.delete(attachment.r2_key as string); } catch {}
  await c.env.DB.prepare('DELETE FROM attachments WHERE id = ?').bind(attId).run();
  await logActivity(c.env.DB, user.sub, 'deleted_file', 'task', attachment.task_id as number, `Deleted: ${attachment.original_name}`);

  return c.json({ message: 'Attachment deleted' });
});

// ============ USERS/STAFF ============

api.get('/users', authMiddleware, async (c) => {
  const user = c.get('user');
  let query = 'SELECT id, username, full_name, email, role, phone, is_active, created_at FROM users';

  if (user.role === 'staff') {
    query += " WHERE role = 'staff' AND is_active = 1";
  }
  query += ' ORDER BY full_name';

  const result = await c.env.DB.prepare(query).all();

  // Add task counts for each user
  const users = result.results;
  for (const u of users as any[]) {
    const taskCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status != 'completed' THEN 1 ELSE 0 END) as active FROM task_assignments WHERE user_id = ?"
    ).bind(u.id).first();
    u.total_tasks = (taskCount as any)?.total || 0;
    u.active_tasks = (taskCount as any)?.active || 0;
  }

  return c.json({ users });
});

api.post('/users', authMiddleware, adminOnly, async (c) => {
  const currentUser = c.get('user');
  const body = await c.req.json();
  const { username, password, full_name, email, phone, role } = body;

  if (!username || !password || !full_name || !email) {
    return c.json({ error: 'Username, password, full name, and email are required' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) {
    return c.json({ error: 'Username already exists' }, 400);
  }

  const passwordHash = await hashPassword(password);
  const result = await c.env.DB.prepare(
    'INSERT INTO users (username, password_hash, full_name, email, role, phone) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(username, passwordHash, full_name, email, role || 'staff', phone || null).run();

  await logActivity(c.env.DB, currentUser.sub, 'created', 'user', result.meta.last_row_id as number, `Created user: ${full_name}`);

  return c.json({ id: result.meta.last_row_id, message: 'User created' }, 201);
});

api.put('/users/:id', authMiddleware, adminOnly, async (c) => {
  const currentUser = c.get('user');
  const userId = Number(c.req.param('id'));
  const body = await c.req.json();
  const { full_name, email, phone, is_active, password } = body;

  if (password) {
    const passwordHash = await hashPassword(password);
    await c.env.DB.prepare(
      "UPDATE users SET full_name = ?, email = ?, phone = ?, is_active = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(full_name, email, phone || null, is_active !== undefined ? is_active : 1, passwordHash, userId).run();
  } else {
    await c.env.DB.prepare(
      "UPDATE users SET full_name = ?, email = ?, phone = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(full_name, email, phone || null, is_active !== undefined ? is_active : 1, userId).run();
  }

  await logActivity(c.env.DB, currentUser.sub, 'updated', 'user', userId, `Updated user: ${full_name}`);

  return c.json({ message: 'User updated' });
});

// ============ ACTIVITY LOG ============

api.get('/activity', authMiddleware, async (c) => {
  const user = c.get('user');
  let query: string;
  let params: any[] = [];

  if (user.role === 'admin') {
    query = `
      SELECT al.*, u.full_name
      FROM activity_log al JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT 100
    `;
  } else {
    query = `
      SELECT al.*, u.full_name
      FROM activity_log al JOIN users u ON al.user_id = u.id
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC LIMIT 50
    `;
    params = [user.sub];
  }

  const stmt = c.env.DB.prepare(query);
  const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
  return c.json({ activity: result.results });
});

api.get('/users/:id/activity', authMiddleware, async (c) => {
  const userId = Number(c.req.param('id'));
  const result = await c.env.DB.prepare(`
    SELECT al.*, u.full_name
    FROM activity_log al JOIN users u ON al.user_id = u.id
    WHERE al.user_id = ?
    ORDER BY al.created_at DESC LIMIT 50
  `).bind(userId).all();
  return c.json({ activity: result.results });
});

export default api;
