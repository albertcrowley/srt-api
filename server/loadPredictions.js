const env = process.env.NODE_ENV || 'development'
const config = require('./config/config.js')[env]
const app = require('./app')()
// noinspection JSUnresolvedVariable
const port = config.srt_server.port

let predictionRoutes = require('./routes/prediction.routes')

predictionRoutes.updatePredictionTable()
  .then( () => {
    // process.exit(0)
    console.log ("loadPredications.js complete")

    let sql = ' select * from information_schema.columns  where table_name like \'Predictions\'  '



    return app.db.sequelize.query(sql)
      .then( (rows) => {
        console.log(rows)

        let sql2 = ' select count(*) from "Predictions" '
        return app.db.sequelize.query(sql2)
          .then( (rows) => {
            console.log(rows)
          })
      })
  })

