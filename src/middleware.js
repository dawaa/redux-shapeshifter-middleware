// external
import axios from 'axios'
import qs    from 'qs'

// internal
import { isGeneratorFn }            from './generator'
import { API, API_ERROR, API_VOID } from './consts'

const defaultMiddlewareOpts = {
  base: '',
  constants: {
    API,
    API_ERROR,
    API_VOID
  }
}

const middleware = (options) => {
  const middlewareOpts = {
    ...defaultMiddlewareOpts,
    ...options
  }

  // Clear trailing slash
  middlewareOpts.base = middlewareOpts.base.replace( /\/$/, '' )

  return ({ dispatch, getState }) => next => action => {
    const { base, constants } = middlewareOpts;

    // Bail if not an API action
    if ( action.type !== constants.API ) return next( action )

    // Bail if action is missing `payload` property
    // Bail if `payload` property is not a function
    if ( ! action.payload || typeof action.payload !== 'function' ) {
      
      if ( action.types && action.types.constructor === Array ) {
        const [ REQUEST, SUCCESS, FAILURE ] = action.types

        if ( ! action.payload ) {
          console.error(`redux-shapeshifter-middleware:
  => ${ REQUEST } === action was called but was missing property 'payload'.`)
          return next( action )
        }

        if ( typeof action.payload !== 'function' ) {
          console.error(`redux-shapeshifter-middleware:
  => ${ REQUEST } === action was called but property 'payload' was not of type function.`)
          return next( action )
        }
      }

      if ( ! action.payload ) {
        console.error(`redux-shapeshifter-middleware:
  => An API action was called but was missing property 'payload'.`)
        return next( action )
      }

      if ( typeof action.payload !== 'function' ) {
          console.error(`redux-shapeshifter-middleware:
  => An API action was called but property 'payload' was not of type function.`)
        return next( action )
      }
    }

    const payload = action.payload({ dispatch, state: getState() })

    // Bail if the returned value of payload is not an object
    if ( typeof payload !== 'object' ) {
      throw new Error(
        `Received payload as a function but the returned value was not of type object.`
      )
    }

    if ( payload.types ) {
      console.warn(
        `DEPRECATED: payload.types is deprecated. Instead, move the property ` +
        `one level up, outside of the payload function that returns an object.` +
        `
            The payload.types will stop working in a near future.`
      )
    }

    action.payload = payload



    // Everything is OK



    const {
      method = 'get',
      payload: {
        url: uris,
        params: parameters = {},
        auth,
        success = () => {},
        failure = (type, error) => ({
          type: constants.API_ERROR,
          message: `${ type } failed.. lol`,
          error
        }),
        tapBeforeCall = undefined,
        tapAfterCall = undefined
      },
      meta = {
        dispatch,
        getState,
        state: getState()
      }
    } = action;

    let REQUEST, SUCCESS, FAILURE;
    if ( action.payload.types && action.payload.types.constructor === Array ) {
      [ REQUEST, SUCCESS, FAILURE ] = action.payload.types
    }

    if ( action.types && action.types.constructor === Array ) {
      [ REQUEST, SUCCESS, FAILURE ] = action.types
    }

    // Append current logged in user's session id to the call
    if ( auth ) {
      parameters.sessionid = getState().user.sessionid;
    }

    let store = { dispatch, state: getState(), getState };

    // In case we want to do something with our request just right before
    // we send out an ajax call
    if ( typeof tapBeforeCall === 'function' ) {
      // Merge `parameters` with all key-values from `store`
      tapBeforeCall( { params: parameters, ...store } )
    }

    // If nothing was passed in to `meta` key in our action it will be
    // replaced with store actions, and so because of that we set `store`
    // to be undefined
    if ( meta.getState && typeof meta.getState === 'function' ) {
      store = null
    }

    if ( meta.mergeParams && meta.mergeParams === true ) {
      meta.params = Object.assign( {}, parameters )
    }

    const params = method === 'post' ? qs.stringify( parameters ) : { params: parameters }


    const url = base + uris

    axios[ method ]( url, params )
      .then( response => {
        if ( typeof response.data !== 'object' ) {
          if ( typeof response.data === 'string' ) {
            return Promise.reject( response.data )
          }
          return Promise.reject( 'Something went wrong with the API call.' )
        }


        const { data }           = response
        const { status, errors } = data

        if ( status !== 200 && status !== 201 && status !== 204 ) {
          return Promise.reject( JSON.stringify( errors ) )
        }

        /**
         * Handle generator functions
         */
        if ( isGeneratorFn( success ) ) {
          return new Promise(( resolve, reject ) => {
            let gen = success( SUCCESS, response.data, meta, store )

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
            console.error( `Generator ACTION had an error ==> ${ error }` )
          } )
        }

        dispatch( success( SUCCESS, response.data, meta, store ) )
      })
      .catch( error => dispatch( failure( FAILURE, error ) ) )


    // Not sure of its usage atm, but it might be nice to have some where
    if ( typeof tapAfterCall === 'function' ) {
      tapAfterCall( { params: parameters, ...store } )
    }
  }
}

export default middleware
