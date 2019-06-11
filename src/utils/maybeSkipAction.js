import Result from 'folktale/result'

export default next => actionOrMsg => {
  if ( actionOrMsg && actionOrMsg.constructor !== String ) {
    return Result.Error( false )
  } else {
    return Result.Error( actionOrMsg )
  }
}
