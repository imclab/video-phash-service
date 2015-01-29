
var redis = require('then-redis').createClient(process.env.REDIS_URI || 'tcp://localhost:6379');
var download = require('download-cache');
var crypto = require('crypto');

var phash = require('./phash');

module.exports = function* (video_url) {
  var hash = calculate(video_url);
  var val = yield redis.get('cache:' + hash);
  if (val) return JSON.parse(val);

  var processing = parseInt(redis.exists('processing:' + hash));
  if (processing) return null;

  var filename = yield download(video_url);
  try {
    // cache for 30 minutes
    yield redis.set('processing:' + hash, '1', 'EX', String(30 * 60));
    var phashes = yield phash(filename);
    phashes = phashes.map(toHex);
    // cache for a week
    yield redis.set('cache:' + hash, JSON.stringify(phashes), 'EX', String(7 * 24 * 60 * 60));
  } finally {
    yield redis.del('processing:' + hash);
  }

  return phashes;
}

function calculate(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function toHex(buf) {
  return buf.toString('hex');
}
