const API_URL = 'http://localhost:4000/api/v1';

// Generate a random username/email for the load test
const randomId = Math.floor(Math.random() * 100000);
const TEST_USER = {
  username: `loadtest_${randomId}`,
  email: `loadtest_${randomId}@example.com`,
  password: 'Password123',
};

const SAMPLE_CODE = `
#include <iostream>
using namespace std;
int main() {
  int a, b;
  cin >> a >> b;
  cout << a + b << endl;
  return 0;
}
`;

async function runLoadTest() {
  console.log('🚀 Starting Load Test...');
  
  // 1. Authenticate (By Registering a new temporary user)
  console.log(`🔑 Registering temporary user: ${TEST_USER.email}...`);
  let token;
  try {
    const authRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    if (!authRes.ok) throw new Error(`HTTP error! status: ${authRes.status}`);
    const resBody = await authRes.json();
    token = resBody.data.accessToken;
    console.log('✅ Registration successful! Token acquired.');
  } catch (error) {
    console.error('❌ Failed to authenticate:', error.message);
    return;
  }

  // 2. Prepare 1 request to Playground
  console.log(`\n🔥 Testing real Playground execution via Redis...`);
  const startTime = Date.now();
  
  try {
    const res = await fetch(`${API_URL}/run`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        problemId: 'playground',
        language: 'cpp',
        code: SAMPLE_CODE,
        customInput: '5 7\n',
      })
    });
    const resultBody = await res.json();
    console.log(`Response Status: ${res.status}`);
    console.log(`Response Data:`, resultBody);
  } catch (error) {
    console.error(`❌ Request failed: ${error}`);
  }

  const endTime = Date.now();
  console.log(`\n🎉 Execution took ${(endTime - startTime) / 1000} seconds!`);
}

runLoadTest();
