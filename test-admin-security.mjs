import { authorizeAdmin } from './lib/auth-admin.ts';
import { NextResponse } from 'next/server';

const runSecurityTest = async () => {
  console.log('Running TEST 8 — Admin Security Verification');
  
  // 1. Verify that authorizeAdmin() correctly blocks when no Clerk context is present.
  const result = await authorizeAdmin();
  
  // authorizeAdmin returns { authorized: false, error: NextResponse }
  // We need to inspect the status of the returned NextResponse.
  if (result.authorized === false && result.error && result.error.status === 401) {
    console.log('PASS: Unauthorized access correctly rejected with 401.');
  } else {
    console.error('FAIL: Unauthorized access check failed.', result);
    process.exit(1);
  }
};

runSecurityTest().catch(console.error);
