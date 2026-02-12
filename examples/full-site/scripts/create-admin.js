#!/usr/bin/env node

/**
 * Create Admin User Script
 * 
 * Generates a password hash and outputs the wrangler command
 * to insert an admin user into your D1 database.
 * 
 * Usage:
 *   node scripts/create-admin.js
 *   node scripts/create-admin.js mypassword
 *   node scripts/create-admin.js mypassword admin@example.com "John Doe"
 */

const args = process.argv.slice(2);
const password = args[0] || 'changeme123';
const email = args[1] || 'admin@example.com';
const name = args[2] || 'Admin';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(hash);
  const saltAndHash = new Uint8Array(salt.length + hashArray.length);
  saltAndHash.set(salt);
  saltAndHash.set(hashArray, salt.length);
  
  return btoa(String.fromCharCode(...saltAndHash));
}

async function main() {
  console.log('\n🔐 Astro Blog CMS - Create Admin User\n');
  console.log('━'.repeat(50));
  console.log(`  Email:    ${email}`);
  console.log(`  Name:     ${name}`);
  console.log(`  Password: ${password}`);
  console.log('━'.repeat(50));

  const hash = await hashPassword(password);
  
  console.log('\n📋 Run this command to create the admin user:\n');
  console.log(`wrangler d1 execute my-blog-db --command="INSERT INTO admin_users (email, password_hash, name, role) VALUES ('${email}', '${hash}', '${name}', 'admin')"`);
  console.log('\n💡 Tip: Change "my-blog-db" to your actual database name.\n');
  console.log('⚠️  Make sure you\'ve run the migrations first!');
  console.log('   pnpm run db:migrate\n');
}

main().catch(console.error);
