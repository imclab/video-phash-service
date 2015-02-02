
var request = require('supertest');
var assert = require('assert');
var crypto = require('crypto');
var co = require('co');

var server = require('../lib/app').listen();
var sbd = require('..');

var url = 'https://archive.org/download/Windows7WildlifeSampleVideo/Wildlife_512kb.mp4';

before(function () {
  var redis = require('then-redis').createClient(process.env.REDIS_URI || 'tcp://localhost:6379');

  return redis.flushall();
})

it('should extract phashes', function () {
  return sbd(url).then(function (phashes) {
    assert(Array.isArray(phashes));
    phashes.forEach(function (phash) {
      assert(Buffer.isBuffer(phash));
      assert(phash.length === 8);
    });
  });
})

it('GET /:url', function (done) {
  next();

  function next() {
    request(server)
    .get('/' + encodeURIComponent(url))
    .end(function (err, res) {
      if (err) return done(err);
      if (res.statusCode === 202) return setTimeout(next, 5000);

      var phashes = res.body;
      assert(Array.isArray(phashes));
      phashes.forEach(function (phash) {
        assert(/^[0-9a-f]{16}$/.test(phash));
      });

      done();
    })
  }
})

it('GET /:encryptedUrl', function (done) {
  var cipher = crypto.createCipher('aes256', require('../config').password);
  var buffers = [];
  buffers.push(cipher.update(url));
  buffers.push(cipher.final());

  next();
  function next() {
    request(server)
    .get('/' + Buffer.concat(buffers).toString('hex'))
    .end(function (err, res) {
      if (err) return done(err);
      if (res.statusCode === 202) return setTimeout(next, 5000);

      var phashes = res.body;
      assert(Array.isArray(phashes));
      phashes.forEach(function (phash) {
        assert(/^[0-9a-f]{16}$/.test(phash));
      });

      done();
    });
  }
})
