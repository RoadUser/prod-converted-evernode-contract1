const HotPocket = require('hotpocket-js-client');
const { connectClient, assertEqual, assertSuccessResponse } = require('../test-utils');

async function run() {
  const { client } = await connectClient(['wss://localhost:8081']);

  // Read current message
  let out = await client.submitContractReadRequest(JSON.stringify({ Service: 'Hello', Action: 'GetMessage' }));
  try { out = JSON.parse(out); } catch (e) { out = {}; }
  assertSuccessResponse(out, 'GetMessage response');
  console.log('Initial message:', out.success.message);

  // Update message
  const newMsg = 'Hello Evernode!';
  await client.submitContractInput(Buffer.from(JSON.stringify({ Service: 'Hello', Action: 'SetMessage', data: { message: newMsg } })));

  // Read back
  let out2 = await client.submitContractReadRequest(JSON.stringify({ Service: 'Hello', Action: 'GetMessage' }));
  try { out2 = JSON.parse(out2); } catch (e) { out2 = {}; }
  assertSuccessResponse(out2, 'GetMessage after SetMessage');
  assertEqual(out2.success.message, newMsg, 'Message should update');

  client.on(HotPocket.events.contractOutput, (result) => {
    // outputs are printed if any async outputs are sent by contract
    result.outputs.forEach(o => console.log('Output:', o.toString()));
  });

  await client.disconnect();
}

module.exports = { run };
