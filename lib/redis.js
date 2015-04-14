'use strict'

module.exports = require('then-redis').createClient(require('../config').redis_uri)
