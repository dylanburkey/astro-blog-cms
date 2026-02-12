import type { APIRoute } from 'astro';
import { hashPassword } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = (locals as any).runtime?.env?.DB;
    
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const email = formData.get('email')?.toString()?.trim()?.toLowerCase();
    const name = formData.get('name')?.toString()?.trim() || null;
    const role = formData.get('role')?.toString() || 'author';
    const password = formData.get('password')?.toString();
    const avatar = formData.get('avatar')?.toString()?.trim() || null;

    // Validation
    if (!email) {
      return new Response(JSON.stringify({ success: false, error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!password || password.length < 8) {
      return new Response(JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate role
    const validRoles = ['admin', 'editor', 'author'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for duplicate email
    const existing = await db.prepare(
      'SELECT id FROM admin_users WHERE email = ?'
    ).bind(email).first();

    if (existing) {
      return new Response(JSON.stringify({ success: false, error: 'A user with this email already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const result = await db.prepare(`
      INSERT INTO admin_users (email, password_hash, name, role, avatar)
      VALUES (?, ?, ?, ?, ?)
    `).bind(email, passwordHash, name, role, avatar).run();

    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: result.meta.last_row_id, email, name, role }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create user error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to create user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
