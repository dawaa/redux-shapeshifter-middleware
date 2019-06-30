import MiddlewareOptionsValidationError from '../errors/MiddlewareOptionsValidationError';
import defined from './defined';
import optional from './optional';

export default (opts = {}) => {
  const errors = [];

  const addError = (opt, type, value) => errors.push(
    `\n - middleware.${opt} is expected to be of type ${type}, got instead ${value}`,
  );

  if (!defined(opts.base, String)) {
    addError('base', 'String', opts.base);
  }

  if (!defined(opts.constants, Object)) {
    addError('constants', 'Object', opts.constants);
  } else {
    const { API, API_ERROR, API_VOID } = opts.constants;

    if (!defined(API, String)) {
      addError('constants.API', 'String', API);
    }

    if (!defined(API_ERROR, String)) {
      addError('constants.API_ERROR', 'String', API_ERROR);
    }

    if (!defined(API_VOID, String)) {
      addError('constants.API_VOID', 'String', API_VOID);
    }
  }

  if (!optional(opts.auth, Object)) {
    addError('auth', 'Object', opts.auth);
  }

  if (!optional(opts.handleStatusResponses, Function)) {
    addError('handleStatusResponse', 'Function', opts.handleStatusResponse);
  }

  if (!defined(opts.fallbackToAxiosStatusResponse, Boolean)) {
    addError('fallbackToAxiosStatusResponse', 'Boolean', opts.fallbackToAxiosStatusResponse);
  }

  if (!optional(opts.customSuccessResponses, Array)) {
    addError('customSuccessResponses', 'Array', opts.customSuccessResponses);
  }

  if (!defined(opts.useOnlyAxiosStatusResponse, Boolean)) {
    addError('useOnlyAxiosStatusResponse', 'Boolean', opts.useOnlyAxiosStatusResponse);
  }

  if (!defined(opts.useETags, Boolean)) {
    addError('useETags', 'Boolean', opts.useETags);
  }

  if (!optional(opts.dispatchETagCreationType, String)) {
    addError('dispatchETagCreationType', 'String', opts.dispatchETagCreationType);
  }

  if (!optional(opts.matchingETagHeaders, Function)) {
    addError('matchingETagHeaders', 'Function', opts.matchingETagHeaders);
  }

  if (!defined(opts.emitRequestType, Boolean)) {
    addError('emitRequestType', 'Boolean', opts.emitRequestType);
  }

  if (!defined(opts.useFullResponseObject, Boolean)) {
    addError('useFullResponseObject', 'Boolean', opts.useFullResponseObject);
  }

  if (!defined(opts.warnOnCancellation, Boolean)) {
    addError('warnOnCancellation', 'Boolean', opts.warnOnCancellation);
  }

  if (errors.length) {
    return new MiddlewareOptionsValidationError(errors.join(''), errors);
  }

  return opts;
};
