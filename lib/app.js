'use strict'

const download = require('download-cache')
const hashStream = require('hash-stream')
const validator = require('validator')
const crypto = require('crypto')
const koa = require('koa')

const phash = require('./phash-file')
const config = require('../config')
const redis = require('./redis')

const app = module.exports = koa()

app.use(require('koa-favicon')())
app.use(require('koa-compress')())
app.use(require('koa-json-error')())

/**
 * Parse the encrypted URL.
 */

app.use(function* encrypted(next) {
  let hex = /^\/([0-9a-f]+)$/i.exec(this.path)
  if (!hex) return yield* next

  let buffers = []
  let cipher = crypto.createDecipher('aes256', config.password)
  buffers.push(cipher.update(new Buffer(hex[1], 'hex')))
  buffers.push(cipher.final())
  this.video_url = Buffer.concat(buffers).toString()

  yield* next
})

/**
 * Decode the encoded URL.
 */

app.use(function* encoded(next) {
  if (this.video_url || !/^\/http/.test(this.path)) return yield* next

  this.video_url = decodeURIComponent(this.path.slice(1))

  yield* next
})

/**
 * Check whether this video has already been processed
 * or is currently being processed.
 * If neither, then actually process the video.
 */

app.use(function* () {
  let url = this.video_url
  this.assert(url, 400, 'URL required.')
  this.assert(validator.isURL(url) && /^http/.test(url), 400, 'Invalid URL.')

  // url-based hash
  let hash = calculate(url)

  // already exists
  if (yield* exists(this, hash)) return

  // processing
  if (yield* processing(this, hash)) return

  // download the file
  let filename = yield download(url)

  // sha256-based hash
  let sha = toHex(yield hashStream(filename, 'sha256'))

  // already exists
  if (yield* exists(this, sha)) return

  // processing
  if (yield* processing(this, sha)) return

  this.status = 202

  // set as processing for 5 minutes, then retry
  redis.mset('processing:' + hash, '1', 'EX', String(5 * 60))
  redis.mset('processing:' + sha, '1', 'EX', String(5 * 60))

  // process the video
  phash(filename).then(function (phashes) {
    phashes = JSON.stringify(phashes.map(toHex))
    // cache for a month
    redis.set('cache:' + hash, phashes, 'EX', String(config.maxage))
    redis.set('cache:' + sha, phashes, 'EX', String(config.maxage))
    // unset as processing
    redis.del('processing:' + hash)
    redis.del('processing:' + sha)
  }).catch(/* istanbul ignore next */ function (err) {
    console.error(err.stack)
    // unset as processing
    redis.del('processing:' + hash)
    redis.del('processing:' + sha)
  })
})

/**
 * Check whether a value for a hash exists.
 */

function* exists(ctx, hash) {
  let val = yield redis.get('cache:' + hash)
  if (!val) return
  // reset the expire
  yield redis.expire('cache:' + hash, String(config.maxage))
  return ctx.response.body = JSON.parse(val)
}

/**
 * Check if a phash process is running for a hash.
 */

function* processing(ctx, hash) {
  let val = parseInt(redis.exists('processing:' + hash))
  if (val) return ctx.response.status = 202
}

/**
 * Calculate the sha256 of url.
 */

function calculate(url) {
  return crypto.createHash('sha256').update(url).digest('hex')
}

/**
 * Convert a buffer to hex.
 */

function toHex(buf) {
  return buf.toString('hex')
}
