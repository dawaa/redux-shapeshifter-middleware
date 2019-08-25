import chai from 'chai';
import sinon from 'sinon';

import handleResponse from '../src/handleResponse';
import ResponseErrorMessage from '../src/errors/ResponseErrorMessage';

const { any } = sinon.match;
const sandbox = sinon.createSandbox();

describe('handleResponse', () => {
  let mockContext;
  let mockResponse;
  let store;

  beforeEach(() => {
    store = {
      dispatch: sandbox.spy(),
      state: {},
      getState: sandbox.spy(),
    };

    mockContext = {
      store,
      next: sandbox.spy(),
      success: sandbox.spy(),
      failure: sandbox.spy(),
      types: {
      },
      meta: store,
      useFullResponseObject: false,
    };
    mockResponse = {
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('throws on invalid `response.data` type', () => {
    mockResponse.data = undefined;

    chai.expect(() => handleResponse(mockContext)(mockResponse))
      .to.throw().instanceOf(ResponseErrorMessage);
  });

  it('throws on `response.data` being a string, assuming back-end returned reason', () => {
    mockResponse.data = 'some back-end error message';

    chai.expect(() => handleResponse(mockContext)(mockResponse))
      .to.throw().instanceOf(ResponseErrorMessage);
  });

  it('returns modified response with `response._shapeShifterRepeat` = true', () => {
    mockContext.repeat = () => {};
    mockResponse.data = {};

    const result = handleResponse(mockContext)(mockResponse);

    chai.assert.deepEqual(result, { ...mockResponse, _shapeShifterRepeat: true });
  });

  it('doesn\'t call dispatch if `ACTION.repeat` is defined', () => {
    mockContext.repeat = () => {};
    mockResponse.data = {};

    handleResponse(mockContext)(mockResponse);

    chai.assert.notCalled(mockContext.store.dispatch);
  });

  it('calls dispatch() with value from success()', () => {
    const fakeSuccessPayload = { test: true };
    mockContext.success = () => fakeSuccessPayload;
    mockResponse.data = {};

    handleResponse(mockContext)(mockResponse);

    chai.assert.calledWith(mockContext.store.dispatch, fakeSuccessPayload);
  });

  describe('when calling success()', () => {
    beforeEach(() => {
      mockContext = {
        ...mockContext,
        success: sandbox.spy(),
      };
      mockResponse.data = { test: true };
    });

    it('calls success() with SUCCESS type', () => {
      mockContext.types = { SUCCESS: 'REQUEST_ACTION_SUCCESS' };

      handleResponse(mockContext)(mockResponse);

      chai.assert.calledWith(mockContext.success, mockContext.types.SUCCESS);
    });

    it('calls success() with `response.data`', () => {
      handleResponse(mockContext)(mockResponse);

      chai.assert.calledWith(mockContext.success, any, mockResponse.data);
    });

    it('calls success() with full response', () => {
      mockContext = {
        ...mockContext,
        useFullResponseObject: true,
      };

      handleResponse(mockContext)(mockResponse);

      chai.assert.calledWithMatch(mockContext.success, any, mockResponse);
    });

    it('calls success() with store as 3rd argument', () => {
      handleResponse(mockContext)(mockResponse);

      chai.assert.calledWithMatch(mockContext.success, any, any, mockContext.store);
    });

    it('calls success() with store as 4th argument if meta is defined', () => {
      mockContext.meta = { someParam: true };

      handleResponse(mockContext)(mockResponse);

      chai.assert.calledWithMatch(mockContext.success, any, any, any, mockContext.store);
    });
  });
});
