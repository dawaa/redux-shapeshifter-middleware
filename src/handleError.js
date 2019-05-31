import { removeFromStack } from './callStack'
import { urlETags } from './middleware'

export default dispatch => ETagCallback => opts => error => {
  const {
    types: { REQUEST, FAILURE },
    failure,
    uri,
    store,
  } = opts

  removeFromStack( REQUEST )

  if ( error && error.response && error.response.status === 304 ) {
    const cb = ETagCallback

    if ( cb.constructor === Object ) {
      return dispatch( cb )
    } else if ( cb.constructor === Function ) {

      return cb({
        type : REQUEST,
        path : uri,
        ETag : urlETags[ uri ],
        ...store,
      })
    }

    return
  }

  dispatch( failure( FAILURE, error ) )
  throw new Error( error )
}
