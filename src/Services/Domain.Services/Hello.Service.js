const { Tables } = require('../../Constants/Tables');
const { SqliteDatabase } = require('../Common.Services/dbHandler');
const settings = require('../../settings.json').settings;

class HelloService {
  constructor(message) {
    this.message = message;
    this.db = new SqliteDatabase(settings.dbPath);
  }

  async getMessage() {
    const res = {};
    try {
      this.db.open();
      const rows = await this.db.getValues(Tables.HELLO, {}, '=');
      res.success = rows && rows[0] ? { id: rows[0].Id, message: rows[0].Message } : { id: null, message: '' };
      return res;
    } finally {
      this.db.close();
    }
  }

  async setMessage() {
    const res = {};
    try {
      const newMsg = (this.message && this.message.data && this.message.data.message) ? String(this.message.data.message) : '';
      if (!newMsg) throw new Error('Message is required');
      this.db.open();
      const rows = await this.db.getValues(Tables.HELLO, {}, '=');
      if (rows && rows[0]) {
        await this.db.updateValue(Tables.HELLO, { Message: newMsg, LastUpdatedOn: new Date().toISOString() }, { Id: rows[0].Id });
        res.success = { id: rows[0].Id, message: newMsg };
      } else {
        const ins = await this.db.insertValue(Tables.HELLO, { Message: newMsg, ConcurrencyKey: '0x0000000000000000' });
        res.success = { id: ins.lastId, message: newMsg };
      }
      return res;
    } finally {
      this.db.close();
    }
  }
}

module.exports = { HelloService };
