import Result from 'folktale/result'

export default action => (
  action.payload && action.payload.constructor === Function
    ? Result.Ok( action )
    : Result.Error(
      action.types[ 0 ] +
      ' `payload` property is either missing or not of type Function'
    )
)
