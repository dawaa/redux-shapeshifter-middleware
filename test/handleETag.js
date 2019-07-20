import chai from 'chai';
import sinon from 'sinon';

import handleETag from '../src/handleETag';

const sandbox = sinon.createSandbox();

describe('handleETag', () => {
  const etag = 'abc1234';
  let mockContext;
  let mockResponse;

  beforeEach(() => {
    mockContext = {
      dispatch: sinon.spy(),
      ETags: {},
      path: '/users/fetch',
      useETags: true,
    };
    mockResponse = {
      headers: {
        eTag: etag,
      },
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('doesn\'t cache path with corresponding etag if useETags = false', () => {
    mockContext.useETags = false;

    handleETag(mockContext)(mockResponse);

    chai.assert.notEqual(mockContext.ETags[mockContext.path], etag);
  });

  it('doesn\'t cache path with corresponding etag if missing etag in response', () => {
    delete mockResponse.headers.eTag;

    handleETag(mockContext)(mockResponse);

    chai.assert.notEqual(mockContext.ETags[mockContext.path], etag);
  });

  it('caches path with corresponding etag', () => {
    handleETag(mockContext)(mockResponse);

    chai.assert.strictEqual(mockContext.ETags[mockContext.path], etag);
  });

  it('calls dispatch with a creation type', () => {
    mockContext.dispatchETagCreationType = 'ETAG_CREATED';

    handleETag(mockContext)(mockResponse);

    chai.assert.calledOnce(mockContext.dispatch);
  });

  it('doesn\'t call dispatch due to invalid creation types', () => {
    const types = [null, undefined, [], '', 0, 1, true, false];
    for (let type of types) {
      mockContext.dispatchETagCreationType = type;

      const result = handleETag(mockContext)(mockResponse);

      chai.assert.notCalled(mockContext.dispatch);
    }
  });

  it('calls dispatch with expected arguments', () => {
    mockContext.dispatchETagCreationType = 'ETAG_CREATED';

    handleETag(mockContext)(mockResponse);

    chai.assert.calledWith(mockContext.dispatch, {
      type: mockContext.dispatchETagCreationType,
      ETag: etag,
      key: mockContext.path,
    });
  });

  it('returns unmodified response', () => {
    const result = handleETag(mockContext)(mockResponse);

    chai.assert.deepEqual(result, mockResponse);
  });

  it('warns about wrong response.headers type', () => {
    const mock = sandbox.mock(console).expects('warn').once();
    mockResponse.headers = false;

    handleETag(mockContext)(mockResponse);

    mock.verify();
  });
});
