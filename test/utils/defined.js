import chai from 'chai'

import defined from '../../src/utils/defined'

describe('defined', () => {
  it('invalidates null', () => {
    chai.assert.isFalse(defined(null));
  });

  it('invalidates undefined', () => {
    chai.assert.isFalse(defined(undefined));
  });

  it('invalidates wrong type', () => {
    chai.assert.isFalse(defined(1, String));
  })

  it('invalidates correct type but wrong expectation', () => {
    chai.assert.isFalse(defined(1, Number, '1'));
  });

  it('invalidates wrong type but correct expectation', () => {
    chai.assert.isFalse(defined(1, String, 1));
  });

  it('validates correct type', () => {
    chai.assert.isTrue(defined(1, Number));
  });

  it('validates correct type and expectation', () => {
    chai.assert.isTrue(defined('1', String, '1'));
  });
});
