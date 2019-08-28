function HandleStatusResponsesInvalidReturn(message) {
  this.name = 'HandleStatusResponsesInvalidReturn';
  this.message = message;
  this.stack = Error().stack;
}

export default HandleStatusResponsesInvalidReturn;
