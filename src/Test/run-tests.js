const { run } = require('./testcases/HelloTest');

(async () => {
  try {
    await run();
    console.log('All tests passed.');
    process.exit(0);
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  }
})();
