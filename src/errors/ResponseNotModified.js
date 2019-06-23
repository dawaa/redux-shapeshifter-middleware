function ResponseNotModified(message) {
  this.name = 'ResponseNotModified'
  this.message = message
  this.stack = Error().stack
}

export default ResponseNotModified
