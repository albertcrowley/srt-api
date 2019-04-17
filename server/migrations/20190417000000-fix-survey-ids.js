'use strict'
const migrationUtils = require('../migrationUtil')

let upSql = [
  'update "Surveys" set id = id-1;'
]

let downSql = [
]

module.exports = {
  up: async () => {
    await migrationUtils.migrate(upSql)
  },
  down: async () => {
    await migrationUtils.migrate(downSql)
  }
}
