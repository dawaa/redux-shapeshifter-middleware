import { removeFromStack } from './callStack';
import { isGeneratorFn } from './generator';
import options from './options';
import handleGeneratorFn from './handleGeneratorFn';
import ResponseErrorMessage from './errors/ResponseErrorMessage';
import defined from './utils/defined';

function validateResponse(response) {
  if (typeof response.data !== 'object') {
    if (typeof response.data === 'string') {
      return response.data;
    }

    return 'Something went wrong with the API call.';
  }

  return null;
}

export default (context = {}) => (response) => {
  const {
    store,
    next,
    success,
    types,
    meta,
    repeat,
    useFullResponseObject,
  } = context;

  const validatedResponse = validateResponse(response);

  if (validatedResponse) {
    throw new ResponseErrorMessage(validatedResponse);
  }

  const { REQUEST, SUCCESS } = types;

  if (isGeneratorFn(success)) {
    return handleGeneratorFn(store)(next)(response)({ success, types, meta });
  }

  removeFromStack(REQUEST);

  if (defined(repeat, Function)) {
    // eslint-disable-next-line no-underscore-dangle
    response._shapeShifterRepeat = true;
  } else {
    store.dispatch(
      success(
        SUCCESS,
        (
          options.useFullResponseObject || useFullResponseObject
            ? response
            : response.data
        ),
        meta,
        (meta.getState && typeof meta.getState === 'function' ? null : store),
      ),
    );
  }

  return response;
};
