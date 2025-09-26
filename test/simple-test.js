#!/usr/bin/env node

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:8081';
let testResults = [];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Helper function to make HTTP requests
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        let jsonData;
        try {
          jsonData = JSON.parse(responseData);
        } catch (e) {
          jsonData = responseData;
        }
        
        resolve({
          status: res.statusCode,
          data: jsonData,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        data: { error: error.message },
        ok: false
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test case function
function testCase(name, expected, actual) {
  const passed = expected === actual;
  const result = {
    name,
    passed,
    expected,
    actual
  };
  
  testResults.push(result);
  
  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`${status} ${name}`);
  
  if (!passed) {
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual: ${actual}`);
  }
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main testing function
async function runTests() {
  console.log(`${colors.blue}🧪 Starting Jack's Club API Tests${colors.reset}\n`);
  
  // Test 1: Health Check
  console.log(`${colors.yellow}1. Testing Health Check${colors.reset}`);
  const healthResponse = await makeRequest('GET', '/health');
  testCase('Health endpoint status', 200, healthResponse.status);
  testCase('Health response status', 'ok', healthResponse.data.status);
  
  await sleep(500); // Small delay between tests
  
  // Test 2: Create New User
  console.log(`\n${colors.yellow}2. Testing User Creation${colors.reset}`);
  const timestamp = Date.now();
  const newUser = {
    userId: `u_testuser${timestamp}`,
    name: 'API Test User',
    email: 'apitest@example.com',
    initialBalance: 1000,
    currency: 'INR'
  };
  
  const createUserResponse = await makeRequest('POST', '/transactions/users', newUser);
  testCase('Create user status', 201, createUserResponse.status);
  testCase('Create user response status', 'ok', createUserResponse.data.status);
  
  const userId = newUser.userId;
  
  await sleep(500);
  
  // Test 3: Get User Details
  console.log(`\n${colors.yellow}3. Testing Get User Details${colors.reset}`);
  const getUserResponse = await makeRequest('GET', `/transactions/users/${userId}`);
  testCase('Get user status', 200, getUserResponse.status);
  testCase('Get user response status', 'ok', getUserResponse.data.status);
  
  await sleep(500);
  
  // Test 4: Get User Balance
  console.log(`\n${colors.yellow}4. Testing Get User Balance${colors.reset}`);
  const getBalanceResponse = await makeRequest('GET', `/users/${userId}/balance`);
  testCase('Get balance status', 200, getBalanceResponse.status);
  testCase('Get balance response status', 'ok', getBalanceResponse.data.status);
  
  await sleep(500);
  
  // Test 5: Credit Transaction
  console.log(`\n${colors.yellow}5. Testing Credit Transaction${colors.reset}`);
  const creditTransaction = {
    idempotentKey: `testcredit${timestamp}`,
    userId: userId,
    amount: 500,
    type: 'credit'
  };
  
  const creditResponse = await makeRequest('POST', '/transactions/transact', creditTransaction);
  testCase('Credit transaction status', 200, creditResponse.status);
  testCase('Credit response status', 'ok', creditResponse.data.status);
  
  await sleep(500);
  
  // Test 6: Debit Transaction
  console.log(`\n${colors.yellow}6. Testing Debit Transaction${colors.reset}`);
  const debitTransaction = {
    idempotentKey: `testdebit${timestamp}`,
    userId: userId,
    amount: 200,
    type: 'debit'
  };
  
  const debitResponse = await makeRequest('POST', '/transactions/transact', debitTransaction);
  testCase('Debit transaction status', 200, debitResponse.status);
  testCase('Debit response status', 'ok', debitResponse.data.status);
  
  await sleep(500);
  
  // Test 7: Get Transaction History
  console.log(`\n${colors.yellow}7. Testing Transaction History${colors.reset}`);
  const historyResponse = await makeRequest('GET', `/transactions/users/${userId}/transactions?limit=5`);
  testCase('Transaction history status', 200, historyResponse.status);
  testCase('Transaction history response status', 'ok', historyResponse.data.status);
  
  await sleep(500);
  
  // Test 8: Error Cases
  console.log(`\n${colors.yellow}8. Testing Error Cases${colors.reset}`);
  
  // Invalid user ID format
  const invalidUserTransaction = {
    idempotentKey: `testinvalid${timestamp}`,
    userId: 'invalid_user',
    amount: 100,
    type: 'credit'
  };
  const invalidUserResponse = await makeRequest('POST', '/transactions/transact', invalidUserTransaction);
  testCase('Invalid user ID gives error', true, invalidUserResponse.status === 400);
  
  await sleep(500);
  
  // Duplicate user creation
  const duplicateUserResponse = await makeRequest('POST', '/transactions/users', newUser);
  testCase('Duplicate user gives error', true, duplicateUserResponse.status === 409);
  
  // Print Summary
  console.log(`\n${colors.blue}📊 Test Results Summary${colors.reset}`);
  const totalTests = testResults.length;
  const passedTests = testResults.filter(t => t.passed).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    testResults.filter(t => !t.passed).forEach(test => {
      console.log(`- ${test.name}`);
    });
  } else {
    console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}`);
  }
  
  return failedTests === 0;
}

// Check if server is running
async function checkServer() {
  console.log('Checking if server is running...');
  const healthCheck = await makeRequest('GET', '/health');
  
  if (!healthCheck.ok) {
    console.log(`${colors.red}❌ Server is not running on ${BASE_URL}${colors.reset}`);
    console.log('Please start the server with: npm run dev');
    process.exit(1);
  }
  
  console.log(`${colors.green}✅ Server is running${colors.reset}\n`);
}

// Main execution
async function main() {
  await checkServer();
  const success = await runTests();
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error(`${colors.red}❌ Test execution failed:${colors.reset}`, error.message);
  process.exit(1);
});
