// Type definitions for the CA Staff Manager

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  JWT_SECRET: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  email: string;
  role: 'admin' | 'staff';
  phone: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  category_id: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  deadline: string | null;
  reminder_at: string | null;
  is_open?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  user_id: number;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at: string | null;
  notes: string | null;
  assigned_at: string;
}

export interface Attachment {
  id: number;
  task_id: number;
  filename: string;
  original_name: string;
  content_type: string;
  size: number;
  r2_key: string;
  uploaded_by: number;
  uploaded_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

export interface JWTPayload {
  sub: number;
  username: string;
  role: 'admin' | 'staff';
  full_name: string;
  iat: number;
  exp: number;
}
