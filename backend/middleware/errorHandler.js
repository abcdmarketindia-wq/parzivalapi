const { fail } = require('../utils/response');

// Express identifies error handlers by their four parameters, so _next must stay.
function errorHandler(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return fail(res, 400, 'Invalid request body.');
  }
  console.error(`Unhandled error: ${err.name}`);
  fail(res, 500, 'Something went wrong.');
}

module.exports = errorHandler;
