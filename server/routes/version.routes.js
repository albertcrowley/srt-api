/** @module VersionRoutes */

const env = process.env.NODE_ENV || 'development'
const versionInfo = require('../version.json')

/**
 * Version API route: <b>GET /api/version</b><br>
 * @return {{version: (function(*, *): *)}}
 */
module.exports = () => {
  let info = Object.assign({ env: env }, versionInfo)
  info.session = 'check session'
  return {
    version: function create (req, res) {
      return res.status(200).send(info)
    }
  }
}
