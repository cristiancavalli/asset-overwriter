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
var every = require('lodash.every');
var noop = require('lodash.noop');
var rewritePackageAuthDep = require('../../rewritePackageAuthDep.js');
var newUrl = 'git://github.com/cristiancavalli/google-auth-library-nodejs.git#replace-with-raw-http';

describe('Overwriting multiple google-auth-library dependencies', function () {
  var paths = [
    './tests/fixtures/nested/package.json',
    './tests/fixtures/nested/nested2/package.json',
    './tests/fixtures/nested/nested2/nested3/package.json'
  ];
  var originalContents = {
    withTarget: null,
    withoutTarget: null
  };
  before(function () {
    originalContents.withTarget = JSON.parse(fs.readFileSync(paths[0]).toString());
    originalContents.withoutTarget = JSON.parse(fs.readFileSync(paths[2]).toString());
  });
  after(function () {
    paths.map(function (pth, i) {
      fs.truncateSync(pth, 0);
      var s = merge(new stream.Readable(), {_read: noop});
      var contents = (i < 2) ? originalContents.withTarget :
        originalContents.withoutTarget;
      s.push(JSON.stringify(contents, null, 2));
      s.push(null);
      s.pipe(fs.createWriteStream(pth));
    });
  });
  it('Should overwrite each nested fixture matching pattern', function (done) {
    rewritePackageAuthDep(
      {pattern: /package\.json/, base: './tests/fixtures/nested/'},
      newUrl,
      function (e, output) {
        assert(every(output.newData.slice(0, 2), function (v) {
          return v.dependencies['google-auth-library'] === newUrl;
        }));
        done();
      }
    );
  });
});
