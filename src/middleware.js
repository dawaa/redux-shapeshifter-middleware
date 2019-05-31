// external
import axios, { CancelToken } from 'axios'

// internal
import recursiveObjFind             from './recursiveObjFind'
import { isGeneratorFn }            from './generator'
import { API, API_ERROR, API_VOID } from './consts'
import {
  removeFromStack,
  existsInStack
} from './callStack'
import * as callStack from './callStack'
import handleResponse from './handleResponse'
import handleHeadersFn from './handleHeaders'
import handleRepeaterFn from './handleRepeater'
import validateAction from './utils/validateAction'
import validateMiddlewareOptions from './utils/validateMiddlewareOptions'
import defineBodyPayload from './utils/defineBodyPayload'

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
  useFullResponseObject: false,
}

export let middlewareOpts = {}
export const urlETags = {}

const middleware = (options) => {
  middlewareOpts = validateMiddlewareOptions({
    ...defaultMiddlewareOpts,
    ...options,
  })

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

    const isValidAction = validateAction( constants.API )( next )( action )

    if ( isValidAction && isValidAction.constructor === String ) {
      process.env.NODE_ENV !== 'test' && action && console.error(
        `redux-shapeshifter-middleware: ${ isValidAction } ` +
        `=> ${JSON.stringify( action )}`
      )
      return
    } else if ( ! isValidAction ) {
      return
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

    if ( meta.mergeParams && meta.mergeParams === true ) {
      meta.params = Object.assign( {}, parameters )
    }

    const params = defineBodyPayload( method, parameters ).matchWith({
      Ok: ({ value }) => value,
      Error: ({ value }) => ({ error: true, errorMsg: value }),
    })

    if ( params.error ) {
      throw new Error( `${ REQUEST } => ${ params.errorMsg }` )
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
    const requestConfig = { url, method, ...params, ...config, }

    const _store = { dispatch, state: getState(), getState }
    const processResponse = handleResponse( _store )( next )
    const handleHeaders = handleHeadersFn( dispatch )
    const handleRepeater = handleRepeaterFn( dispatch )( requestConfig )

    _call = axios.request( requestConfig )

    const call = _call
      .then( handleHeaders( uris ) )
      .then(response =>
        processResponse( response )({
          success,
          failure,
          types: { REQUEST, SUCCESS, FAILURE },
          meta,
          repeat,
          useFullResponseObject,
        })
      )
      .then( handleRepeater( processResponse )({
        success,
        failure,
        types: { REQUEST, SUCCESS, FAILURE },
        meta,
        repeat,
        interval,
      }) )
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
        throw new Error( error )
      })

    // Not sure of its usage atm, but it might be nice to have some where
    if ( typeof tapAfterCall === 'function' ) {
      tapAfterCall( { params: parameters, ...store } )
    }

    return call
  }
}

export default middleware
