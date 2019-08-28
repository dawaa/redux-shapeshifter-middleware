function HandleStatusResponseRejected(message) {
  this.name = 'HandleStatusResponseRejected';
  this.message = message;
  this.stack = Error().stack;
}

export default HandleStatusResponseRejected;
