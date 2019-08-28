import chai from 'chai';

import MiddlewareOptionsValidationError from '../../src/errors/MiddlewareOptionsValidationError';
import validateMiddlewareOptions from '../../src/utils/validateMiddlewareOptions';

describe('validateMiddlewareOptions', () => {
  const mandatoryOpts = {
    base: 'some-url',
    constants: {
      API: 'API',
      API_ERROR: 'API_ERROR',
      API_VOID: 'API_VOID',
    },
    fallbackToAxiosStatusResponse: false,
    useOnlyAxiosStatusResponse: false,
    useETags: false,
    emitRequestType: false,
    useFullResponseObject: false,
    warnOnCancellation: false,
  };
  const allErrorsLength = Object.keys(mandatoryOpts).length;

  it('returns all possible errors', () => {
    const result = validateMiddlewareOptions();
    chai.assert.instanceOf(result, MiddlewareOptionsValidationError);
    chai.assert.lengthOf(result.errors, allErrorsLength);
  });

  it('returns errors with newlines', () => {
    const result = validateMiddlewareOptions();
    chai.assert.match(result.message, /middleware\.\w+[\s\S]*middleware\.\w+/);
  });

  it('returns no errors', () => {
    const result = validateMiddlewareOptions(mandatoryOpts);
    chai.assert.notInstanceOf(result, MiddlewareOptionsValidationError);
  });

  it('returns one error on wrong optional option type', () => {
    const result = validateMiddlewareOptions({
      ...mandatoryOpts,
      customSuccessResponses: 'wrong_value',
    });
    chai.assert.instanceOf(result, MiddlewareOptionsValidationError);
    chai.assert.lengthOf(result.errors, 1);
  });

  it('returns one error on wrong option type', () => {
    const result = validateMiddlewareOptions({
      ...mandatoryOpts,
      base: false,
    });
    chai.assert.instanceOf(result, MiddlewareOptionsValidationError);
    chai.assert.lengthOf(result.errors, 1);
  });
});
