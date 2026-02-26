function notFoundHandler(req, res) {
  return res.status(404).json({
    error: 'not_found',
    message: 'Resource not found.'
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    error: 'internal_server_error',
    message: 'Something went wrong.'
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
