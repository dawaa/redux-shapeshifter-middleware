import { removeFromStack }   from './callStack'
import { isGeneratorFn }     from './generator'
import { middlewareOpts }    from './middleware'
import handleGeneratorFn     from './handleGeneratorFn'
import ResponseErrorMessage  from './errors/ResponseErrorMessage'
import defined from './utils/defined'

function validateResponse(response) {
  if ( typeof response.data !== 'object' ) {
    if ( typeof response.data === 'string' ) {
      return response.data
    }

    return 'Something went wrong with the API call.'
  }

  return null
}

export default (context = {}) => response => {
  const {
    store,
    next,
    success,
    failure,
    types,
    meta,
    repeat,
    useFullResponseObject,
    fallbackToAxiosStatusResponse,
    useOnlyAxiosStatusResponse,
    handleStatusResponses,
    customSuccessResponses,
  } = context;

  const validatedResponse = validateResponse(response);

  if (validatedResponse) {
    throw new ResponseErrorMessage(validatedResponse);
  }

  const { REQUEST, SUCCESS, FAILURE } = types;

  const { data, headers = {} } = response;
  const { errors, error } = data;

  if (isGeneratorFn(success)) {
    return handleGeneratorFn(store)(next)(response)({ success, types, meta });
  }

  removeFromStack(REQUEST);

  if (defined(repeat, Function)) {
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

  return response;
}
