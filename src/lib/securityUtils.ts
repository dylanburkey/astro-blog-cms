/**
 * Security utilities for input validation and sanitization
 */

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate transaction hash format
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validate signature format
 */
export function isValidSignature(signature: string): boolean {
  return /^0x[a-fA-F0-9]{130}$/.test(signature);
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize token amount
 */
export function validateTokenAmount(amount: string | number): number {
  const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(parsed) || parsed < 0) {
    throw new Error('Invalid token amount');
  }
  
  // Prevent scientific notation attacks
  if (parsed > Number.MAX_SAFE_INTEGER) {
    throw new Error('Token amount too large');
  }
  
  return parsed;
}

/**
 * Validate nonce format
 */
export function isValidNonce(nonce: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(nonce);
}

/**
 * Check if URL is from allowed domain
 */
export function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  try {
    const urlObj = new URL(url);
    return allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Rate limit key generator
 */
export function getRateLimitKey(prefix: string, identifier: string): string {
  // Sanitize identifier to prevent key injection
  const safe = identifier.replace(/[^a-zA-Z0-9-_]/g, '');
  return `${prefix}-${safe}`.substring(0, 128); // Limit key length
}

/**
 * Validate JWT token format (basic check)
 */
export function isValidJWT(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Check if parts are valid base64
    parts.forEach(part => {
      atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Content Security Policy generator
 */
export function generateCSP(nonce?: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' ${nonce ? `'nonce-${nonce}'` : "'unsafe-inline'"} 'unsafe-eval' https://cdnjs.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://mainnet.base.org https://api.example.ai wss://api.example.ai",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];
  
  return directives.join('; ');
}
