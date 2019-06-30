function MalformedShapeshifterAction(message, errors) {
  this.name = 'MalformedShapeshifterAction';
  this.message = message;
  this.stack = Error().stack;
  this.errors = errors;
}

export default MalformedShapeshifterAction;
