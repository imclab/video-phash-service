'use strict'

/**
 * This is the actual phash logic, separated into a separate module.
 * This should be run in a separate process so that it does not block the event loop.
 */

const debug = require('debug')('video-phash-service:phash')
const exec = require('mz/child_process').execFile
const rimraf = require('rimraf-then')
const phash = require('phash-image')
const random = require('temp-path')
const assert = require('assert')
const path = require('path')
const fs = require('mz/fs')

module.exports = function phashes(filename) {
  let files
  debug('phashing %s', filename)
  // random folder to save the thumbnails
  const folder = random()
  // make working directory
  return fs.mkdir(folder).then(function () {
    // save all the thumbnails
    return exec('ffmpeg', [
      '-i',
      filename,
      folder + '/%d.jpg',
    ])
  }).then(function () {
    debug('extracted thumbnails')
    // read all the files in the temp folder
    return fs.readdir(folder)
  }).then(function (_files) {
    files = _files
    assert(files.length > 1)
    // filter and sort by frame index number, ascending
    files = files.filter(isFrameImage).sort(ascendingFrame)
    // make it an absolute path
    files = files.map(function (file) {
      return path.join(folder, file)
    })
    debug('frames: %s', files.length)
    // return the phashes
    return Promise.all(files.map(phash))
  }).then(function (phashes) {
    debug('calculated phashes')
    rimraf(folder).catch(onerror)
    return phashes
  }).catch(/* istanbul ignore next */ function (err) {
    // delete the folder on any error
    rimraf(folder).catch(onerror)
    throw err
  })
}

function isFrameImage(image) {
  return /^(\d+)\.jpg$/.test(image)
}

function ascendingFrame(a, b) {
  return frameIndexOf(a) - frameIndexOf(b)
}

function frameIndexOf(image) {
  return parseInt(/^(\d+)\.jpg$/.exec(image)[1])
}

/* exported onerror */
/* istanbul ignore next */
function onerror(err) {
  console.error(err.stack)
}
