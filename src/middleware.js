// external
import axios, { CancelToken } from 'axios'

// internal
import recursiveObjFind                from './recursiveObjFind'
import { isGeneratorFn }               from './generator'
import { API, API_ERROR, API_VOID }    from './consts'
import {
  removeFromStack,
  existsInStack
} from './callStack'
import * as callStack from './callStack'

const defaultMiddlewareOpts = {
  base: '',
  constants: {
    API,
    API_ERROR,
    API_VOID
  },
  handleStatusResponses: null,
  fallbackToAxiosStatusResponse: true,
  customSuccessResponses: null,
  useOnlyAxiosStatusResponse: false,
  useETags: false,
  emitRequestType: false,
}

export let middlewareOpts = {}
export const urlETags = {}

const middleware = (options) => {
  middlewareOpts = {
    ...defaultMiddlewareOpts,
    ...options
  }

  // Clear trailing slash
  middlewareOpts.base = middlewareOpts.base.replace( /\/$/, '' )

  /**
   * Our middleware starts here
   *
   * @return Promise
   */
  return ({ dispatch, getState }) => next => action => {
    const {
      base,
      constants,
      fallbackToAxiosStatusResponse,
      useOnlyAxiosStatusResponse,
    } = middlewareOpts;

    // Bail if action is corrupt
    if ( !action ) {
      return next();
    }

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

    // Prepare to cancel a request
    const source = CancelToken.source()

    const payload = action.payload({
      dispatch,
      state: getState(),
      cancel: source.cancel,
    })

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
          message: `${ type } failed.`,
          error
        }),
        ETagCallback = () => {},
        tapBeforeCall = undefined,
        tapAfterCall = undefined
      },
      meta = {
        dispatch,
        getState,
        state: getState()
      },
      axios: axiosConfig = {
        cancelToken: source.token
      }
    } = action;

    if ( middlewareOpts.useETags && urlETags[ uris ] ) {
      axiosConfig.headers = axiosConfig.headers || {}
      if ( middlewareOpts.matchingETagHeaders
        && middlewareOpts.matchingETagHeaders.constructor === Function ) {
        const ETagHeaders = middlewareOpts.matchingETagHeaders({
          ETag: urlETags[ uris ],
          dispatch,
          state: getState(),
          getState,
        })

        if ( typeof ETagHeaders !== 'object' ) {
          throw new Error(
            `Received ETagHeaders as a function but the returned value was not of type object.`
          )
        }

        axiosConfig.headers = {
          ...axiosConfig.headers,
          ...ETagHeaders,
        }
      } else {
        axiosConfig.headers[ 'If-None-Match' ] = urlETags[ uris ]
        axiosConfig.headers[ 'Cache-Control' ] = 'private, must-revalidate'
      }
    }

    let REQUEST, SUCCESS, FAILURE;
    if ( action.payload.types && action.payload.types.constructor === Array ) {
      [ REQUEST, SUCCESS, FAILURE ] = action.payload.types
    }

    if ( action.types && action.types.constructor === Array ) {
      [ REQUEST, SUCCESS, FAILURE ] = action.types
    }

    // Only have one active request per Redux action
    const pendingCall = existsInStack( REQUEST )
    if ( pendingCall !== false ) {
      pendingCall.cancel( `${REQUEST} call was cancelled.` )
    }

    // Add call to callStack
    callStack.addToStack({ call: REQUEST, token: source.token, cancel: source.cancel })

    if ( middlewareOpts.emitRequestType ) {
      dispatch({ type: REQUEST })
    }

    // Append current logged in user's session id to the call
    let authHeaders = false
    if ( middlewareOpts.hasOwnProperty( 'auth' ) && auth ) {
      if ( middlewareOpts.auth.hasOwnProperty( 'headers' ) ) {
        authHeaders    = true

        const tokenRgx = /#(\w+\.?)+/g
        const store    = getState()
        Object.keys( middlewareOpts.auth.headers ).map((header) => {
          middlewareOpts.auth.headers[ header ] = middlewareOpts.auth.headers[ header ]
            .replace( tokenRgx, (match) => {
              const m    = match.substr( 1 ).split( '.' )
              const prop = m.shift()

              let _storeVal = store[ prop ]
              while ( _storeVal != null && m.length ) {
                _storeVal = _storeVal[ m.shift() ]
              }

              return _storeVal
            } )
        })
      } else {
        const findings = recursiveObjFind( getState(), middlewareOpts.auth )

        if ( findings !== false ) {
          for ( let prop in findings ) {
            parameters[ prop ] = findings[ prop ]
          }
        }
      }
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

    const params = method === 'post' ? parameters : { params: parameters }

    const config = Object.assign(
      {},
      axiosConfig,
      (
        axiosConfig.headers || authHeaders
        ?
          {
            headers: {
              ...(axiosConfig.headers ? axiosConfig.headers : {}),
              ...(authHeaders ? middlewareOpts.auth.headers : {}),
            }
          }
        :
          {}
      )
    )

    const baseURL = (
      base.length > 0
        ? base
        : config.baseURL != null && config.baseURL.length > 0
          ? config.baseURL
          : ''
    )
    const url = baseURL + uris

    let _call

    // Check if method can contain data and a config
    if ( [ 'post', 'put', 'patch' ].indexOf( method.toLowerCase() ) !== -1 ) {
      _call = axios[ method ]( url, params, config )

    } else if ( 'request' === method.toLowerCase() ) {
      _call = axios[ method ]( config )

    } else {
      _call = axios[ method ]( url, Object.assign( params, config ) )
    }

    _call.then( async (response) => {
      if ( typeof response.data !== 'object' ) {
        if ( typeof response.data === 'string' ) {
          return Promise.reject( response.data )
        }
        return Promise.reject( 'Something went wrong with the API call.' )
      }

      const { data, headers = {} } = response
      const { errors, error }      = data

      const normalizedHeaders = {}

      Object.keys( headers ).forEach( headerKey => {
        const header = headers[ headerKey ]
        normalizedHeaders[ headerKey.toLowerCase() ] = header
      } )

      if ( middlewareOpts.useETags && normalizedHeaders.etag ) {
        urlETags[ uris ] = normalizedHeaders.etag

        if ( middlewareOpts.dispatchETagCreationType ) {
          dispatch({
            type: middlewareOpts.dispatchETagCreationType,
            ETag: normalizedHeaders.etag,
            key: uris,
          })
        }
      }

      // Try catching the response status from the API call, otherwise
      // fallback to Axios own status response.
      const status = (
        fallbackToAxiosStatusResponse && ! useOnlyAxiosStatusResponse
          ? ( data.status || response.status )
          : (
            useOnlyAxiosStatusResponse
              ? response.status
              : data.status
          )
      )

      if ( typeof middlewareOpts.handleStatusResponses === 'function' ) {
        const statusHandled = await middlewareOpts.handleStatusResponses( response, store )
          .then(
            // Resolve
            () => {
              return true
            },
            // Reject
            (err) => {
              return Promise.reject( err )
            }
          )

        if ( statusHandled.constructor === Promise ) {
          return statusHandled
        }
      } else if ( status !== 200
        && status !== 201
        && status !== 204 ) {
        // If we have a custom success response and we received one that fits
        // our array
        if ( middlewareOpts.customSuccessResponses != null
          && middlewareOpts.customSuccessResponses.constructor === Array
          && middlewareOpts.customSuccessResponses.indexOf( status ) !== -1 ) {
          // .. code
        } else {
          return Promise.reject( response )
        }
      }

      /**
       * In case we don't have a custom status reponse handler we will
       * by default look for the keys `error` or `errors` in the response
       * object to see if we should deal with them.
       */
      if ( typeof middlewareOpts.handleStatusResponses !== 'function' ) {
        if ( error !== undefined
          && error !== null
          && error.constructor === String
          && errors instanceof Array === false ) {
          return Promise.reject( error )
        }

        if (
          errors !== undefined
          && errors !== null
          && errors.constructor === Array
          && errors.length > 0 ) {
          return Promise.reject( errors )
        }
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

      // Remove call from callStack when finished
      removeFromStack( REQUEST )

      dispatch( success( SUCCESS, response.data, meta, store ) )
      })
      .catch( error => {
        // Remove call from callStack when finished
        removeFromStack( REQUEST )

        if ( error && error.response && error.response.status === 304 ) {
          const cb = ETagCallback

          if ( cb.constructor === Object ) {
            return dispatch( cb )
          } else if ( cb.constructor === Function ) {

            return cb({
              type : REQUEST,
              path : uris,
              ETag : urlETags[ uris ],
              ...(store === null ? meta : store)
            })
          }

          return
        }

        dispatch( failure( FAILURE, error ) )
      })


    // Not sure of its usage atm, but it might be nice to have some where
    if ( typeof tapAfterCall === 'function' ) {
      tapAfterCall( { params: parameters, ...store } )
    }

    return _call
  }
}

export default middleware
