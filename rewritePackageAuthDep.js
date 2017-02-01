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
var every = require('lodash.every');
var noop = require('lodash.noop');
var has = require('lodash.has');
var isObject = require('lodash.isobject');
var isFunction = require('lodash.isfunction');
var findit = require('findit');
var EventEmitter = require('events').EventEmitter;

function overwriteFile (pth, newDependencyLocation, cb) {
  var oldData = {};
  var newData = {};
  return fs.createReadStream(pth).pipe(es.wait())
    .pipe(es.mapSync(function (buf) {
      try {
        merge(oldData, JSON.parse(buf.toString()));
        if (has(oldData, 'dependencies') &&
          has(oldData.dependencies, 'google-auth-library')) {
            console.log(colors.info('Existing package parsed; new package created with new asset location'));
            merge(newData, oldData, {
              dependencies: {
                "google-auth-library": newDependencyLocation
              }
            }); 
        } else {
          console.log(colors.warn('Existing package parsed; package lacked target dependency -- further modification has been omitted'))
          merge(newData, oldData);
        }
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
    }))
    .pipe(es.mapSync(function (writeStream) {
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
    }))
    .on('error', function (e) {
      console.log(colors.red.underline(
        'Encountered an error trying to overwrite the package'));
      console.log(colors.debug(e));
      if(isFunction(cb)) {
        cb(e, null);
      }
    });
}

function overwriteWithinPattern (globPattern, newDependencyLocation, cb) {
  var oldData = [];
  var newData = [];
  var progressGate = new EventEmitter();
  progressGate._finderComplete = false;
  progressGate.isComplete = function () {
    return progressGate._finderComplete &&
      every(newData, ['overwriteComplete', true]);
  }
  progressGate.attemptResolution = function () {
    if (progressGate.isComplete()) {
      cb(null, {
        oldData: oldData,
        newData: newData.map(v => v.data),
        pattern: globPattern
      });
    }
  }
  progressGate.on('finderComplete', function () {
    progressGate._finderComplete = true;
    progressGate.attemptResolution();
  });
  var finder = findit(globPattern.base)
    .on('file', function (file) {
      if (globPattern.pattern.test(file)) {
        var index = newData.length;
        oldData.push({});
        newData.push({
          data: null,
          overwriteComplete: false,
          operator: overwriteFile(file, newDependencyLocation, function (err, data) {
            if (err) {
              throw new Error(err.message);
            }
            newData[index].data = data.newData;
            newData[index].overwriteComplete = true;
            oldData[index] = data.oldData;
            progressGate.attemptResolution();
          })
        });
      }
    })
    .on('end', function () {
      progressGate.emit('finderComplete');
    });
};

function rewritePackage (pathToPackageFile, newDependencyLocation, cb) {
  var pth; 
  if (!isObject(pathToPackageFile)) {
    pth = path.resolve(process.cwd(), pathToPackageFile);
    return overwriteFile(pth, newDependencyLocation, cb);
  }
  pth = merge({}, pathToPackageFile, {base: path.resolve(process.cwd(), pathToPackageFile.base)});
  return overwriteWithinPattern(pth, newDependencyLocation, cb);
};

module.exports = rewritePackage;
