const sqlite3 = require('sqlite3').verbose();
const { SharedService } = require('./SharedService');

const DataTypes = {
  TEXT: 'TEXT',
  INTEGER: 'INTEGER',
  NULL: 'NULL'
};

class SqliteDatabase {
  constructor(dbFile) {
    this.dbFile = dbFile;
    this.openConnections = 0;
    this.db = null;
  }

  open() {
    if (this.openConnections <= 0) {
      this.db = new sqlite3.Database(this.dbFile);
      this.openConnections = 1;
    } else this.openConnections++;
  }

  close() {
    if (this.openConnections <= 1) {
      if (this.db) this.db.close();
      this.db = null;
      this.openConnections = 0;
    } else this.openConnections--;
  }

  async createTableIfNotExists(tableName, columnInfo) {
    if (!this.db) throw 'Database connection is not open.';
    const columns = columnInfo.map(c => {
      let info = `${c.name} ${c.type}`;
      if (c.default) info += ` DEFAULT ${c.default}`;
      if (c.unique) info += ' UNIQUE';
      if (c.primary) info += ' PRIMARY KEY';
      if (c.notNull) info += ' NOT NULL';
      return info;
    }).join(', ');
    const query = `CREATE TABLE IF NOT EXISTS ${tableName}(${columns})`;
    await this.runQuery(query);
  }

  async getLastRecord(tableName) {
    const query = `SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.get(query, (err, row) => {
        if (err) return reject(err.message);
        resolve(row);
      });
    });
  }

  async insertValue(tableName, value) { return this.insertValues(tableName, [value]); }

  async insertValues(tableName, values) {
    if (!this.db) throw 'Database connection is not open.';
    if (!values.length) return { lastId: 0, changes: 0 };
    const columnNames = Object.keys(values[0]);
    let rowValueStr = '';
    let rowValues = [];
    for (const val of values) {
      rowValueStr += '(';
      for (const columnName of columnNames) {
        rowValueStr += '?,';
        rowValues.push(val[columnName] ?? 'NULL');
      }
      rowValueStr = rowValueStr.slice(0, -1) + '),';
    }
    rowValueStr = rowValueStr.slice(0, -1);
    const query = `INSERT INTO ${tableName}(${columnNames.join(', ')}) VALUES ${rowValueStr}`;
    return await this.runQuery(query, rowValues);
  }

  async updateValue(tableName, value, filter = null) {
    if (!this.db) throw 'Database connection is not open.';
    let columnNames = Object.keys(value);
    let valueStr = '';
    let values = [];
    for (const columnName of columnNames) {
      valueStr += `${columnName} = ?,`;
      values.push(value[columnName] ? value[columnName] : 'NULL');
    }
    valueStr = valueStr.slice(0, -1);
    let filterStr = '1 AND ';
    if (filter) {
      columnNames = Object.keys(filter);
      for (const columnName of columnNames) {
        filterStr += `${columnName} = ? AND `;
        values.push(filter[columnName] ? filter[columnName] : 'NULL');
      }
    }
    filterStr = filterStr.slice(0, -5);
    const query = `UPDATE ${tableName} SET ${valueStr} WHERE ${filterStr};`;
    return await this.runQuery(query, values);
  }

  async deleteValues(tableName, filter = null) {
    if (!this.db) throw 'Database connection is not open.';
    let values = [];
    let filterStr = '1 AND ';
    if (filter) {
      const columnNames = Object.keys(filter);
      for (const columnName of columnNames) {
        filterStr += `${columnName} = ? AND `;
        values.push(filter[columnName] ? filter[columnName] : 'NULL');
      }
    }
    filterStr = filterStr.slice(0, -5);
    const query = `DELETE FROM ${tableName} WHERE ${filterStr};`;
    return await this.runQuery(query, values);
  }

  async getValues(tableName, filter = null, op = '=') {
    if (!this.db) throw 'Database connection is not open.';
    let values = [];
    let filterStr = '1 AND ';
    if (filter) {
      const columnNames = Object.keys(filter);
      if (op === 'IN') {
        for (const columnName of columnNames) {
          if (filter[columnName].length > 0) {
            filterStr += `${columnName} ${op} ( `;
            const valArray = filter[columnName];
            for (const v of valArray) { filterStr += '?, '; values.push(v); }
            filterStr = filterStr.slice(0, -2) + ') AND ';
          }
        }
      } else {
        for (const columnName of columnNames) {
          filterStr += `${columnName} ${op} ? AND `;
          values.push(filter[columnName] ? filter[columnName] : 'NULL');
        }
      }
    }
    filterStr = filterStr.slice(0, -5);
    const query = `SELECT * FROM ${tableName}` + (filterStr ? ` WHERE ${filterStr};` : ';');
    return new Promise((resolve, reject) => {
      const rows = [];
      this.db.each(query, values, (err, row) => {
        if (err) return reject(err);
        rows.push(row);
      }, (err) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  runQuery(query, params = null) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params ? params : [], function (err) {
        if (err) return reject(err);
        resolve({ lastId: this.lastID, changes: this.changes });
      });
    });
  }
}

module.exports = { SqliteDatabase, DataTypes };
