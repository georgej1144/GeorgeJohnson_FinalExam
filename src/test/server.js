// Imports the server.js file to be tested.
let server = require("../server");
//Assertion (Test Driven Development) and Should, Expect(Behaviour driven development) library
let chai = require("chai");
// Chai HTTP provides an interface for live integration testing of the API's.
let chaiHttp = require("chai-http");
chai.should();
chai.use(chaiHttp);
const { expect } = chai;
var assert = chai.assert;


//Import complete

describe("Server!", () => {
    it("Positive Filter", done => {
        chai
            .request(server)
            .post("/filter")
            .send({'search': 'Pizza Express Margherita'})
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.reviews.length).to.greaterThan(0);
                done();
            });
    });

    it("Negative Filter", done => {
        chai
            .request(server)
            .post("/filter")
            .send({'search': '34w5q6gtref45edfbv'})
            .end((err, res) => {
                expect(res.body.reviews.length).to.eq(0);
                done();
            });
    });
});