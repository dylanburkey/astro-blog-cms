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
    const { id, name, slug, description } = body;

    if (!id || !name || !slug) {
      return new Response(JSON.stringify({ error: 'ID, name and slug are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if another tag has the same slug
    const existing = await DB.prepare(
      'SELECT id FROM blog_tags WHERE slug = ? AND id != ?'
    ).bind(slug, id).first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Another tag with this slug already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update tag
    await DB.prepare(
      'UPDATE blog_tags SET name = ?, slug = ?, description = ? WHERE id = ?'
    ).bind(name, slug, description || null, id).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update tag',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};