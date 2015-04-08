'use strict'

const redis = require('then-redis').createClient(process.env.REDIS_URI
  || 'tcp://localhost:6379')
const download = require('download-cache')
const validator = require('validator')
const crypto = require('crypto')
const koa = require('koa')

const config = require('../config')
const phash = require('./')

const app = module.exports = koa()

app.use(require('koa-favicon')())
app.use(require('koa-compress')())
app.use(require('koa-json-error')())

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

app.use(function* encoded(next) {
  if (this.video_url || !/^\/http/.test(this.path)) return yield* next

  this.video_url = decodeURIComponent(this.path.slice(1))

  yield* next
})

app.use(function* () {
  let url = this.video_url
  this.assert(url, 400, 'URL required.')
  this.assert(validator.isURL(url) && /^http/.test(url), 400, 'Invalid URL.')

  let hash = calculate(url)

  // already exists
  let val = yield redis.get('cache:' + hash)
  if (val) {
    // reset the expire
    yield redis.expire('cache:' + hash, String(config.maxage))
    this.response.body = JSON.parse(val)
    return
  }

  // processing
  let processing = parseInt(redis.exists('processing:' + hash))
  if (processing) return this.status = 202

  // download the file
  let filename = yield download(url)
  this.status = 202

  // set as processing for 30 minutes, then retry
  yield redis.set('processing:' + hash, '1', 'EX', String(30 * 60))

  // process the video
  phash(filename).then(function (phashes) {
    phashes = phashes.map(toHex)
    // cache for a month
    redis.set('cache:' + hash, JSON.stringify(phashes), 'EX', String(config.maxage))
    // unset as processing
    redis.del('processing:' + hash)
  }).catch(function (err) {
    console.error(err.stack)
    // unset as processing
    redis.del('processing:' + hash)
  })
})

function calculate(url) {
  return crypto.createHash('sha256').update(url).digest('hex')
}

function toHex(buf) {
  return buf.toString('hex')
}
