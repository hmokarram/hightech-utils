'use strict'

var assert = require('assert')
  , nock = require('nock')
  , utils = require('../utils.js').utils
  , TEST_URL = 'http://api.localhost.io:5000'

describe('Testing the test.utils.enableDisableFlow functionality', function() {

  before(function(done) {
    nock(TEST_URL)
      .put('/v1/flows/validFlowId')
      .times(2)
      .reply(204)
      .put('/v1/exports/validExportId/distributed')
      .reply(204)

    done()
  })

  after(function(done) {
    nock.cleanAll()
    done()
  })

  it('should return expectedResult when utils.enableDisableFlow is called', function(done) {

    var flow = {
        '_id': 'validFlowId'
        , 'lastModified': '2016-03-17T12:08:24.477Z'
        , 'name': 'JIRA Issue to NetSuite Issue Add'
        , 'disabled': false
      }
      , mainCb = function(error) {
        assert.deepEqual(error, null)
        done()
      }

    utils.enableDisableFlow(flow, 'true', null, 'sampleBearerToken', mainCb)
  })

  it('should return expectedResult when utils.enableDisableFlow is called for distributed', function(done) {

    var flow = {
        '_id': 'validFlowId'
        , 'lastModified': '2016-03-17T12:08:24.477Z'
        , 'name': 'JIRA Issue to NetSuite Issue Add'
        , '_exportId': 'validExportId'
        , 'disabled': false
      }
      , configToSend = {
        'key1': 'value1'
        , 'key2': 'value2'
      }
      , mainCb = function(error) {
        assert.deepEqual(error, null)
        done()
      }

    utils.enableDisableFlow(flow, 'true', configToSend, 'sampleBearerToken', mainCb)
  })

})