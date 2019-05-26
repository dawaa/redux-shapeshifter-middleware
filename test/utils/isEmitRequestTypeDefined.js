import chai from 'chai'
import Validation from 'folktale/validation'

import isEmitRequestTypeDefined from '../../src/utils/isEmitRequestTypeDefined'

describe( 'isEmitRequestTypeDefined', () => {
  it ( 'validates Boolean false', () => {
    const result = isEmitRequestTypeDefined( false )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'validates Boolean true', () => {
    const result = isEmitRequestTypeDefined( true )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'invalidates other types', () => {
    const types = [ null, undefined, () => {}, '', 'str', 0, 1, [], {} ]
    for ( let type of types ) {
      const result = isEmitRequestTypeDefined( type )
      chai.assert.isTrue(
        Validation.Failure.hasInstance( result ),
        `Type (${ type }) shouldn't be valid`,
      )
    }
  } )
} )
