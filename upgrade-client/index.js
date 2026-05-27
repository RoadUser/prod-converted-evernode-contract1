const HotPocket = require('hotpocket-js-client');
const nacl = require('tweetnacl');
const fs = require('fs');
const ContractService = require('./contract-service');

// Usage: node index.js <contractUrl> <zipFilePath> <privateKeyHexSeed32bytes> <version> <description>

async function createKeyPairFromSeedHex(seedHex) {
  const seed = Buffer.from(seedHex, 'hex');
  if (seed.length !== 32) throw new Error('Seed must be 32 bytes hex');
  const kp = nacl.sign.keyPair.fromSeed(new Uint8Array(seed));
  return { publicKey: Buffer.from(kp.publicKey), privateKey: Buffer.from(kp.secretKey) };
}

async function main() {
  const contractUrl = process.argv[2];
  const filepath = process.argv[3];
  const privateKeyHexSeed = process.argv[4];
  const version = process.argv[5];
  const description = process.argv[6] || '';

  if (!contractUrl || !filepath || !privateKeyHexSeed || !version) {
    console.log('Usage: node index.js <contractUrl> <zipFilePath> <privateKeyHexSeed32bytes> <version> <description>');
    process.exit(1);
  }

  const keyPair = await createKeyPairFromSeedHex(privateKeyHexSeed);
  const zipBuffer = fs.readFileSync(filepath);

  // Sign with Ed25519 (detached)
  const signature = nacl.sign.detached(new Uint8Array(zipBuffer), new Uint8Array(keyPair.privateKey));
  const signatureHex = Buffer.from(signature).toString('hex');
  const zipBase64 = zipBuffer.toString('base64');

  const svc = new ContractService([contractUrl], keyPair);
  const ok = await svc.init();
  if (!ok) { console.log('Connection failed'); process.exit(1); }

  const submitData = {
    Service: 'Upgrade',
    Action: 'UpgradeContract',
    data: {
      version: parseFloat(version),
      description: description,
      zipBase64: zipBase64,
      zipSignatureHex: signatureHex
    }
  };

  try {
    const r = await svc.submitInputToContract(submitData);
    console.log('Upgrade response:', r);
  } catch (e) {
    console.error('Upgrade failed:', e);
  } finally {
    process.exit(0);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
