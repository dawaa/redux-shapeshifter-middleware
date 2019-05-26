import Validation from 'folktale/validation'

import isBaseUrlDefined from './isBaseUrlDefined'
import isConstantsDefined from './isConstantsDefined'
import isHandleStatusResponsesDefined from './isHandleStatusResponsesDefined'
import isFallbackToAxiosStatusResponseDefined from './isFallbackToAxiosStatusResponseDefined'
import isCustomSuccessResponsesDefined from './isCustomSuccessResponsesDefined'
import isUseOnlyAxiosStatusResponseDefined from './isUseOnlyAxiosStatusResponseDefined'
import isUseETagsDefined from './isUseETagsDefined'
import isEmitRequestTypeDefined from './isEmitRequestTypeDefined'
import isUseFullResponseObjectDefined from './isUseFullResponseObjectDefined'

export class MiddlewareOptionsValidationError extends Error {
  constructor(message) {
    super( message )
    this.name = 'MiddlewareOptionsValidationError'
  }
}

export default opts => Validation.Success()
  .concat( isBaseUrlDefined( opts.base ) )
  .concat( isConstantsDefined( opts.constants ) )
  .concat( isHandleStatusResponsesDefined( opts.handleStatusResponses ) )
  .concat( isFallbackToAxiosStatusResponseDefined( opts.fallbackToAxiosStatusResponse ) )
  .concat( isCustomSuccessResponsesDefined( opts.customSuccessResponses ) )
  .concat( isUseOnlyAxiosStatusResponseDefined( opts.useOnlyAxiosStatusResponse ) )
  .concat( isUseETagsDefined( opts.useETags ) )
  .concat( isEmitRequestTypeDefined( opts.emitRequestType ) )
  .concat( isUseFullResponseObjectDefined( opts.useFullResponseObject ) )
  .matchWith({
    Success: _ => opts,
    Failure: ({ value }) => {
      throw new MiddlewareOptionsValidationError( value )
    },
  })
