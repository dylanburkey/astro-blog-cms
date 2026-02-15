import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    // Verify authentication
    const sessionToken = cookies.get('admin_session')?.value;
    if (!sessionToken) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime?.env?.DB;
    if (!DB) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify session
    const session = await DB.prepare(
      'SELECT user_id FROM admin_sessions WHERE token = ? AND expires_at > datetime("now")'
    ).bind(sessionToken).first();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Category ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Move child categories to top level (parent_id = null)
    await DB.prepare(
      'UPDATE blog_categories SET parent_id = NULL WHERE parent_id = ?'
    ).bind(id).run();

    // Remove category from post associations (junction table)
    await DB.prepare(
      'DELETE FROM blog_post_categories WHERE category_id = ?'
    ).bind(id).run();

    // Delete category
    await DB.prepare(
      'DELETE FROM blog_categories WHERE id = ?'
    ).bind(id).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete category',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};