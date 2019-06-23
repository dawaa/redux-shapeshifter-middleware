function ResponseRepeatReject(message) {
  this.name = 'ResponseRepeatReject'
  this.message = message
  this.stack = Error().stack
}

export default ResponseRepeatReject
