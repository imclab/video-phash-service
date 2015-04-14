
exports.redis_uri = process.env.REDIS_URI || 'tcp://localhost:6379'
exports.password = process.env.PASSWORD || 'mgmt'
exports.maxage = parseInt(process.env.MAX_AGE) || 30 * 24 * 60 * 60
