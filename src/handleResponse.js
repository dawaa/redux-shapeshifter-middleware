import { removeFromStack }   from './callStack'
import { isGeneratorFn }     from './generator'
import { middlewareOpts }    from './middleware'
import handleStatusResponses from './handleStatusResponses'
import handleGeneratorFn     from './handleGeneratorFn'

function validateResponse(response) {
  if ( typeof response.data !== 'object' ) {
    if ( typeof response.data === 'string' ) {
      return response.data
    }

    return 'Something went wrong with the API call.'
  }

  return null
}

export default store => next => response => async ({
  success,
  failure,
  types,
  meta,
  repeat,
  useFullResponseObject,
}) => {
  const validatedResponse = validateResponse( response )

  if ( validatedResponse ) {
    return Promise.reject( validatedResponse )
  }
  const { REQUEST, SUCCESS, FAILURE } = types

  const { data, headers = {} } = response
  const { errors, error }      = data

  const handledStatusResponse = await handleStatusResponses( store )( response )

  if ( isGeneratorFn( success ) ) {
    return handleGeneratorFn( store )( next )( response )({ success, types, meta })
  }

  // Remove call from callStack when finished
  removeFromStack( REQUEST )

  if ( repeat && repeat.constructor === Function ) {
    response._shapeShifterRepeat = true
  } else {
    store.dispatch(
      success(
        SUCCESS,
        (
          middlewareOpts.useFullResponseObject || useFullResponseObject
          ? response
          : response.data
        ),
        meta,
        (meta.getState && typeof meta.getState === 'function' ? null : store),
      )
    )
  }

  return response
}
