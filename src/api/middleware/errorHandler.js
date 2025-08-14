// ZOSAI Error Handler Middleware

const errorHandler = (err, req, res, next) => {
  console.error('🚨 ZOSAI API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let status = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
    code = 'UNAUTHORIZED';
  } else if (err.code === '23505') { // PostgreSQL unique violation
    status = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_RESOURCE';
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    status = 400;
    message = 'Invalid reference';
    code = 'INVALID_REFERENCE';
  }

  // Send error response
  res.status(status).json({
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method
    },
    service: 'ZOSAI API',
    bot: '@zosai_bot',
    support: 'Contact @zosai_support for assistance'
  });
};

module.exports = {
  errorHandler
};