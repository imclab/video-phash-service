
var redis = require('then-redis').createClient(process.env.REDIS_URI
  || 'tcp://localhost:6379');
var download = require('download-cache');
var validator = require('validator');
var crypto = require('crypto');
var koa = require('koa');

var config = require('../config');
var phash = require('./');

var app = module.exports = koa();

app.use(require('koa-favicon')());
app.use(require('koa-compress')());
app.use(require('koa-json-error')());

app.use(function* encrypted(next) {
  var hex = /^\/([0-9a-f]+)$/i.exec(this.path);
  if (!hex) return yield* next;

  var buffers = [];
  var cipher = crypto.createDecipher('aes256', config.password);
  buffers.push(cipher.update(new Buffer(hex[1], 'hex')));
  buffers.push(cipher.final());
  this.video_url = Buffer.concat(buffers).toString();

  yield* next;
});

app.use(function* encoded(next) {
  if (this.video_url || !/^\/http/.test(this.path)) return yield* next;

  this.video_url = decodeURIComponent(this.path.slice(1));

  yield* next;
});

app.use(function* () {
  var url = this.video_url;
  this.assert(url, 400, 'URL required.');
  this.assert(validator.isURL(url) && /^http/.test(url), 400, 'Invalid URL.');

  var hash = calculate(url);

  // already exists
  var val = yield redis.get('cache:' + hash);
  if (val) return this.response.body = JSON.parse(val);

  // processing
  var processing = parseInt(redis.exists('processing:' + hash));
  if (processing) return this.status = 202;

  // download the file
  var filename = yield download(url);
  this.status = 202;

  // set as processing for 30 minutes, then retry
  yield redis.set('processing:' + hash, '1', 'EX', String(30 * 60));

  // process the video
  phash(filename).then(function (phashes) {
    phashes = phashes.map(toHex);
    // cache for a month
    redis.set('cache:' + hash, JSON.stringify(phashes), 'EX', String(config.maxage));
    // unset as processing
    redis.del('processing:' + hash)
  }).catch(function (err) {
    console.error(err.stack);
    // unset as processing
    redis.del('processing:' + hash)
  });
});

function calculate(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function toHex(buf) {
  return buf.toString('hex');
}
