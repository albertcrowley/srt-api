const request = require('supertest')
let app = require('../app')()
const mockToken = require('./mocktoken')
// noinspection JSUnresolvedVariable
const User = require('../models').User
const { userAccepted } = require('./test.data')

let myUser = {}
let token = {}

describe('/api/analytics', () => {
  beforeAll(() => {
    myUser = Object.assign({}, userAccepted)
    myUser.firstName = 'an-beforeAllUser'
    myUser.email = 'crowley+an@tcg.com'
    delete myUser.id
    return User.create(myUser)
      .then((user) => {
        myUser.id = user.id
        token = mockToken(myUser)
      })
  })

  afterAll(() => {
    return User.destroy({ where: { firstName: 'an-beforeAllUser' } })
  })

  test('/api/analytics', () => {
    return request(app)
      .post('/api/analytics')
      .set('Authorization', `Bearer ${token}`)
      .send({ agency: 'Government-wide', fromPeriod: '1/1/1900', toPeriod: '12/31/2100' })
      .then((res) => {
        // noinspection JSUnresolvedVariable
        expect(res.statusCode).toBe(200)
        expect(res.body.TopSRTActionChart).toBeDefined()
        expect(res.body.TopSRTActionChart.determinedICT).toBeDefined()
        expect(res.body.TopSRTActionChart.determinedICT).toBeGreaterThan(2)
        return expect(res.body.TopAgenciesChart).toBeDefined()
      })
  }, 30000)
})
