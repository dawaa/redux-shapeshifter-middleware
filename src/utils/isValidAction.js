import Result from 'folktale/result'

export default action => (
  action && action.constructor === Object
    ? action.type && action.type.constructor === String
        ? Result.Ok( action )
        : Result.Error( '`type` property is missing' )
    : Result.Error( 'Received malformed action' )
)
