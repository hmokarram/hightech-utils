'use strict'

var assert = require('assert')
  , _ = require('lodash')
  , utils = require('../utils.js').utils

describe('Testing the test.utils.responseDataAfterValidation functionality', function() {

  before(function(done) {
    done()
  })

  after(function(done) {
    done()
  })

  it('should return expectedResult when utils.responseDataAfterValidation is called', function(done) {

    var options = {
        'settings': {
          'general': {
            'fields': [{
              'label': 'Test Mode Text'
              , 'type': 'input'
              , 'name': 'input_test_mode_text'
              , 'value': 'Test__'
            }]
          }
        }
        , 'data': [{
          'field1': {
            'subfield1': [{
              'element1': 'Test__value1'
            }, {
              'element1': 'value2'
            }]
          }
          , 'field2': 'value3'
        }, {
          'field1': {
            'subfield1': [{
              'element1': 'value1'
            }, {
              'element1': 'value2'
            }]
          }
          , 'field2': 'value3'
        }]
      }
      , expectedResult = [
        null
        , {
          'field1': {
            'subfield1': [{
              'element1': 'Test__value1'
            }, {
              'element1': 'value2'
            }]
          }
          , 'field2': 'value3'
        }
      ]
      , result1 = []
      , result2 = []

    try {
      utils.responseDataAfterValidation(options, 'input_test_mode_text')
    } catch (ex) {
      throw new Error(ex)
    }

    _.forEach(options.data, function(data) {
      result1.push(JSON.stringify(data))
    })

    _.forEach(expectedResult, function(data) {
      result2.push(JSON.stringify(data))
    })

    assert.deepEqual([], _.difference(result1, result2))
    done()
  })

})