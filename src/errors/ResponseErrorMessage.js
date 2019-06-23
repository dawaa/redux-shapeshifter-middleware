function ResponseErrorMessage(message) {
  this.name = 'ResponseErrorMessage'
  this.message = message
  this.stack = Error().stack
}

export default ResponseErrorMessage
