function hexToUint8(hex) {
  const cleaned = hex.toLowerCase().replace(/^0x/, '');
  if (cleaned.length % 2 !== 0) throw new Error('Invalid hex string');
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    out[i / 2] = parseInt(cleaned.substr(i, 2), 16);
  }
  return out;
}

function uint8ToHex(uint8) {
  return Buffer.from(uint8).toString('hex');
}

module.exports = { hexToUint8, uint8ToHex };
