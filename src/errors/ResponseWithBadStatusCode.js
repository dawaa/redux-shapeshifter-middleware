function ResponseWithBadStatusCode(message) {
  this.name = 'ResponseWithBadStatusCode';
  this.message = message;
  this.stack = Error().stack;
}

export default ResponseWithBadStatusCode;
