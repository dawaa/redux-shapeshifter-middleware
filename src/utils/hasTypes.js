import Result from 'folktale/result'

export default action => (
  action.types && action.types.constructor === Array
    ? action.types.length === 3
      ? Result.Ok( action )
      : Result.Error( '`types` property should contain a Neutral, Success and Failure value' )
    : Result.Error( '`types` property is missing' )
)
