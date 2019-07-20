import chai from 'chai';

import lowerCaseObjectKeys from '../../src/utils/lowerCaseObjectKeys';

describe('lowerCaseObjectKeys', () => {
  it('returns error on wrong type', () => {
    const types = [null, undefined, [], '', 'str', 0, 1, true, false];
    for (let type of types) {
      const result = lowerCaseObjectKeys(type);
      chai.assert.instanceOf(result, TypeError);
    }
  });

  it('lowercases one level', () => {
    const obj = { TeSt: true, Jesus: false, bAm: { NicE: true } };

    const result = lowerCaseObjectKeys(obj);

    chai.assert.deepEqual(result, { test: true, jesus: false, bam: { NicE: true } });
  });
});
