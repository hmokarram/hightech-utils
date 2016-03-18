'use strict'

var request = require('request')
  , _ = require('lodash')
  , async = require('async')
  , findWhere = require('lodash.findwhere')
  , flat = require('flat')
  , HERCULES_BASE_URL = 'http://api.localhost.io:5000'

var utils = {

  resolveIds: function(resourceConfigArray, globalState) {
    _.each(resourceConfigArray, function(resourceConfig) {
      _.forEach(resourceConfig, function(value, key) {
        //as per the naming pattern, reference fields will always start from underscore '_'
        if (key.indexOf('_') !== 0)
          return
        var searchObj = {}
        searchObj.name = resourceConfig[key]
        var objFromState = findWhere(globalState.configs, searchObj)
        if (objFromState && _.has(objFromState, '_id')) {
          resourceConfig[key] = objFromState._id
          if (_.has(resourceConfig, '_connectorId') && _.has(objFromState, '_connectorId')) {
            resourceConfig._connectorId = objFromState._connectorId
          }
        }
      })
    })
    return resourceConfigArray
  },

  createIOResource: function(resourceConfigArray, globalState, callback) {
    resourceConfigArray = utils.resolveIds(resourceConfigArray, globalState)
      //add bearerToken in the resources
    for (var i = 0; i < resourceConfigArray.length; i++) {
      resourceConfigArray[i].bearerTokenToCallIO = globalState.bearerToken
    }
    async.eachLimit(resourceConfigArray, resourceConfigArray.length
      , function(resource, cb) {
        var relUri = '/v1/' + resource.resourceType
          , bearerToken = resource.bearerTokenToCallIO

        delete resource.resourceType
        delete resource.bearerTokenToCallIO

        utils.requestIntegrator(relUri, 'POST', resource, null, bearerToken, null, function(err, res, body) {
          if (err) return cb(err)
          resource._id = body._id
          globalState.configs.push(resource)
          cb(null)
        })
      }
      , function(err) {
        if (err) return callback(err)
        return callback(null)
      })
  },

  buildNameMap: function(records) {
    var map = {}
    _.forEach(records, function(record) {
      map[record.name] = record
    })
    return map
  },

  concatDedup: function(hiPrecedenceArr, loPrecedenceArr, prop) {
    var concatArray = _.union(hiPrecedenceArr, loPrecedenceArr)
      , uniqArray = _.uniqBy(concatArray, prop)
    return uniqArray
  },

  requestNSConnection: function(_connectionId, scriptId, deployId, reqMethod, data, errorMsg, bearerToken, cb, callback) {
    var opts = {
      uri: HERCULES_BASE_URL + '/v1/connections/' + _connectionId + '/proxy'
      , method: 'POST'
      , headers: {
        Authorization: 'Bearer ' + bearerToken
        , 'Content-Type': 'application/json'
        , 'Integrator-Netsuite-ScriptId': scriptId
        , 'Integrator-Netsuite-DeployId': deployId
        , 'Integrator-Method': reqMethod
      }
      , json: data
    }

    request(opts, function(error, response, body) {
      if (cb) {
        if (error) {
          return cb(error)
        }
        if ([200, 201, 204].indexOf(response.statusCode) === -1) {
          if (errorMsg)
            return cb(new Error(errorMsg))
          else
            return cb(new Error('statuscode not in (200, 201, 204) for scriptId=' + scriptId))
        }
        return callback(body)
      } else
        return callback(error, response, body)
    })
  },

  requestRestConnection: function(_connectionId, relativeURI, reqMethod, data, errorMsg, bearerToken, cb, callback) {
    var opts = {
      uri: HERCULES_BASE_URL + '/v1/connections/' + _connectionId + '/proxy'
      , method: 'POST'
      , headers: {
        Authorization: 'Bearer ' + bearerToken
        , 'Content-Type': 'application/json'
        , 'Integrator-Relative-URI': relativeURI
        , 'Integrator-Method': reqMethod
      }
      , json: data
    }

    request(opts, function(error, response, body) {
      if (cb) {
        if (error) {
          return cb(error)
        }
        if ([200, 201, 204].indexOf(response.statusCode) === -1) {
          if (errorMsg)
            return cb(new Error(errorMsg))
          else
            return cb(new Error('statuscode not in (200, 201, 204) for relative-uri=' + relativeURI))
        }
        return callback(body)
      } else
        return callback(error, response, body)
    })
  },

  requestIntegrator: function(relativeURI, reqMethod, data, errorMsg, bearerToken, cb, callback) {
    var opts = {
      uri: HERCULES_BASE_URL + relativeURI
      , method: reqMethod
      , headers: {
        Authorization: 'Bearer ' + bearerToken
        , 'Content-Type': 'application/json'
      }
      , json: data
    }

    request(opts, function(error, response, body) {
      if (cb) {
        if (error) {
          return cb(error)
        }
        if ([200, 201, 204].indexOf(response.statusCode) === -1) {
          if (errorMsg)
            return cb(new Error(errorMsg))
          else
            return cb(new Error('statuscode not in (200, 201, 204) for relative-uri=' + relativeURI))
        }
        return callback(body)
      } else
        return callback(error, response, body)
    })
  },

  preProcessMapping: function(rec, version) {
    var fields
    if (rec && rec.mapping && rec.mapping.mappings) {
      fields = []
      if (!!version) {
        // Update functionality case
        _.forEach(rec.mapping.mappings, function(mapRec) {
          if (mapRec.version > version) {
            _.forEach(mapRec.fields, function(fieldRec) {
              fields.push(fieldRec)
            })
          }
        })
      } else {
        // Install functionality case
        _.forEach(rec.mapping.mappings, function(mapRec) {
          _.forEach(mapRec.fields, function(fieldRec) {
            fields.push(fieldRec)
          })
        })
      }
      rec.mapping = {
        fields: fields
      }
    }
    return rec
  },

  isTestModeOn: function(options, propertyName) {
    var result = false
    if (options &&
      options.settings &&
      options.settings.general &&
      options.settings.general.fields &&
      _.isArray(options.settings.general.fields)) {
      result = _.find(options.settings.general.fields, function(field) {
        return field.name == propertyName
      }).value
    }
    return result
  },

  isTestTextPresent: function(inputField, testText) {
    var inputFieldFlattened = flat(inputField)
      , result = false
    _.forEach(inputFieldFlattened, function(value) {
      if (typeof value === 'string' && value.indexOf(testText) === 0) {
        result = true
      }
    })
    return result
  },

  responseDataAfterValidation: function(options, propertyName) {
    var testText, i
    if (!!options &&
      !!options.settings &&
      !!options.settings.general &&
      !!options.settings.general.fields) {
      testText = _.find(options.settings.general.fields, function(field) {
        return field.name == propertyName
      }).value
    }

    if (!testText)
      return

    for (i = 0; i < options.data.length; i++) {
      if (!utils.isTestTextPresent(options.data[i], testText)) {
        options.data[i] = null
      }
    }
  },

  enableDisableFlow: function(flow, disabled, configToSend, bearerToken, callback) {
    flow.disabled = disabled
    utils.requestIntegrator('/v1/flows/' + flow._id, 'PUT', flow, 'Could not save the flow setting', bearerToken, callback, function() {
      if (configToSend) {
        configToSend.disabled = disabled
        utils.requestIntegrator('/v1/exports/' + flow._exportId + '/distributed', 'PUT', configToSend, 'Could not save the flow setting in NetSuite', bearerToken, callback, function() {
          return callback(null)
        })
      } else return callback(null)
    })
  },

  getSettingsMap: function(settings) {
    var settingsMap = {}

    _.forEach(settings.sections, function(section) {
      _.forEach(section.fields, function(field) {
        settingsMap[field.name] = field.value
      })
    })

    if (settings.general) {
      _.forEach(settings.general.fields, function(field) {
        settingsMap[field.name] = field.value
      })
    }

    return settingsMap
  }
}

module.exports.utils = utils