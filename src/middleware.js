// external
import axios, { CancelToken } from 'axios'

// internal
import recursiveObjFind             from './recursiveObjFind'
import { isGeneratorFn }            from './generator'
import { API, API_ERROR, API_VOID } from './consts'
import { existsInStack } from './callStack'
import * as callStack from './callStack'
import handleResponse from './handleResponse'
import handleHeadersFn from './handleHeaders'
import handleRepeaterFn from './handleRepeater'
import handleErrorFn from './handleError'
import validateAction from './utils/validateAction'
import validateMiddlewareOptions from './utils/validateMiddlewareOptions'
import defineBodyPayload from './utils/defineBodyPayload'
import defineETags from './utils/defineETags'
import objectStoreSubstitution from './utils/objectStoreSubstitution'

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

    const ETagHeaders = defineETags( middlewareOpts )( urlETags[ uris ] )({
      dispatch,
      state: getState(),
      getState,
    })

    if ( ETagHeaders.error ) {
      throw new Error( `redux-shapeshifter-middleware: ${ETagHeaders.errorMsg}` )
    }

    if ( middlewareOpts.useETags && urlETags[ uris ] ) {
      axiosConfig.headers = axiosConfig.headers || {}
      axiosConfig.headers = {
        ...axiosConfig.headers,
        ...ETagHeaders,
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

    const requiresAuth = !!middlewareOpts.auth && auth
    const requiresAuthHeaders = middlewareOpts.auth
      && middlewareOpts.auth.headers
      && middlewareOpts.auth.headers.constructor === Object

    if ( requiresAuth ) {
      if ( requiresAuthHeaders ) {
        middlewareOpts.auth.headers = objectStoreSubstitution(
          getState(),
          middlewareOpts.auth.headers,
        )
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
        axiosConfig.headers || requiresAuthHeaders
        ?
          {
            headers: {
              ...(axiosConfig.headers ? axiosConfig.headers : {}),
              ...(requiresAuthHeaders ? middlewareOpts.auth.headers : {}),
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
    const handleError = handleErrorFn( dispatch )

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
      .catch( handleError( ETagCallback )({
        types: { REQUEST, FAILURE },
        failure,
        uri: uris,
        store: (store === null ? meta : store),
      }) )

    // Not sure of its usage atm, but it might be nice to have some where
    if ( typeof tapAfterCall === 'function' ) {
      tapAfterCall( { params: parameters, ...store } )
    }

    return call
  }
}

export default middleware
