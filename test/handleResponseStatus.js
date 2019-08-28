import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

import options from '../src/options';
import handleResponseStatus from '../src/handleStatusResponses';
import ResponseNotModified from '../src/errors/ResponseNotModified';
import ResponseWithBadStatusCode from '../src/errors/ResponseWithBadStatusCode';
import ResponseWithError from '../src/errors/ResponseWithError';
import ResponseWithErrors from '../src/errors/ResponseWithErrors';
import HandleStatusResponsesInvalidReturn from '../src/errors/HandleStatusResponsesInvalidReturn';

chai.use(chaiAsPromised);

const sandbox = sinon.createSandbox();

describe('handleResponseStatus', () => {
  let mockContext;
  let mockResponse;

  beforeEach(() => {
    mockContext = {
      store: {
        dispatch: sandbox.spy(),
        state: {},
        getState: sandbox.spy(),
      },
      fallbackToAxiosStatusResponse: options.fallbackToAxiosStatusResponse,
      useOnlyAxiosStatusResponse: options.useOnlyAxiosStatusResponse,
      handleStatusResponses: options.handleStatusResponse,
      customSuccessResponses: options.customSuccessResponses,
    };
    mockResponse = {
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('gets catched within a promise chain', () => {
    mockResponse.status = 'lol';
    const thenSpy = sandbox.spy();
    const catchSpy = sandbox.spy();
    const p = Promise.resolve()
      .then(() => {
        handleResponseStatus(mockContext)(mockResponse);
      })
      .then(thenSpy)
      .catch(catchSpy);

    return chai.assert.isFulfilled(p)
      .then(() => {
        chai.assert.notCalled(thenSpy);
        chai.assert.calledOnce(catchSpy);
      });
  });

  it('throws ResponseNotModified on `response.status` = 304', () => {
    mockContext.fallbackToAxiosStatusResponse = true;
    mockResponse.status = 304;

    chai.expect(() => handleResponseStatus(mockContext)(mockResponse))
      .to.throw().instanceOf(ResponseNotModified);
  });

  it('throws ResponseNotModified on `response.data.status` = 304', () => {
    mockResponse.data = {
      status: 304,
    };

    chai.expect(() => handleResponseStatus(mockContext)(mockResponse))
      .to.throw().instanceOf(ResponseNotModified);
  });

  it('throws ResponseWithBadStatusCode on `response.status` = 404', () => {
    mockContext.fallbackToAxiosStatusResponse = true;
    mockResponse.status = 404;

    chai.expect(() => handleResponseStatus(mockContext)(mockResponse))
      .to.throw().instanceOf(ResponseWithBadStatusCode);
  });

  it('throws ResponseWithBadStatusCode on `response.data.status` = 404', () => {
    mockResponse.data = {
      status: 404,
    };

    chai.expect(() => handleResponseStatus(mockContext)(mockResponse))
      .to.throw().instanceOf(ResponseWithBadStatusCode);
  });

  it('throws ResponseWithError on `response.data.error`', () => {
    mockResponse.data = {
      error: 'Some error coming from the back-end',
      status: 200,
    };

    chai.expect(() => handleResponseStatus(mockContext)(mockResponse))
      .to.throw().instanceOf(ResponseWithError);
  });

  it('throws ResponseWithErrors on `response.data.errors`', () => {
    mockResponse.data = {
      errors: [
        'Multiple errors coming from the back-end',
        'Invalid username',
      ],
      status: 200,
    };

    chai.expect(() => handleResponseStatus(mockContext)(mockResponse))
      .to.throw().instanceOf(ResponseWithErrors);
  });

  it('returns unmodified response', () => {
    mockResponse = {
      status: 200,
      data: {
        success: true,
      },
    };

    const result = handleResponseStatus(mockContext)(mockResponse);

    chai.assert.deepEqual(result, mockResponse);
  });

  describe('middleware.handleStatusResponse', () => {
    it('throws HandleStatusResponsesInvalidReturn if not Boolean returned', () => {
      mockContext.handleStatusResponses = function handleStatusResponses() {};

      chai.expect(() => handleResponseStatus(mockContext)(mockResponse))
        .to.throw().instanceOf(HandleStatusResponsesInvalidReturn);
    });

    it('throws inside of middleware.handleStatusResponses', () => {
      mockContext.handleStatusResponses = function handleStatusResponses() {
        throw SyntaxError('bad stuff keeps happening!');
      };

      chai.expect(() => handleResponseStatus(mockContext)(mockResponse))
        .to.throw().instanceOf(SyntaxError);
    });
  });
});
