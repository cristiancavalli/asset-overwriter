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
var colors = require('colors');
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});
var fs = require('fs');
var stream = require('stream');
var path = require('path');
var Readable = require('stream').Readable
var es = require('event-stream');
var merge = require('lodash.merge');
var noop = require('lodash.noop');
var isFunction = require('lodash.isfunction');

function rewritePackage (pathToPackageFile, newDependencyLocation, cb) {
  var oldData = {};
  var newData = {};
  var pth = path.resolve(process.cwd(), pathToPackageFile);
  return fs.createReadStream(pth).pipe(es.wait())
    .pipe(es.mapSync(function (buf) {
      try {
        merge(oldData, JSON.parse(buf.toString()));
        merge(newData, oldData, {
          dependencies: {
            "google-auth-library": newDependencyLocation
          }
        });
        console.log(colors.info('Package parsed, new package created..'));
        return Buffer.from(JSON.stringify(newData));
      } catch (e) {
        console.log('got e', e);
        done(e, null);
        return;
      }
    }))
    .pipe(es.mapSync(function (buf) {
      console.log(colors.info('Original package file truncated..'));
      fs.truncateSync(pth, 0);
      return buf;
    }))
    .pipe(es.mapSync(function (buf) {
      console.log(
        colors.info('Writing new package contents..'));
      return fs.createWriteStream(pth);
    }))
    .pipe(es.mapSync(function (writeStream) {
      var s = new stream.Readable();
      s._read = noop;
      s.push(JSON.stringify(newData));
      s.push(null);
      s.pipe(writeStream);
      
      return writeStream;
    })).pipe(es.mapSync(function (writeStream) {
      writeStream.on('finish', function () {
        console.log(colors.green('Write finished successfully!!'));
        if(isFunction(cb)) {
          cb(null, {
            oldData: oldData,
            newData: newData,
            path: pth
          });
        }
      });
      return writeStream;
    })).on('error', function (e) {
      console.log(colors.red.underline(
        'Encountered an error trying to overwrite the package'));
      console.log(colors.debug(e));
      if(isFunction(cb)) {
        cb(e, null);
      }
    });
};

module.exports = rewritePackage;
