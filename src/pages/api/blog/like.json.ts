import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { postId } = await request.json();
    
    if (!postId) {
      return new Response(JSON.stringify({ error: 'Post ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user identifier (could be from session, IP, or browser fingerprint)
    // For now, we'll use a combination of IP and user agent
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-Forwarded-For')?.split(',')[0] || 
                     'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    const userIdentifier = btoa(`${clientIP}-${userAgent}`).substring(0, 50);

    // Check if user has already liked this post
    const existingLike = await db.prepare(`
      SELECT id FROM blog_likes 
      WHERE post_id = ? AND user_identifier = ?
    `).bind(postId, userIdentifier).first();

    if (existingLike) {
      // Unlike the post
      await db.prepare(`
        DELETE FROM blog_likes 
        WHERE post_id = ? AND user_identifier = ?
      `).bind(postId, userIdentifier).run();

      // Update engagement count
      await db.prepare(`
        UPDATE blog_post_engagement 
        SET likes = likes - 1 
        WHERE post_id = ?
      `).bind(postId).run();

      // Get updated count
      const engagement = await db.prepare(`
        SELECT likes FROM blog_post_engagement WHERE post_id = ?
      `).bind(postId).first();

      return new Response(JSON.stringify({ 
        liked: false, 
        likes: engagement?.likes || 0 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Like the post
      await db.prepare(`
        INSERT INTO blog_likes (post_id, user_identifier) 
        VALUES (?, ?)
      `).bind(postId, userIdentifier).run();

      // Update or insert engagement count
      await db.prepare(`
        INSERT INTO blog_post_engagement (post_id, likes, views) 
        VALUES (?, 1, 0)
        ON CONFLICT(post_id) DO UPDATE SET 
        likes = likes + 1
      `).bind(postId).run();

      // Get updated count
      const engagement = await db.prepare(`
        SELECT likes FROM blog_post_engagement WHERE post_id = ?
      `).bind(postId).first();

      return new Response(JSON.stringify({ 
        liked: true, 
        likes: engagement?.likes || 1 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return new Response(JSON.stringify({ error: 'Failed to toggle like' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const postId = url.searchParams.get('postId');
    if (!postId) {
      return new Response(JSON.stringify({ error: 'Post ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get like count
    const engagement = await db.prepare(`
      SELECT likes FROM blog_post_engagement WHERE post_id = ?
    `).bind(postId).first();

    return new Response(JSON.stringify({ 
      likes: engagement?.likes || 0 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting likes:', error);
    return new Response(JSON.stringify({ error: 'Failed to get likes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};