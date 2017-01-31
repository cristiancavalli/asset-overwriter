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

var argv = require('yargs').argv;
var rewritePackageAuthDep = require('./rewritePackageAuthDep.js');

if (!argv.target) {
  throw new Error('Must provide a new target to point to via --target option');
} else if (!argv.package) {
  throw new Error('Must provide a package path to overwrite via --package option');
}

rewritePackageAuthDep(argv.package, argv.target, function (e, output) {
  if (e) {
    console.log('Encountered Error:');
    console.log(e);
    return;
  }
  console.log('Write complete; new package contents:');
  console.log(JSON.stringify(output.newData, null, 2));
});
