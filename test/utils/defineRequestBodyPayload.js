import chai from 'chai';

import defineRequestBodyPayload from '../../src/utils/defineRequestBodyPayload';
import InvalidMethodError from '../../src/errors/InvalidMethodError';

describe('defineRequestBodyPayload', () => {
  it('invalidates wrong method', () => {
    const result = defineRequestBodyPayload('not_valid_method');
    chai.assert.instanceOf(result, InvalidMethodError);
  });

  it('validates correct method', () => {
    const result = defineRequestBodyPayload('post');
    chai.assert.notInstanceOf(result, InvalidMethodError);
  });

  it('returns { data: ... }', () => {
    const methods = ['delete', 'post', 'put', 'patch'];
    methods.forEach((method) => {
      const result = defineRequestBodyPayload(method, { test: true });
      chai.assert.deepEqual(result, { data: { test: true } });
    });
  });

  it('returns { params: ... }', () => {
    const result = defineRequestBodyPayload('get', { test: true });
    chai.assert.deepEqual(result, { params: { test: true } });
  });
});
