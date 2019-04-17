'use strict'
const env = process.env.NODE_ENV || 'development'
const path = require('path')
const config = require(path.join(__dirname, 'config', 'config.json'))[env]
const pg = require('pg/lib')
let connectionString = 'postgres://' + config.username + ':' + config.password + '@' + config.host + ':' + config.port + '/' + config.database

/**
 * Runs a single sql statement and prints results
 *
 * @param pgClient
 * @param sql
 * @return {*|PromiseLike<T | never>|Promise<T | never>}
 */
function runNext (pgClient, sql) {
  return pgClient.query(sql)
    .then((res) => {
      console.log('sql:', sql)
      res.rows.forEach(r => {
        console.log(r)
      })
    })
}

/**
 * Runs a series of SQL statements as a group.
 * Will roll back the entire set if any one fails.
 *
 * @param upSql
 * @return {Promise<*|PromiseLike<*>|Promise<*>>}
 */
async function migrate(upSql) {
  let sqlArray = ['BEGIN', ...upSql, 'COMMIT']
  let pgClient = new pg.Client(connectionString)
  await pgClient.connect()
  try {
    for (let sql of sqlArray) {
      await runNext(pgClient, sql).catch(e => {
        throw e
      })
    }
  } catch (e) {
    console.log('ROLLBACK', e)
    return pgClient.query('ROLLBACK')
      .then(() => {
        throw e
      })
  }
  await pgClient.end()
}


module.exports = {
  migrate: migrate
}
