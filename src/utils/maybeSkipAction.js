import Result from 'folktale/result'

export default next => actionOrMsg => {
  if ( actionOrMsg && actionOrMsg.constructor !== String ) {
    next( actionOrMsg )
    return Result.Error( false )
  } else {
    return Result.Error( actionOrMsg )
  }
}
