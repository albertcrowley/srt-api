/** @module AdminReportRoutes */
const db = require('../models/index')
const {getConfig} = require('../config/configuration')
const moment = require('moment')
const logger = require('../config/winston')
const analyticsRoutes = require('../routes/analytics.routes')
const predictionRoutes = require('./prediction.routes')
const authRoutes = require('./auth.routes')
const json2cvs = require('json2csv')


function sendSolicitationDownloadsCSV(solStats, res) {
  const dateHeader = 'Date'
  const newHeader = 'Newly Added Solicitations'
  const updateHeader = 'Updated Solicitations'

  const solStatsOrganizedForCSV = []
  const bothByDate = {}
  for (key of Object.keys(solStats.newSolicitationsByDate)) {
    bothByDate[key] = {}
    bothByDate[key][newHeader] = solStats.newSolicitationsByDate[key]
    bothByDate[key][updateHeader] =  0
  }
  for (key of Object.keys(solStats.updatedSolicitationsByDate)) {
    if (key in bothByDate) {
      bothByDate[key][updateHeader] = solStats.updatedSolicitationsByDate[key]
    } else {
      bothByDate[key] = {}
      bothByDate[key][updateHeader] = solStats.updatedSolicitationsByDate[key]
      bothByDate[key][newHeader] = 0
    }
  }

  for (key of Object.keys(bothByDate)) {
    const row = {}
    // key will be in YYYYMMDD format. Convert it to MM/DD/YYYY
    let date = key.substring(4,6) + "-" + key.substring(6,8) + "-" + key.substring(0,4)
    row[dateHeader] = date
    row[newHeader] = bothByDate[key][newHeader]
    row[updateHeader] = bothByDate[key][updateHeader]
    solStatsOrganizedForCSV.push(row)
  }

  const parser = new json2cvs.Parser({fields: [dateHeader, newHeader, updateHeader]})
  const csv_data = parser.parse(solStatsOrganizedForCSV)



  res.header('Content-Type', 'text/csv')
  res.attachment("solicitation-report.csv")
  res.status(200)
  return res.send(csv_data)

}

module.exports = {

  /*
  Returns an object with the number of total logins for each day
   */

  dailyLogin : async function (req, res) {
    logger.log("debug", "Running daily login report")
    let dailyLogins = {}
    let sql = `select timestamp, message, meta#>>'{cas_userinfo, email-address}' as email from winston_logs where message like '%authenticated with MAX CAS ID%'`
    let rows = await db.sequelize.query(sql, { type: db.sequelize.QueryTypes.SELECT })

    for (let r of rows) {
      let day = moment(r.timestamp).format('MM/DD/YYYY')
      dailyLogins[day] = (dailyLogins[day] || 0) + 1
    }
    return res.status(200).send(dailyLogins)
  },

  /*
  Returns a report of each user's last login, and logins per 7 days / 30 days / all time
   */
  userLogin : async function (req, res) {
    logger.log("debug", "Running user login report")
    let userLogins = {}
    let sql = `select timestamp, message, meta#>>'{cas_userinfo, email-address}' as email from winston_logs where message like '%authenticated with MAX CAS ID%'`
    let rows = await db.sequelize.query(sql, { type: db.sequelize.QueryTypes.SELECT })

    for (let r of rows) {
      let day = moment(r.timestamp).format('MM/DD/YYYY')
      let email = r.email
      userLogins[day] = (userLogins[day]) ? userLogins[day] : {}
      userLogins[day][email] = (userLogins[day][email] || 0) + 1
    }
    return res.status(200).send(userLogins)
  },

  /*
  Gathers the feedback data and returns it as an array with one question/answer per entry
   */
  feedback : async function (req, res) {
    logger.log("debug", "Running feedback report")
    const sql = `
      select sr."solNum",
             jsonb_array_elements(response) -> 'question'::varchar as question,
             jsonb_array_elements(response) -> 'answer'::varchar   as answer,
             jsonb_array_elements(response) -> 'questionID'::varchar   as questionID,
             notice_data->'subject'::varchar as title,
             to_char(date, 'MM/DD/YYYY') as notice_date,
             to_char(sr."updatedAt", 'MM/DD/YYYY') as survey_response_date,
             n.agency,
             sr."maxId",
             email,
             "lastName",
             "firstName",
             n.id as notice_id
      from survey_responses sr
             left join "notice" n on sr.contemporary_notice_id = n.id
             left join "Users" u on sr."maxId" = u."maxId"
      order by survey_response_date desc, "solNum", jsonb_array_elements(response) -> 'questionID'
    `

    try {
      let rows = await db.sequelize.query(sql, { type: db.sequelize.QueryTypes.SELECT })
      let result = []
      for (const r of rows) {
        result.push(
          Object.assign({
            note: r.note, answer: r.answer, question: r.question, questionID: r.questionid, date: r.survey_response_date,
            solicitation_number: r.solNum, email: `${r.name || ''} ${r.email || ''}`, title: r.title, id: r.notice_id,
            agency: r.agency
          }))
      }
      return res.status(200).send(result)
    } catch (e) {
      logger.log("error", "Error running feedback report", {tag: "feedback report", "error-message": e.message, err:e } )
      e.message //?
      return res.status(500).send({})
    }
  },

  /*
  Gathers the solicitation download  data and returns it as an array or CSV
   */
  solicitationDownloads : async function (req, res) {
    try {
      let user = authRoutes.userInfoFromReq(req)

      let solStats = undefined
      let first = 0
      let rows = 1000
      while (true) {
        let result = await predictionRoutes.getPredictions({'first': first, 'rows': rows, 'ignoreDateCutoff': true}, user);
        solStats = await analyticsRoutes.calcSolicitations(result.predictions, solStats)
        logger.log("info", `Running solicitation download report, asking for ${rows} solicitations with offset ${first}. We got ${result.rows} Total solicitations in report is ${result.totalCount} `)
        if (result.rows == 0) {
          break;
        }
        first += result.rows
      }

      if (req.query.format && req.query.format.toLocaleLowerCase()== 'csv') {
        return sendSolicitationDownloadsCSV(solStats, res)
      } else {
        return res.status(200).send(solStats)
      }



    } catch (e) {
      logger.log("error", "Error running solicitation download report", {tag: "solicitationDownloads report", "error-message": e.message, err:e } )
      e.message //?
      return res.status(500).send({})
    }


  }

}
