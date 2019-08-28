function InvalidMethodError(message) {
  this.name = 'InvalidMethodError';
  this.message = message;
  this.stack = Error().stack;
}

export default InvalidMethodError;
