// external
import axios, { CancelToken } from 'axios'

// internal
import recursiveObjFind             from './recursiveObjFind'
import { isGeneratorFn }            from './generator'
import defaultMiddlewareOptions from './defaults'
import {
  removeFromStack,
  existsInStack,
} from './callStack'
import * as callStack from './callStack'
import handleResponse from './handleResponse'
import handleETag from './handleETag'
import handleResponseStatus from './handleStatusResponses'
import handleRepeater from './handleRepeater'
import validateAction from './utils/validateAction'
import validateMiddlewareOptions from './utils/validateMiddlewareOptions'
import defineRequestBodyPayload from './utils/defineRequestBodyPayload'
import ResponseNotModified from './errors/ResponseNotModified'
import ResponseRepeatReject from './errors/ResponseRepeatReject'
import NotShapeshifterAction from './errors/NotShapeshifterAction'
import MalformedShapeshifterAction from './errors/MalformedShapeshifterAction'
import MiddlewareOptionsValidationError from './errors/MiddlewareOptionsValidationError'
import InvalidMethodError from './errors/InvalidMethodError'
import isShapeshifterError from './utils/isShapeshifterError'

export let middlewareOpts = {
  ...defaultMiddlewareOptions,
}
export const urlETags = {}

const middleware = (options) => {
  middlewareOpts = validateMiddlewareOptions({
    ...defaultMiddlewareOptions,
    ...options,
  })

  if (middlewareOpts instanceof MiddlewareOptionsValidationError) {
    throw middlewareOpts;
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
    } = middlewareOpts;

    const isValidAction = validateAction( constants.API )( action )

    if ( isValidAction instanceof NotShapeshifterAction ) {
      return next( action )
    } else if ( isValidAction instanceof MalformedShapeshifterAction ) {
      process.env.NODE_ENV !== 'test' && action && console.error(
        `redux-shapeshifter-middleware: ${ isValidAction } ` +
        `=> ${JSON.stringify( action )}`
      )
      return next( action )
    }

    // Prepare to cancel a request
    const source = CancelToken.source()

    const payload = action.payload({
      dispatch,
      state: getState(),
      cancel: source.cancel,
    })

    // Bail if the returned value of payload is not an object
    if ( payload && payload.constructor !== Object ) {
      throw new Error(
        `Received payload as a function but the returned value was not of type object.`
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
        repeat,
        interval = 5000,
        ETagCallback = () => {},
        tapBeforeCall = undefined,
        tapAfterCall = undefined,
        useFullResponseObject = false,
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

    if ( useFullResponseObject != null && useFullResponseObject.constructor !== Boolean ) {
      throw new Error(
        `action.payload.useFullResponseObject is expected to be of type Boolean, got instead ${ useFullResponseObject }`,
      )
    }

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

    const [ REQUEST, SUCCESS, FAILURE ] = action.types

    // Only have one active request per Redux action
    const pendingCall = existsInStack( REQUEST )
    if ( pendingCall !== false ) {
      pendingCall.cancel( `${REQUEST} call was canceled.` )
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

    if ( meta.mergeParams && meta.mergeParams === true ) {
      meta.params = Object.assign( {}, parameters )
    }

    const params = defineRequestBodyPayload( method, parameters )

    if ( params instanceof InvalidMethodError ) {
      throw params
    }

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

    const baseURL = config.baseURL || base || ''
    const url = baseURL + uris

    let _call
    const requestConfig = { url, method, ...params, ...config }

    const _store = { dispatch, state: getState(), getState }

    _call = axios.request( requestConfig )

    const call = _call
      .then((response) => {
        removeFromStack( REQUEST )
        return response
      })
      .then(handleResponseStatus({
        store: _store,
        fallbackToAxiosStatusResponse: middlewareOpts.fallbackToAxiosStatusResponse,
        useOnlyAxiosStatusResponse: middlewareOpts.useOnlyAxiosStatusResponse,
        handleStatusResponses: middlewareOpts.handleStatusResponses,
        customSuccessResponses: middlewareOpts.customSuccessResponses,
      }))
      .then(handleETag({
        dispatch,
        ETags: urlETags,
        path: uris,
        dispatchETagCreationType: middlewareOpts.dispatchETagCreationType,
        useETags: middlewareOpts.useETags,
      }))
      .then(handleResponse({
        store: _store,
        next,
        success,
        failure,
        types: { REQUEST, SUCCESS, FAILURE },
        meta,
        repeat,
        useFullResponseObject,
      }))
      .then(handleRepeater({
        store: _store,
        next,
        requestConfig,
        success,
        failure,
        types: { REQUEST, SUCCESS, FAILURE },
        meta,
        repeat,
        interval,
        useFullResponseObject,
      }))
      .catch( function shapeshifterRequestCatch(error) {
        const isAxiosError = error && error.isAxiosError || false

        if ( isAxiosError ) {
          const isNotModifiedResponse = error.response
            && error.response.status === 304

          if ( isNotModifiedResponse ) {
            const stack = error.stack
            error = new ResponseNotModified( error.message )
            error.stack = stack
          }
        }

        // Remove call from callStack when finished
        removeFromStack( REQUEST )

        if ( error instanceof ResponseNotModified ) {
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

        if ( isAxiosError || isShapeshifterError( error ) ) {
          dispatch( failure( FAILURE, error ) )
        }

        if ( middlewareOpts.warnOnCancellation && axios.isCancel( error ) ) {
          console.warn( error.message );
        } else {
          console.error( axios.isCancel( error ) ? error.message : error )
        }
      })

    // Not sure of its usage atm, but it might be nice to have some where
    if ( typeof tapAfterCall === 'function' ) {
      tapAfterCall( { params: parameters, ...store } )
    }

    return call
  }
}

export default middleware
