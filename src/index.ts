// CA Staff & Task Management System - Main Entry Point
import { Hono } from 'hono';
import type { Env } from './types';
import api from './api';
import { getHTML } from './frontend';

const app = new Hono<{ Bindings: Env }>();

// Mount API routes
app.route('/api', api);

// Serve frontend for all non-API routes
app.get('*', (c) => {
  return c.html(getHTML());
});

export default app;
