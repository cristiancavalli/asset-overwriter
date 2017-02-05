const argv = require('yargs').argv;
const spawn = require('child_process').spawn;
const got = require('got');
const PR_URL = argv.pr;
const COMMENTS_URL = PR_URL.replace('/pulls/', '/issues/').concat('/comments');
const BUILD_FAILED = 'INTEGRATION TESTS FAILED';
const BUILD_PASSED = 'INTEGRATION TESTS PASSED';
const TEST_FOR_FAILURE = /test failed/i;
const reported = (function () {
  var _reported = false;
  const _get = () => _reported;
  _get.flip = () => _reported = true;
  return _get;
})();


function addComment (comment) {
  console.log('Sending comment to:\n\t', COMMENTS_URL);
  got.post(COMMENTS_URL, {
    body: JSON.stringify({body: comment}),
    json: true,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'Authorization': 'Basic '+process.env.GH_TOKEN
    }
  })
  .then((response) => {
    console.log('Comment posted!');
    console.log('Got reponse\n', response);
  })
  .catch((error) => {
    console.warn('Got error trying to post comment');
    console.error(error)
  });
}

if (!PR_URL) {
  throw new Error('Must supply a pull request url via --pr=url option');
}

console.log('Got PR url:\n\t', PR_URL);
const s = spawn('npm', ['test'])
  .on('error', function (e) {
    reported.flip();
    console.warn('Build failed!');
    console.warn('Got an error:');
    console.error(e);
    addComment(BUILD_FAILED);
  })
  .on('close', function () {
    if (!reported()) {
      console.log('Build passed!');
      reported.flip();
      addComment(BUILD_PASSED)
    }
  });
  s.stdout.pipe(process.stdout);
  s.stderr.on('data', function (c) {
    if (TEST_FOR_FAILURE.test(c.toString())) {
      reported.flip();
      addComment(BUILD_FAILED);
      console.warn('\nBuild failed!\n');
    }
    process.stderr.write(c);
  });
