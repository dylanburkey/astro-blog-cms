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
    const { id, name, slug, description, parent_id } = body;

    if (!id || !name || !slug) {
      return new Response(JSON.stringify({ error: 'ID, name and slug are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent setting self as parent
    if (parent_id && parseInt(parent_id) === parseInt(id)) {
      return new Response(JSON.stringify({ error: 'Category cannot be its own parent' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if another category has the same slug
    const existing = await DB.prepare(
      'SELECT id FROM blog_categories WHERE slug = ? AND id != ?'
    ).bind(slug, id).first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Another category with this slug already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update category
    await DB.prepare(
      'UPDATE blog_categories SET name = ?, slug = ?, description = ?, parent_id = ? WHERE id = ?'
    ).bind(name, slug, description || null, parent_id || null, id).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update category',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};