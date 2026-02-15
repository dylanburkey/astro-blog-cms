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
    const { name, slug, description } = body;

    if (!name || !slug) {
      return new Response(JSON.stringify({ error: 'Name and slug are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if tag already exists
    const existing = await DB.prepare(
      'SELECT id FROM blog_tags WHERE slug = ?'
    ).bind(slug).first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Tag with this slug already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create tag
    const result = await DB.prepare(
      'INSERT INTO blog_tags (name, slug, description) VALUES (?, ?, ?)'
    ).bind(name, slug, description || null).run();

    return new Response(JSON.stringify({ 
      success: true, 
      id: result.meta.last_row_id 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create tag',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};