import chai from 'chai'
import Validation from 'folktale/validation'

import isConstantsDefined from '../../src/utils/isConstantsDefined'

describe( 'isConstantsDefined', () => {
  it ( 'validates constants', () => {
    const result = isConstantsDefined({
      API: 'API',
      API_ERROR: 'API_ERROR',
      API_VOID: 'API_VOID',
    })
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'invalidates wrong constants type', () => {
    const types = [ null, undefined, [], '', 0 ]
    for ( let type of types ) {
      const result = isConstantsDefined( type )
      chai.assert.isTrue(
        Validation.Failure.hasInstance( result ),
        `Type (${ type }) shouldn't be valid`,
      )
    }
  } )

  it ( 'invalidates wrong API types', () => {
    const result = isConstantsDefined({
      API: null,
      API_ERROR: null,
      API_VOID: null,
    })
    chai.assert.isTrue( Validation.Failure.hasInstance( result ) )
    chai.assert.lengthOf( result.merge(), 3, 'Should hold multiple validation errors' )
  } )
} )
