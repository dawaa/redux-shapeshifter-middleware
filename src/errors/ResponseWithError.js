function ResponseWithError(message) {
  this.name = 'ResponseWithError'
  this.message = message
  this.stack = Error().stack
}

export default ResponseWithError
