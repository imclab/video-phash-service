'use strict'

module.exports = require('ioredis').createClient(require('../config').redis_uri)
