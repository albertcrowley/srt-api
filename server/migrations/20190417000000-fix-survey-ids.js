'use strict'

const env = process.env.NODE_ENV || 'development'
const path = require('path')
const config = require(path.join(__dirname, '/../config/config.json'))[env]
const pg = require('pg')
let connectionString = 'postgres://' + config.username + ':' + config.password + '@' + config.host + ':' + config.port + '/' + config.database
let pgClient = new pg.Client(connectionString)

// use manual SQL because Sequelize won't roll back partial transactions
// and there is a chance this could fail due to data issues.

let upSql = [
  'BEGIN',
  'update "Surveys" set id = id-1;',
  'COMMIT'
]

let downSql = [
  'BEGIN',
  'COMMIT'
]
let increment = 0

function runNext (sql) {
  let promise = {}
  if (increment < sql.length) {
    console.log(sql[increment])
    promise = pgClient.query(sql[increment])
  }
  increment++
  return promise
    .then((res) => {
      res.rows.forEach(r => {
        console.log(r)
      })
    })
}

module.exports = {
  up: async () => {
    await pgClient.connect()
    try {
      while (increment < upSql.length) {
        await runNext(upSql).catch(e => { throw e })
      }
    } catch (e) {
      console.log('ROLLBACK')
      console.log(e)
      return pgClient.query('ROLLBACK')
        .then(() => { throw e })
    }
  },
  down: async () => {
    await pgClient.connect()
    try {
      while (increment < downSql.length) {
        await runNext(downSql).catch(e => { throw e })
      }
    } catch (e) {
      console.log('ROLLBACK')
      console.log(e)
      return pgClient.query('ROLLBACK')
        .then(() => { throw e })
    }
  }
}
