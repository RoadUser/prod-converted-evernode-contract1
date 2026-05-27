const HotPocket = require('hotpocket-nodejs-contract');
const { Controller } = require('./controller');
const { DBInitializer } = require('./Data.Deploy/initDB');
const { SharedService } = require('./Services/Common.Services/SharedService');
const { SqliteDatabase } = require('./Services/Common.Services/dbHandler');
const { Tables } = require('./Constants/Tables');
const settings = require('./settings.json').settings;

const contract = async (ctx) => {
  console.log('HelloWorld contract is running.');
  SharedService.context = ctx;

  try {
    await DBInitializer.init();
  } catch (e) {
    console.error('DB init error:', e);
  }

  const db = new SqliteDatabase(settings.dbPath);
  try {
    db.open();
    let row = await db.getLastRecord(Tables.CONTRACTVERSION);
    row = row || { Version: 1.0 };
    console.log('Current contract version:', row.Version);
  } catch (e) {
    console.log('Version read error:', e);
  } finally {
    db.close();
  }

  const controller = new Controller();

  for (const user of ctx.users.list()) {
    for (const input of user.inputs) {
      const buf = await ctx.users.read(input);
      let message = null;
      try { message = JSON.parse(buf); } catch (e) { try { message = JSON.parse(buf.toString()); } catch (_) { message = {}; } }
      await controller.handleRequest(ctx, user, message, ctx.readonly);
    }
  }
};

const hpc = new HotPocket.Contract();
hpc.init(contract);
