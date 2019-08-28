import chai from 'chai';

import validateAction from '../../src/utils/validateAction';
import NotShapeshifterAction from '../../src/errors/NotShapeshifterAction';
import MalformedShapeshifterAction from '../../src/errors/MalformedShapeshifterAction';

describe('validateAction', () => {
  const API_TYPE = 'API';
  const mandatoryOpts = {
    type: API_TYPE,
    types: [
      'FETCH_USER',
      'FETCH_USER_SUCCESS',
      'FETCH_USER_FAILED',
    ],
    payload: () => {},
  };

  it('invalidates undefined action', () => {
    const result = validateAction(API_TYPE)();
    chai.assert.instanceOf(result, NotShapeshifterAction);
  });

  it('invalidates null action', () => {
    const result = validateAction(API_TYPE)(null);
    chai.assert.instanceOf(result, NotShapeshifterAction);
  });

  it('invalidates type mismatch', () => {
    const result = validateAction(API_TYPE)({ type: 'SOME_OTHER_TYPE' });
    chai.assert.instanceOf(result, NotShapeshifterAction);
  });

  it('invalidates missing payload', () => {
    const result = validateAction(API_TYPE)({
      type: API_TYPE,
      types: mandatoryOpts.types,
    });
    chai.assert.instanceOf(result, MalformedShapeshifterAction);
    chai.assert.lengthOf(result.errors, 1);
  });

  it('invalidates missing types', () => {
    const result = validateAction(API_TYPE)({
      type: API_TYPE,
      payload: () => {},
    });
    chai.assert.instanceOf(result, MalformedShapeshifterAction);
    chai.assert.lengthOf(result.errors, 1);
  });

  it('invalidates too few state types', () => {
    const result = validateAction(API_TYPE)({
      type: API_TYPE,
      types: [
        mandatoryOpts.types[0],
        mandatoryOpts.types[1],
      ],
      payload: () => {},
    });
    chai.assert.instanceOf(result, MalformedShapeshifterAction);
    chai.assert.lengthOf(result.errors, 1);
  });

  it('invalidates too many state types', () => {
    const result = validateAction(API_TYPE)({
      type: API_TYPE,
      types: [
        mandatoryOpts.types[0],
        mandatoryOpts.types[1],
        mandatoryOpts.types[2],
        'ONE_STATE_TYPE_TOO_MUCH',
      ],
      payload: () => {},
    });
    chai.assert.instanceOf(result, MalformedShapeshifterAction);
    chai.assert.lengthOf(result.errors, 1);
  });

  it('validates action', () => {
    const result = validateAction(API_TYPE)(mandatoryOpts);
    chai.assert.deepEqual(result, mandatoryOpts);
  });
});
