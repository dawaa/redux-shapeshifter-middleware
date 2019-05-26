import chai from 'chai'
import Validation from 'folktale/validation'

import isUseETagsDefined from '../../src/utils/isUseETagsDefined'

describe( 'isUseETagsDefined', () => {
  it ( 'validates Boolean false', () => {
    const result = isUseETagsDefined( false )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'validates Boolean true', () => {
    const result = isUseETagsDefined( true )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'invalidates other types', () => {
    const types = [ null, undefined, () => {}, '', 'str', 0, 1, [], {} ]
    for ( let type of types ) {
      const result = isUseETagsDefined( type )
      chai.assert.isTrue(
        Validation.Failure.hasInstance( result ),
        `Type (${ type }) shouldn't be valid`,
      )
    }
  } )
} )
