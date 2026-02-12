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
    const id = formData.get('id')?.toString();
    const email = formData.get('email')?.toString()?.trim()?.toLowerCase();
    const name = formData.get('name')?.toString()?.trim() || null;
    const role = formData.get('role')?.toString() || 'author';
    const password = formData.get('password')?.toString();
    const avatar = formData.get('avatar')?.toString()?.trim() || null;

    // Validation
    if (!id || !email) {
      return new Response(JSON.stringify({ success: false, error: 'ID and Email are required' }), {
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

    // Check for duplicate email (excluding current user)
    const existing = await db.prepare(
      'SELECT id FROM admin_users WHERE email = ? AND id != ?'
    ).bind(email, parseInt(id, 10)).first();

    if (existing) {
      return new Response(JSON.stringify({ success: false, error: 'A user with this email already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build update query
    if (password && password.length > 0) {
      // Validate password length
      if (password.length < 8) {
        return new Response(JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Update with new password
      const passwordHash = await hashPassword(password);
      await db.prepare(`
        UPDATE admin_users 
        SET email = ?, name = ?, role = ?, password_hash = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(email, name, role, passwordHash, avatar, parseInt(id, 10)).run();
    } else {
      // Update without password change
      await db.prepare(`
        UPDATE admin_users 
        SET email = ?, name = ?, role = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(email, name, role, avatar, parseInt(id, 10)).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update user error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to update user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
