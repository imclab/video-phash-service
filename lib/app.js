
var validator = require('validator');
var crypto = require('crypto');
var koa = require('koa');

var password = require('../config').password;
var phashes = require('./');

var app = module.exports = koa();

app.use(require('koa-favicon')());
app.use(require('koa-compress')());
app.use(require('koa-json-error')());

app.use(function* encrypted(next) {
  var hex = /^\/([0-9a-f]+)$/i.exec(this.path);
  if (!hex) return yield* next;

  var buffers = [];
  var cipher = crypto.createDecipher('aes256', password);
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
  this.assert(url && validator.isURL(url) && /^http/.test(url), 400, 'Invalid URL.');

  var result = yield phashes(url);
  if (result === null) return this.status = 202;
  this.body = result;
});
