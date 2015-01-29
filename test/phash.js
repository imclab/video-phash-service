
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
  return co(sbd(url)).then(function (phashes) {
    assert(Array.isArray(phashes));
    phashes.forEach(function (phash) {
      assert(/^[0-9a-f]{16}$/.test(phash));
    });
  });
})

it('should extract phashes again', function () {
  return co(sbd(url)).then(function (phashes) {
    assert(Array.isArray(phashes));
    phashes.forEach(function (phash) {
      assert(/^[0-9a-f]{16}$/.test(phash));
    });
  });
})

it('GET /:url', function (done) {
  request(server)
  .get('/' + encodeURIComponent(url))
  .expect(200)
  .expect('Content-Type', /application\/json/)
  .end(function (err, res) {
    if (err) return done(err);

    var phashes = res.body;
    assert(Array.isArray(phashes));
    phashes.forEach(function (phash) {
      assert(/^[0-9a-f]{16}$/.test(phash));
    });

    done();
  })
})

it('GET /:encryptedUrl', function (done) {
  var cipher = crypto.createCipher('aes256', 'fuiszftw');
  var buffers = [];
  buffers.push(cipher.update(url));
  buffers.push(cipher.final());

  request(server)
  .get('/' + Buffer.concat(buffers).toString('hex'))
  .expect(200)
  .expect('Content-Type', /application\/json/)
  .end(done);
})
