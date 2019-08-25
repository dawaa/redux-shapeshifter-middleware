import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

chai.use( chaiAsPromised )

import ResponseRepeatReject from '../src/errors/ResponseRepeatReject';
import handleRepeater from '../src/handleRepeater';

const mock = new MockAdapter(axios);
const sandbox = sinon.createSandbox();

describe('handleRepeater', () => {
  let mockContext;
  let mockResponse;

  beforeEach(() => {
    mockContext = {
      store: {
        dispatch: sandbox.spy(),
        state: {},
        getState: sandbox.spy(),
      },
      next: sandbox.spy(),
      requestConfig: {
        url: 'http://some-url.com',
        someConfig: true,
      },
      success: sandbox.spy(),
      failure: sandbox.spy(),
      interval: 100,
    };
    mockResponse = {
      status: 200,
      _shapeShifterRepeat: true,
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns response if `_shapeShifterRepeat` is missing on the response object', () => {
    delete mockResponse._shapeShifterRepeat;
    const result = handleRepeater(mockContext)(mockResponse);

    chai.assert.deepEqual(result, mockResponse);
  });

  it('rejects promise with error ResponseRepeatReject', async () => {
    mockContext.repeat = function repeat(response, resolve, reject) {
      if (response && response.data.isOnline) {
        return resolve();
      }
      return reject({ somethingWentWrong: true });
    };
    mock.onGet(mockContext.requestConfig.url).replyOnce(200, {});

    return await chai.assert.isRejected(handleRepeater(mockContext)(mockResponse))
      .then((result) => {
        chai.assert.instanceOf(result, ResponseRepeatReject);
      });
  });

  it('rejects promise on data from back-end', () => {
    const successSpy = sandbox.spy();
    const failureSpy = sandbox.spy();
    mockContext.repeat = function repeat(response, resolve, reject) {
      if (response && response.data.isOnline) {
        successSpy();
        return resolve(response);
      } else if (response && response.data.error) {
        failureSpy();
        return reject(response);
      }
    };
    mock
      .onGet(mockContext.requestConfig.url)
      .replyOnce(200, { isOnline: false })
      .onGet(mockContext.requestConfig.url)
      .replyOnce(200, { error: true });

    return chai.assert.isRejected(handleRepeater(mockContext)(mockResponse))
      .then(() => {
        chai.assert.notCalled(successSpy);
        chai.assert.calledOnce(failureSpy);
      });
  });

  it('fulfills promise with custom data', () => {
    const customPayload = { userIsOnline: true, abc: true };
    mockContext.repeat = function repeat(response, resolve, reject) {
      if (response && response.data.isOnline) {
        return resolve(customPayload);
      }
    };
    mock
      .onGet(mockContext.requestConfig.url)
      .replyOnce(200, { isOnline: true });

    return chai.assert.isFulfilled(handleRepeater(mockContext)(mockResponse))
      .then((result) => {
        chai.assert.deepEqual(result, customPayload);
      });
  });

  it('fulfills promise once online', () => {
    const repeaterSpy = sandbox.spy();
    const successSpy = sandbox.spy();
    let repeatResponse;
    mockContext.repeat = function repeat(response, resolve, reject) {
      repeaterSpy();
      if (response && response.data.isOnline) {
        successSpy();
        repeatResponse = response;
        return resolve(repeatResponse);
      }
    };
    mock
      .onGet(mockContext.requestConfig.url)
      .replyOnce(200, { isOnline: false })
      .onGet(mockContext.requestConfig.url)
      .replyOnce(200, { isOnline: true });

    return chai.assert.isFulfilled(handleRepeater(mockContext)(mockResponse))
      .then((response) => {
        chai.assert.callCount(repeaterSpy, 2);
        chai.assert.calledOnce(successSpy);
        chai.assert.deepEqual(response, repeatResponse);
      });
  });

  it('rejects promise with custom data', () => {
    const customPayload = { errorHappened: true, doSomethingAboutIt: true };
    mockContext.repeat = function repeat(response, resolve, reject) {
      if (response && response.data.isOnline) {
        return resolve();
      }

      return reject(customPayload);
    };
    mock
      .onGet(mockContext.requestConfig.url)
      .replyOnce(200, { isOnline: false })

    return chai.assert.isRejected(handleRepeater(mockContext)(mockResponse))
      .then((result) => {
        chai.assert.deepEqual(result.message, customPayload);
      });
  });

  it('rejects promise on boolean return `false`', () => {
    mockContext.repeat = function repeat(response) {
      if (response && response.data && response.data.isOnline) {
        return true;
      }

      return false;
    };

    mock.onGet(mockContext.requestConfig.url).replyOnce(200, {});

    return chai.assert.isRejected(handleRepeater(mockContext)(mockResponse));
  });

  it('rejects promise on boolean return `false` with error wrapped payload', () => {
    let repeatResponse;
    mockContext.repeat = function repeat(response) {
      repeatResponse = response;

      if (response && response.data && response.data.isOnline) {
        return true;
      }

      return false;
    };

    mock.onGet(mockContext.requestConfig.url).replyOnce(200, {});

    return chai.assert.isRejected(handleRepeater(mockContext)(mockResponse))
      .then((response) => {
        chai.assert.deepEqual(response.message, repeatResponse);
      });
  });

  it('fulfills promise on boolean return `true`', () => {
    mockContext.repeat = function repeat(response) {
      if (response && response.data && response.data.isOnline) {
        return true;
      }
    };

    mock
      .onGet(mockContext.requestConfig.url)
      .replyOnce(200, { isOnline: true });

    return chai.assert.isFulfilled(handleRepeater(mockContext)(mockResponse));
  });

  it('fulfills promise on boolean return `true` with expected payload', () => {
    mockContext.repeat = function repeat(response) {
      if (response && response.data && response.data.isOnline) {
        return true;
      }
    };

    mock
      .onGet(mockContext.requestConfig.url)
      .replyOnce(200, { isOnline: true });

    return chai.assert.isFulfilled(handleRepeater(mockContext)(mockResponse))
      .then((response) => {
        chai.assert.strictEqual(response.status, 200);
        chai.assert.deepEqual(response.data, { isOnline: true });
      });
  });

  it('creates new request with same initial config', () => {
    const spy = sandbox.spy(axios, 'request');
    mockContext.repeat = function repeat(response, resolve, reject) {
      if (response && response.data.isOnline) {
        return resolve(response);
      }
    };
    mock
      .onGet(mockContext.requestConfig.url)
      .replyOnce(200, { isOnline: false })
      .onGet(mockContext.requestConfig.url)
      .replyOnce(200, { isOnline: true });

    return chai.assert.isFulfilled(handleRepeater(mockContext)(mockResponse))
      .then((result) => {
        chai.assert.strictEqual(spy.callCount, 2, 'Something else is wrong');
        chai.assert.deepEqual(spy.args, [
          [mockContext.requestConfig],
          [mockContext.requestConfig],
        ]);
      });
  });

  describe('when repeater is fulfilled', () => {
    beforeEach(() => {
      mockContext = {
        ...mockContext,
        types: {
          REQUEST: 'SOME_ACTION',
          SUCCESS: 'SOME_ACTION_SUCCESS',
          FAILURE: 'SOME_ACTION_FAILURE',
        },
        meta: mockContext.store,
      };

      mock.onGet(mockContext.requestConfig.url).replyOnce(200, { test: true });
    });

    it('calls success once', () => {
      mockContext.repeat = function repeat(response, resolve) {
        return resolve(response);
      };

      return chai.assert.isFulfilled(handleRepeater(mockContext)(mockResponse))
        .then(() => {
          chai.assert.calledOnce(mockContext.success);
        });
    });

    it('calls success with `response.data`', () => {
      mockContext.repeat = function repeat(response, resolve) {
        return resolve(response);
      }

      return chai.assert.isFulfilled(handleRepeater(mockContext)(mockResponse))
        .then(() => {
          chai.assert.calledWith(
            mockContext.success,
            sinon.match.any,
            { test: true },
            sinon.match.any,
          );
        });
    });

    it('calls success with `response`', () => {
      mockContext.useFullResponseObject = true;
      mockContext.repeat = function repeat(response, resolve) {
        return resolve(response);
      };

      return chai.assert.isFulfilled(handleRepeater(mockContext)(mockResponse))
        .then((response) => {
          chai.assert.calledWith(
            mockContext.success,
            sinon.match.any,
            response,
            sinon.match.any,
          );
        });
    });

    it('calls dispatch with store as 3rd argument', () => {
      mockContext.repeat = function repeat(response, resolve) {
        return resolve(response);
      };

      return chai.assert.isFulfilled(handleRepeater(mockContext)(mockResponse))
        .then((response) => {
          chai.assert.calledWith(
            mockContext.success,
            sinon.match.any,
            sinon.match.any,
            mockContext.store,
          );
        });
    });

    it('calls dispatch with store as 4th argument if `meta` is defined', () => {
      mockContext.meta = {};
      mockContext.repeat = function repeat(response, resolve) {
        return resolve(response);
      };

      return chai.assert.isFulfilled(handleRepeater(mockContext)(mockResponse))
        .then((response) => {
          chai.assert.calledWith(
            mockContext.success,
            sinon.match.any,
            sinon.match.any,
            sinon.match.any,
            mockContext.store,
          );
        });
    });
  });
});
