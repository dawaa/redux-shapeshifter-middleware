import { middlewareOpts } from './middleware'

export default response => store => {
  const {
    fallbackToAxiosStatusResponse,
    useOnlyAxiosStatusResponse,
    handleStatusResponses,
    customSuccessResponses,
  } = middlewareOpts

  const {
    data: {
      error,
      errors,
    },
    data,
  } = response

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

  if ( typeof handleStatusResponses === 'function' ) {
    const statusHandled = handleStatusResponses( response, store )

    if ( statusHandled instanceof Promise ) {
      return statusHandled
    } else {
      console.warn(`You didn't return a Promise from 'handleStatusResponses'-method.`)
    }
  } else if ( status !== 200
    && status !== 201
    && status !== 204 ) {
    // If we have a custom success response and we received one that fits
    // our array
    if ( customSuccessResponses != null
      && customSuccessResponses.constructor === Array
      && customSuccessResponses.indexOf( status ) !== -1 ) {
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
  if ( typeof handleStatusResponses !== 'function' ) {
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
}
