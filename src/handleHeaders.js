import { middlewareOpts, urlETags } from './middleware'
import lowerCaseObjectKeys from './utils/lowerCaseObjectKeys'

export default dispatch => uris => response => {
  const { headers } = response

  if ( headers == null ) {
    return response
  }

  if ( headers.constructor === Object && !Object.keys( headers ).length ) {
    return response
  }

  const normalizedHeaders = lowerCaseObjectKeys( headers )

  if ( normalizedHeaders.error ) {
    console.error( normalizedHeaders.errorMsg );
    return response
  }

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

  return response
}
