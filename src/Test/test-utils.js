const HotPocket = require('hotpocket-js-client');

async function connectClient(urls = ['wss://localhost:8081'], keyPair = null) {
  const kp = keyPair || await HotPocket.generateKeys();
  const client = await HotPocket.createClient(urls, kp);
  if (!await client.connect()) throw new Error('Connection failed');
  return { client, keyPair: kp };
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || 'assertEqual'}: expected ${expected}, got ${actual}`);
}

function assertSuccessResponse(resp, msg) {
  if (!resp || typeof resp !== 'object' || !('success' in resp)) throw new Error(`${msg || 'assertSuccessResponse'}: not a success response`);
}

function assertErrorResponse(resp, msg) {
  if (!resp || typeof resp !== 'object' || !('error' in resp)) throw new Error(`${msg || 'assertErrorResponse'}: not an error response`);
}

module.exports = { connectClient, assertEqual, assertSuccessResponse, assertErrorResponse };
