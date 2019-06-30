function MiddlewareOptionsValidationError(message, errors) {
  this.name = 'MiddlewareOptionsValidationError';
  this.message = message;
  this.stack = Error().stack;
  this.errors = errors;
}

export default MiddlewareOptionsValidationError;
