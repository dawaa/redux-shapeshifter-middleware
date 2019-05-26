import chai from 'chai'
import Validation from 'folktale/validation'

import isCustomSuccessResponsesDefined from '../../src/utils/isCustomSuccessResponsesDefined'

describe( 'isCustomSuccessResponsesDefined', () => {
  it ( 'validates Array', () => {
    const result = isCustomSuccessResponsesDefined( [] )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'validates null', () => {
    const result = isCustomSuccessResponsesDefined( null )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'validates undefined', () => {
    const result = isCustomSuccessResponsesDefined( undefined )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'invalidates other types', () => {
    const types = [ () => {}, '', 'str', 0, 1, {}, true, false ]
    for ( let type of types ) {
      const result = isCustomSuccessResponsesDefined( type )
      chai.assert.isTrue(
        Validation.Failure.hasInstance( result ),
        `Type (${ type }) shouldn't be valid`,
      )
    }
  } )
} )
