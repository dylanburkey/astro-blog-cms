import type { APIRoute } from 'astro';

export const DELETE: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const db = (locals as any).runtime?.env?.DB;
    
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get current user from session to prevent self-deletion
    const sessionToken = cookies.get('admin_session')?.value;
    if (sessionToken) {
      const currentUser = await db.prepare(`
        SELECT u.id FROM admin_users u
        JOIN admin_sessions s ON u.id = s.user_id
        WHERE s.token = ?
      `).bind(sessionToken).first();

      if (currentUser && currentUser.id === parseInt(id, 10)) {
        return new Response(JSON.stringify({ success: false, error: 'You cannot delete yourself' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Delete user sessions
    await db.prepare(
      'DELETE FROM admin_sessions WHERE user_id = ?'
    ).bind(parseInt(id, 10)).run();

    // Optionally: Set posts author to null or reassign
    // For now, we'll keep posts but remove the author reference
    await db.prepare(
      'UPDATE blog_posts SET author_id = NULL WHERE author_id = ?'
    ).bind(parseInt(id, 10)).run();

    // Delete the user
    await db.prepare(
      'DELETE FROM admin_users WHERE id = ?'
    ).bind(parseInt(id, 10)).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to delete user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
