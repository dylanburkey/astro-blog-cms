import type { APIRoute } from 'astro';
import { ADMIN_SESSION_CONFIG } from '../../../config/admin.config';

export const POST: APIRoute = async ({ locals, cookies }) => {
  try {
    // Get the session token
    const sessionToken = cookies.get(ADMIN_SESSION_CONFIG.cookieName)?.value || 
                        cookies.get('admin_session')?.value;
    
    // Delete session from database if token exists
    if (sessionToken && locals.runtime?.env?.DB) {
      const db = locals.runtime.env.DB;
      
      // Get user ID before deleting session for audit log
      const session = await db.prepare(`
        SELECT user_id FROM admin_sessions 
        WHERE token = ?
      `).bind(sessionToken).first();
      
      if (session) {
        // Delete the session
        await db.prepare(`
          DELETE FROM admin_sessions 
          WHERE token = ?
        `).bind(sessionToken).run();
        
        // Log the logout
        await logAuditEvent(db, session.user_id, 'logout', 'User logged out');
      }
    }
    
    // Clear cookies
    cookies.delete(ADMIN_SESSION_CONFIG.cookieName, { path: '/' });
    cookies.delete('admin_session', { path: '/' });
    
    return new Response(JSON.stringify({ 
      success: true,
      redirect: '/ax7k9m2p5d/login'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, clear the cookies
    cookies.delete(ADMIN_SESSION_CONFIG.cookieName, { path: '/' });
    cookies.delete('admin_session', { path: '/' });
    
    return new Response(JSON.stringify({ 
      success: true,
      redirect: '/ax7k9m2p5d/login'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Log audit events
async function logAuditEvent(
  db: any, 
  userId: number, 
  action: string, 
  details: string
): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO admin_audit_log (user_id, action, details, ip_address)
      VALUES (?, ?, ?, ?)
    `).bind(userId, action, details, 'unknown').run();
  } catch (error) {
    console.error('Audit log error:', error);
  }
}