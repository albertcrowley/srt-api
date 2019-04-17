'use strict'
const path = require('path')
const migrationUtils = require(path.join(__dirname, '..', 'migrationUtil'))

let upSql = [
  'DO $$                                                                                                 \n' +
    '    BEGIN                                                                                           \n' +
    '        BEGIN                                                                                       \n' +
    '       ALTER TABLE attachment ADD COLUMN filename text default \'no-filename-provided\';            \n' +
    '        EXCEPTION                                                                                   \n' +
    '            WHEN duplicate_column THEN RAISE NOTICE \'column filename already exists in attachment.\';\n' +
    '        END;                                                                                        \n' +
    '    END;                                                                                            \n' +
    '$$                                                                                                  \n'
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
