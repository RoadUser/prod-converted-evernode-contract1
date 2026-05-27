const fs = require('fs');
const { SqliteDatabase } = require('./dbHandler');
const { Tables } = require('../../Constants/Tables');
const settings = require('../../settings.json').settings;

class UpgradeService {
  constructor(message, ctx) {
    this.message = message;
    this.ctx = ctx;
    this.db = new SqliteDatabase(settings.dbPath);
  }

  async upgradeContract() {
    const res = {};
    try {
      const payload = this.message.data || {};
      const version = parseFloat(payload.version);
      const description = (payload.description || '').toString();
      const zipBase64 = payload.zipBase64;
      if (!zipBase64) throw new Error('zipBase64 is required');

      this.db.open();
      let row = await this.db.getLastRecord(Tables.CONTRACTVERSION);
      const currentVersion = row && row.Version ? parseFloat(row.Version) : 1.0;
      if (!(version > currentVersion)) {
        res.error = { code: 403, message: 'Contract version must be greater than current version.' };
        return res;
      }

      const zipBuffer = Buffer.from(zipBase64, 'base64');
      fs.writeFileSync(settings.newContractZipFileName, zipBuffer);

      const script = `#!/bin/bash\
\
! command -v unzip &>/dev/null && apt-get update && apt-get install --no-install-recommends -y unzip\
\
zip_file=\"${settings.newContractZipFileName}\"\
unzip -o -d ./ \"$zip_file\" >>/dev/null\
rm \"$zip_file\" >>/dev/null\
`;
      fs.writeFileSync(settings.postExecutionScriptName, script);
      fs.chmodSync(settings.postExecutionScriptName, 0o777);

      const dataRow = {
        Version: version,
        Description: description,
        CreatedOn: new Date().toISOString(),
        LastUpdatedOn: new Date().toISOString()
      };
      const insert = await this.db.insertValue(Tables.CONTRACTVERSION, dataRow);

      res.success = { message: 'Contract upgraded', id: insert.lastId, version };
      return res;
    } catch (e) {
      return { error: { code: 500, message: e && e.message ? e.message : 'Upgrade failed' } };
    } finally {
      this.db.close();
    }
  }
}

module.exports = { UpgradeService };
