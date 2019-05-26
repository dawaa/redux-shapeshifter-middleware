import chai from 'chai'
import Validation from 'folktale/validation'

import isUseFullResponseObjectDefined from '../../src/utils/isUseFullResponseObjectDefined'

describe( 'isUseFullResponseObjectDefined', () => {
  it ( 'validates Boolean false', () => {
    const result = isUseFullResponseObjectDefined( false )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'validates Boolean true', () => {
    const result = isUseFullResponseObjectDefined( true )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'invalidates other types', () => {
    const types = [ null, undefined, () => {}, '', 'str', 0, 1, [], {} ]
    for ( let type of types ) {
      const result = isUseFullResponseObjectDefined( type )
      chai.assert.isTrue(
        Validation.Failure.hasInstance( result ),
        `Type (${ type }) shouldn't be valid`,
      )
    }
  } )
} )
