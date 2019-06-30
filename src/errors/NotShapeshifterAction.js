function NotShapeshifterAction(message) {
  this.name = 'NotShapeshifterAction'
  this.message = message
  this.stack = Error().stack
}

export default NotShapeshifterAction
