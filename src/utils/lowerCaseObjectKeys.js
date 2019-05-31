import Result from 'folktale/result'

const lowerCaseObjectKeys = obj => (
  Result.Ok(
    Object.keys( obj )
    .filter(x => x && x.constructor === String)
    .reduce((seq, key) => ({ ...seq, [ key.toLowerCase() ]: obj[ key ] }), {})
  )
)
export default obj => Result.of(obj)
  .chain( x => (
    x && x.constructor === Object
      ? Result.Ok( obj )
      : Result.Error( `Expected passed argument to be of type Object, got instead ${ obj }` )
  ) )
  .chain( lowerCaseObjectKeys )
  .matchWith({
    Ok: ({ value }) => value,
    Error: ({ value }) => ({ error: true, errorMsg: value }),
  })
