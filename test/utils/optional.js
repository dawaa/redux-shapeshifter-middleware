import chai from 'chai'

import optional from '../../src/utils/optional'

describe('optional', () => {
  it('validates null', () => {
    chai.assert.isTrue(optional(null));
  });

  it('validates undefined', () => {
    chai.assert.isTrue(optional(undefined));
  });
});
