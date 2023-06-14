const Model = require('./model');
const {promisePool} = require('../db');

class Client extends Model {
  constructor() {
    super();
  }

  static async retrieveAllByAccountSid(account_sid) {
    const sql = `SELECT * FROM ${this.table} WHERE account_sid = ?`;
    const [rows] = await promisePool.query(sql, account_sid);
    return rows;
  }

  static async retrieveAllByServiceProviderSid(service_provider_sid) {
    const sql = `SELECT c.client_sid, c.account_sid, c.is_active, c.username, c.hashed_password
      FROM ${this.table} AS c LEFT JOIN accounts AS acc ON c.account_sid = acc.account_sid
      LEFT JOIN service_providers AS sp ON sp.service_provider_sid = accs.service_provider_sid
      WHERE sp.service_provider_sid = ?`;
    const [rows] = await promisePool.query(sql, service_provider_sid);
    return rows;
  }

  static async retrieveByAccountSidAndUserName(account_sid, username) {
    const sql = `SELECT * FROM ${this.table} WHERE account_sid = ? AND username = ?`;
    const [rows] = await promisePool.query(sql, [account_sid, username]);
    return rows;
  }
}

Client.table = 'clients';
Client.fields = [
  {
    name: 'client_sid',
    type: 'string',
    primaryKey: true
  },
  {
    name: 'account_sid',
    type: 'string',
    required: true
  },
  {
    name: 'is_active',
    type: 'number'
  },
  {
    name: 'username',
    type: 'string',
    required: true
  },
  {
    name: 'password',
    type: 'string'
  }
];

module.exports = Client;
