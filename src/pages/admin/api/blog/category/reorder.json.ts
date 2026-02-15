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
    const { categoryId, newParentId, newIndex } = body;

    if (!categoryId) {
      return new Response(JSON.stringify({ error: 'Category ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent setting self as parent
    if (newParentId && parseInt(newParentId) === parseInt(categoryId)) {
      return new Response(JSON.stringify({ error: 'Category cannot be its own parent' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for circular reference (can't move a parent under its own child)
    if (newParentId) {
      let currentParentId = newParentId;
      while (currentParentId) {
        const parent = await DB.prepare(
          'SELECT id, parent_id FROM blog_categories WHERE id = ?'
        ).bind(currentParentId).first();
        
        if (!parent) break;
        if (parseInt(parent.id) === parseInt(categoryId)) {
          return new Response(JSON.stringify({ error: 'Cannot move a category under its own descendant' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        currentParentId = parent.parent_id;
      }
    }

    // Get siblings at the new location
    const siblings = await DB.prepare(
      'SELECT id, sort_order FROM blog_categories WHERE parent_id IS ? AND id != ? ORDER BY sort_order ASC'
    ).bind(newParentId || null, categoryId).all();

    const siblingList = siblings.results || [];
    
    // Calculate new sort orders
    const updates: { id: number; sort_order: number }[] = [];
    let order = 0;
    
    for (let i = 0; i <= siblingList.length; i++) {
      if (i === newIndex) {
        updates.push({ id: parseInt(categoryId), sort_order: order });
        order++;
      }
      if (i < siblingList.length) {
        updates.push({ id: siblingList[i].id, sort_order: order });
        order++;
      }
    }
    
    // If newIndex is beyond the list, add at the end
    if (newIndex >= siblingList.length) {
      const existingUpdate = updates.find(u => u.id === parseInt(categoryId));
      if (!existingUpdate) {
        updates.push({ id: parseInt(categoryId), sort_order: order });
      }
    }

    // Update parent and sort orders in a batch
    await DB.prepare(
      'UPDATE blog_categories SET parent_id = ? WHERE id = ?'
    ).bind(newParentId || null, categoryId).run();

    for (const update of updates) {
      await DB.prepare(
        'UPDATE blog_categories SET sort_order = ? WHERE id = ?'
      ).bind(update.sort_order, update.id).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error reordering category:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to reorder category',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
