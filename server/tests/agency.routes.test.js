const request = require('supertest');
const app = require('../app')();
const mockToken = require("./mocktoken");
const logger = require('../config/winston');
const Agency = require('../models').Agency;

const {user1, user_accepted, user3} = require ('./test.data');
let token = mockToken(user_accepted);

describe ('/api/agencies', () => {
    let agency = "abc";
    let acronym = "def";

    beforeAll( ()=>{});
    afterAll ( () => {
        return Agency.destroy( {where: {agency: agency}});
    });

    test( '/api/agencies (get)', async () => {
        return request(app)
            .get('/api/agencies')
            .then( (res) => {
                expect(res.statusCode).toBe(200);
                expect(res.body.length).toBeGreaterThan(2);
                expect(res.body).toContainEqual({"Acronym": "GSA", "Agency": "General Services Administration"});

            });
    });


    test( '/api/agencies (put)', async () => {

        return request(app)
            .put('/api/agencies')
            .send({agency:agency, acronym: acronym})
            .then( (res) => {

                expect(res.statusCode).toBe(200);
                return Agency.findOne({where : {acronym: "def"}})
                    .then ( (a) => {
                        return expect(a.agency).toBe(agency);
                    })


            });
    });

    test( '/api/AgencyList', async () => {

        return request(app)
            .get('/api/AgencyList')
            .set('Authorization', `Bearer ${token}`)
            .send({agency:agency, acronym: acronym})
            .then( (res) => {
                expect(res.statusCode).toBe(200);
                expect(res.body).toBeDefined();
                expect(res.body.length).toBeGreaterThan(1);
                return expect(typeof (res.body[0])).toBe("string");
            });
    }, 10000);

});
