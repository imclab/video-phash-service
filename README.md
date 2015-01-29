
# video-phash-service

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]
[![Gittip][gittip-image]][gittip-url]

Get all the phashes of all the frames of a video.

## GET /:url

```
GET /https://archive.org/download/Windows7WildlifeSampleVideo/Wildlife_512kb.mp4
```

Returns:

```json
[
  "0000000000000000",
  "ffffffffffffffff"
]
```

etc.

## GET /:encryptedUrl

By default, the password is `mgmt`.
Encrypt the URL like so with the secret:

```js
var crypto = require('crypto');

var hostname = 'localhost:3016';
var password = 'mgmt';

function encrypt(url) {
  var cipher = crypto.createCipher('aes256', password);
  var buffers = [];
  buffers.push(cipher.update(url));
  buffers.push(cipher.final());
  return hostname + '/' + Buffer.concat(buffers).toString('hex');
}
```

[gitter-image]: https://badges.gitter.im/mgmtio/video-phash-service.png
[gitter-url]: https://gitter.im/mgmtio/video-phash-service
[npm-image]: https://img.shields.io/npm/v/video-phash-service.svg?style=flat-square
[npm-url]: https://npmjs.org/package/video-phash-service
[github-tag]: http://img.shields.io/github/tag/mgmtio/video-phash-service.svg?style=flat-square
[github-url]: https://github.com/mgmtio/video-phash-service/tags
[travis-image]: https://img.shields.io/travis/mgmtio/video-phash-service.svg?style=flat-square
[travis-url]: https://travis-ci.org/mgmtio/video-phash-service
[coveralls-image]: https://img.shields.io/coveralls/mgmtio/video-phash-service.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/mgmtio/video-phash-service
[david-image]: http://img.shields.io/david/mgmtio/video-phash-service.svg?style=flat-square
[david-url]: https://david-dm.org/mgmtio/video-phash-service
[license-image]: http://img.shields.io/npm/l/video-phash-service.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/video-phash-service.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/video-phash-service
[gittip-image]: https://img.shields.io/gratipay/jonathanong.svg?style=flat-square
[gittip-url]: https://gratipay.com/jonathanong/
