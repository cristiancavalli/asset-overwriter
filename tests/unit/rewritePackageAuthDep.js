/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var assert = require('assert');
var stream = require('stream');
var fs = require('fs');
var path = require('path');
var merge = require('lodash.merge');
var noop = require('lodash.noop');
var rewritePackageAuthDep = require('../../rewritePackageAuthDep.js');
var newUrl = 'git://github.com/cristiancavalli/google-auth-library-nodejs.git#replace-with-raw-http';

describe('Overwriting the google-auth-library depedency', function () {
  var pth = path.resolve('./tests/fixtures/standard-package.json');
  var originalContents;
  before(function () {
    originalContents = fs.readFileSync(pth);
    originalContents = originalContents.toString();
    originalContents = JSON.parse(originalContents);
  });
  after(function () {
    fs.truncateSync(pth, 0);
    var s = merge(new stream.Readable(), {_read: noop});
    s.push(JSON.stringify(originalContents, null, 2));
    s.push(null);
    s.pipe(fs.createWriteStream(pth));
  });
  it('Should overwrite the fixture', function (done) {
    rewritePackageAuthDep(pth, 
      newUrl,
      function (output) {
        assert.strictEqual(output.newData.dependencies['google-auth-library'],
          newUrl);
        done();
      }
    );
  });
});
