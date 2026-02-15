import type { APIRoute } from 'astro';
import { ADMIN_SESSION_CONFIG } from '../../../config/admin.config';
import { verifyPassword } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    console.log('Login attempt received');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Handle both FormData and JSON
    let username, password, remember;
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (contentType?.includes('multipart/form-data') || !contentType?.includes('application/json')) {
      console.log('Processing as FormData');
      const formData = await request.formData();
      username = formData.get('username')?.toString();
      password = formData.get('password')?.toString();
      remember = formData.has('remember');
      console.log('FormData parsed:', { username, passwordLength: password?.length, remember });
    } else {
      console.log('Processing as JSON');
      const data = await request.json();
      username = data.username;
      password = data.password;
      remember = data.remember;
      console.log('JSON parsed:', { username, passwordLength: password?.length, remember });
    }
    
    console.log('Login attempt for user:', username);
    
    if (!username || !password) {
      return new Response(JSON.stringify({ 
        error: 'Username and password are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Access database from locals.runtime.env (Cloudflare Workers environment)
    const db = locals.runtime.env.DB;
    console.log('Database available:', !!db);
    
    if (!db) {
      console.error('Database not available in locals.runtime.env');
      return new Response(JSON.stringify({ 
        error: 'Database connection error' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Find user by username or email
    console.log('Querying for user:', username);
    
    // First check if user exists at all
    const allUsers = await db.prepare(`
      SELECT id, username, email, is_active FROM admin_users
    `).all();
    console.log('All users in database:', allUsers.results);
    
    const user = await db.prepare(`
      SELECT * FROM admin_users 
      WHERE (username = ? OR email = ?) 
        AND is_active = 1
    `).bind(username, username).first();
    
    console.log('User found:', !!user);
    if (user) {
      console.log('User details:', { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        password_hash_length: user.password_hash?.length 
      });
    } else {
      // Check if user exists but is inactive
      const inactiveUser = await db.prepare(`
        SELECT * FROM admin_users 
        WHERE (username = ? OR email = ?)
      `).bind(username, username).first();
      
      if (inactiveUser) {
        console.log('User exists but is inactive:', {
          username: inactiveUser.username,
          is_active: inactiveUser.is_active
        });
      } else {
        console.log('User does not exist in database');
      }
    }
    
    if (!user) {
      // Log failed attempt
      await logAuditEvent(db, null, 'login_failed', 'Invalid username', request);
      
      return new Response(JSON.stringify({ 
        error: 'Invalid credentials' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify password using proper hashing
    console.log('About to verify password');
    console.log('Password to verify:', password);
    console.log('Hash from database:', user.password_hash?.substring(0, 20) + '...');
    
    const passwordMatches = await verifyPassword(password, user.password_hash);
    console.log('Password verification result:', passwordMatches);
    
    // Double-check with test endpoint logic
    if (!passwordMatches) {
      console.log('Password failed. Testing with known working combinations...');
      const testPasswords = ['dev123', 'admin123'];
      for (const testPass of testPasswords) {
        const testResult = await verifyPassword(testPass, user.password_hash);
        console.log(`Test password '${testPass}' verifies:`, testResult);
      }
      
      // Log failed attempt
      await logAuditEvent(db, user.id, 'login_failed', 'Invalid password', request);
      
      return new Response(JSON.stringify({ 
        error: 'Invalid credentials' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(
      Date.now() + (remember ? ADMIN_SESSION_CONFIG.rememberMeDuration : ADMIN_SESSION_CONFIG.sessionDuration)
    );
    
    // Store session in database
    // Using existing table structure with 'token' column
    await db.prepare(`
      INSERT INTO admin_sessions (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `).bind(
      user.id,
      sessionToken,
      expiresAt.toISOString()
    ).run();
    
    // Update last login
    await db.prepare(`
      UPDATE admin_users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(user.id).run();
    
    // Log successful login
    await logAuditEvent(db, user.id, 'login_success', 'User logged in', request);
    
    // Set session cookie
    cookies.set(ADMIN_SESSION_CONFIG.cookieName, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      expires: expiresAt
    });
    
    // Also set the old cookie name for backward compatibility
    cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      expires: expiresAt
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      redirect: '/ax7k9m2p5d',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: 'An error occurred during login',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Generate a secure random session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Log audit events
async function logAuditEvent(
  db: any, 
  userId: number | null, 
  action: string, 
  details: string, 
  request: Request
): Promise<void> {
  try {
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    await db.prepare(`
      INSERT INTO admin_audit_log (user_id, action, details, ip_address)
      VALUES (?, ?, ?, ?)
    `).bind(userId, action, details, ipAddress).run();
  } catch (error) {
    console.error('Audit log error:', error);
  }
}