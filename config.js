
exports.password = process.env.PASSWORD || 'mgmt';
exports.maxage = parseInt(process.env.MAX_AGE) || 30 * 24 * 60 * 60;
