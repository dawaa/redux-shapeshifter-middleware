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

export default response => store => next => async ({ success, failure, types, meta }) => {
  const validatedResponse = validateResponse( response )

  if ( validatedResponse ) {
    return Promise.reject( validatedResponse )
  }
  const { REQUEST, SUCCESS, FAILURE } = types

  const { data, headers = {} } = response
  const { errors, error }      = data

  const handledStatusResponse = await handleStatusResponses( response )( store )

  if ( isGeneratorFn( success ) ) {
    return handleGeneratorFn( response )( store )( next )({ success, types, meta })
  }

  // Remove call from callStack when finished
  removeFromStack( REQUEST )

  store.dispatch(
    success(
      SUCCESS,
      response.data,
      meta,
      (meta.getState && typeof meta.getState === 'function' ? null : store),
    )
  )

  return response
}
