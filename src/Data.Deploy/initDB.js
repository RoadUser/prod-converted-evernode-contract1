const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const settings = require('../settings.json').settings;
const { Tables } = require('../Constants/Tables');

class DBInitializer {
  static db = null;

  static async init() {
    if (!fs.existsSync(settings.dbPath)) {
      this.db = new sqlite3.Database(settings.dbPath);
      await this.run(`PRAGMA foreign_keys = ON`);

      await this.run(`CREATE TABLE IF NOT EXISTS ${Tables.CONTRACTVERSION} (
        Id INTEGER,
        Version FLOAT NOT NULL,
        Description TEXT,
        CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      await this.run(`CREATE TABLE IF NOT EXISTS ${Tables.SQLSCRIPTMIGRATIONS} (
        Id INTEGER,
        Sprint TEXT NOT NULL,
        ScriptName TEXT NOT NULL,
        ExecutedTimestamp TEXT,
        ConcurrencyKey TEXT CHECK (ConcurrencyKey LIKE '0x%' AND length(ConcurrencyKey) = 18),
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      await this.run(`CREATE TABLE IF NOT EXISTS ${Tables.ACTIVITYLOG} (
        Id INTEGER,
        ActivityType TEXT,
        User TEXT,
        Service TEXT,
        Action TEXT,
        Message TEXT,
        ExceptionMessage TEXT,
        TimeStamp TEXT,
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      await this.run(`CREATE TABLE IF NOT EXISTS ${Tables.HELLO} (
        Id INTEGER,
        Message TEXT NOT NULL,
        CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        ConcurrencyKey TEXT,
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      // Seed default Hello World message
      await this.run(`INSERT INTO ${Tables.HELLO}(Message, ConcurrencyKey) VALUES(?, ?)`, [
        'Hello World!',
        '0x0000000000000000'
      ]);

      this.db.close();
    }

    // Migration runner (optional folders)
    if (fs.existsSync(settings.dbPath) && fs.existsSync(settings.dbScriptsFolderPath)) {
      this.db = new sqlite3.Database(settings.dbPath);

      const getLastExecutedSprintQuery = `SELECT Sprint FROM ${Tables.SQLSCRIPTMIGRATIONS} ORDER BY Sprint DESC LIMIT 1`;
      const lastRow = await this.get(getLastExecutedSprintQuery);
      const lastExecutedSprint = lastRow ? lastRow.Sprint : 'Sprint_00';

      const folders = fs.readdirSync(settings.dbScriptsFolderPath)
        .filter(f => f.startsWith('Sprint_') && f >= lastExecutedSprint)
        .sort();

      for (const sprintFolder of folders) {
        const sprintPath = path.join(settings.dbScriptsFolderPath, sprintFolder);
        const sqlFiles = fs.readdirSync(sprintPath).filter(f => f.match(/^\d+_.+\.sql$/)).sort();
        for (const sqlFile of sqlFiles) {
          const already = await this.get(`SELECT * FROM ${Tables.SQLSCRIPTMIGRATIONS} WHERE Sprint = ? AND ScriptName = ?`, [sprintFolder, sqlFile]);
          if (!already) {
            const script = fs.readFileSync(path.join(sprintPath, sqlFile), 'utf8');
            const statements = script.split(';').map(s => s.split('\
').map(l => l.trim().startsWith('--') ? '' : l).join('\
')).filter(s => s.trim() !== '');
            for (const st of statements) { try { await this.run(st); } catch (e) { console.error('Migration error:', e); } }
            await this.run(`INSERT INTO ${Tables.SQLSCRIPTMIGRATIONS} (Sprint, ScriptName, ExecutedTimestamp) VALUES (?, ?, datetime('now'))`, [sprintFolder, sqlFile]);
          }
        }
      }

      this.db.close();
    }
  }

  static run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function (err) {
        if (err) return reject(err);
        resolve({ lastId: this.lastID, changes: this.changes });
      });
    });
  }

  static get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }
}

module.exports = { DBInitializer };
