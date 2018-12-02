import { middlewareOpts }  from './middleware'
import { removeFromStack } from './callStack'

export default store => next => response => ({ success, types, meta }) => {
  const {
    constants: {
      API_VOID,
    },
  } = middlewareOpts

  const {
    REQUEST,
    SUCCESS,
  } = types

  return new Promise((resolve, reject) => {
    let gen = success(
      SUCCESS,
      response.data,
      meta,
      (meta.getState && typeof meta.getState === 'function' ? null : store),
    )

    const _resolve = data => {
      try {
        let it = gen.next( data )
        _iterate( it )
      } catch (e) {
        reject( e )
      }
    }

    const _reject = error => {
      try {
        _iterate( gen.throw( error ) )
      } catch (e) {
        reject( e )
      }
    }

    const _iterate = it => {
      let { done, value } = it || {}

      if ( done === true ) {
        // Remove call from callStack when finished
        removeFromStack( REQUEST )

        if ( value === undefined ) {
          return resolve({ type: API_VOID, LAST_ACTION: REQUEST })
        }

        return resolve( value )
      }

      // If we are dealing with a generator function
      if ( value.then && typeof value.then === 'function' ) {
        Promise.resolve( value ).then( _resolve, _reject )

        // If value is function
      } else if ( typeof value === 'function' ) {
        try {
          _resolve( value() )
        } catch (e) {
          _reject( e )
        }

        // If all else fails
      } else {
        _resolve( value )
      }
    }

    // Kick it Stevie Wonder!
    _resolve()
  })
    .then( next, error => {
      // Remove call from callStack when finished
      removeFromStack( REQUEST )

      console.error( `Generator ACTION had an error ==> ${ error }` )
    } )
}
