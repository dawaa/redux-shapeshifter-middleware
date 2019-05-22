import Result from 'folktale/result'

export default next => actionOrMsg => {
  if ( actionOrMsg.constructor === Object ) {
    next( actionOrMsg )
    return Result.Error( false )
  } else {
    return Result.Error( actionOrMsg )
  }
}
