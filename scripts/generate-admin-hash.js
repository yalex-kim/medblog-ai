#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Admin Password Hash Generator
 *
 * Usage:
 *   node scripts/generate-admin-hash.js [password]
 *
 * If no password is provided, uses default 'admin123!'
 *
 * Example:
 *   node scripts/generate-admin-hash.js mySecurePassword123
 */

const bcrypt = require('bcryptjs');

// Get password from command line argument or use default
const password = process.argv[2] || 'admin123!';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }

  console.log('\n=== Admin Password Hash Generator ===\n');
  console.log('Password:', password);
  console.log('Bcrypt Hash (rounds=10):\n');
  console.log(hash);
  console.log('\n');
  console.log('SQL to update admin password:');
  console.log(`UPDATE admins SET password_hash = '${hash}' WHERE username = 'admin';`);
  console.log('\n');

  // Verify it works
  bcrypt.compare(password, hash, (err, result) => {
    console.log('Verification test:', result ? '✅ SUCCESS' : '❌ FAILED');
  });
});
