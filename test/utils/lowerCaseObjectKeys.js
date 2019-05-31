import chai from 'chai'
import Result from 'folktale/result'

import lowerCaseObjectKeys from '../../src/utils/lowerCaseObjectKeys'

describe( 'lowerCaseObjectKeys', () => {
  it ( 'returns Result.Ok(newArray)', () => {
    const obj = { TeSt: true, Jesus: false, OMG: true }
    const result = lowerCaseObjectKeys(obj)
    chai.assert.deepEqual(
      result,
      {
        test: true,
        jesus: false,
        omg: true,
      },
      'Should correctly lowercase keys'
    )
  } )

  it ( 'returns Result.Error() on wrong type', () => {
    const types = [ null, undefined, [], '', 'str', 0, 1, true, false ]
    for ( let type of types ) {
      const result = lowerCaseObjectKeys( type )
      chai.assert.isTrue( result.error, `Type (${ type }) shouldn't be valid` )
    }
  } )
} )
