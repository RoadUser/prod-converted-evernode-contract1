const nacl = require('tweetnacl');
const { hexToUint8 } = require('../Utils/Crypto.Helper');
const { UpgradeService } = require('../Services/Common.Services/Upgrade.Service');
const { loadEnv } = require('../Utils/Env');

function isMaintainer(userPubKeyHex, env) {
  const expected = (env.MAINTAINER_PUBKEY || '').toLowerCase();
  if (!expected) return false;
  return (userPubKeyHex || '').toLowerCase() === expected;
}

class UpgradeController {
  constructor(message, ctx, user) {
    this.message = message;
    this.ctx = ctx;
    this.user = user;
    this.service = new UpgradeService(message, ctx);
  }

  async handleRequest() {
    const env = loadEnv();
    try {
      const action = (this.message && (this.message.Action || this.message.action)) || '';
      if (action !== 'UpgradeContract') {
        return { error: { code: 400, message: 'Invalid action.' } };
      }

      const userPubKeyHex = Buffer.from(this.user.publicKey || this.user.pubKey || '').toString('hex') || this.user.pubKey || '';
      const handshakeOk = isMaintainer(userPubKeyHex, env);
      if (!handshakeOk) {
        return { error: { code: 401, message: 'Unauthorized' } };
      }

      // Content signature verification
      const data = this.message.data || {};
      const zipBase64 = data.zipBase64;
      const signatureHex = data.zipSignatureHex || '';
      if (!zipBase64 || !signatureHex) return { error: { code: 400, message: 'zipBase64 and zipSignatureHex are required.' } };

      const zipBuffer = Buffer.from(zipBase64, 'base64');
      const sig = hexToUint8(signatureHex);
      const pub = hexToUint8(userPubKeyHex);
      const verified = nacl.sign.detached.verify(new Uint8Array(zipBuffer), sig, pub);
      if (!verified) return { error: { code: 401, message: 'Invalid signature' } };

      return await this.service.upgradeContract();
    } catch (e) {
      return { error: { code: 500, message: e && e.message ? e.message : 'Upgrade error' } };
    }
  }
}

module.exports = { UpgradeController };
