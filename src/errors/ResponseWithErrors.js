function ResponseWithErrors(message) {
  this.name = 'ResponseWithErrors';
  this.message = message;
  this.stack = Error().stack;
}

export default ResponseWithErrors;
