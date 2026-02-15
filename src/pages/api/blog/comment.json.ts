import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();
    const { postId, name, email, content, parentId } = data;

    // Validate required fields
    if (!postId || !name || !email || !content) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'All fields are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid email format' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Sanitize content (basic XSS protection)
    const sanitizedContent = content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const db = locals.runtime?.env?.DB;
    const adminEmail = import.meta.env.ADMIN_EMAIL_ADDRESS || locals.runtime?.env?.ADMIN_EMAIL_ADDRESS;

    if (db) {
      // Create comments table if it doesn't exist
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS blog_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          parent_id INTEGER,
          author_name TEXT NOT NULL,
          author_email TEXT NOT NULL,
          content TEXT NOT NULL,
          is_approved BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES blog_posts(id),
          FOREIGN KEY (parent_id) REFERENCES blog_comments(id)
        )
      `).run();

      // Insert the comment
      const result = await db.prepare(`
        INSERT INTO blog_comments (post_id, parent_id, author_name, author_email, content)
        VALUES (?, ?, ?, ?, ?)
      `).bind(postId, parentId || null, name, email, sanitizedContent).run();

      // Get post details for admin notification
      const post = await db.prepare(`
        SELECT title, slug FROM blog_posts WHERE id = ?
      `).bind(postId).first();

      // Log for admin notification
      console.log(`New comment on blog post: ${post?.title}`);
      console.log(`Admin notification would be sent to: ${adminEmail}`);
      console.log(`Comment details:`, {
        postTitle: post?.title,
        postUrl: `/blog/${post?.slug}`,
        author: name,
        email: email,
        comment: content
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Comment submitted for moderation'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Blog comment error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to submit comment' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};