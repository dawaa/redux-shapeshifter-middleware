import chai from 'chai'
import Validation from 'folktale/validation'

import isHandleStatusResponsesDefined from '../../src/utils/isHandleStatusResponsesDefined'

describe( 'isHandleStatusResponsesDefined', () => {
  it ( 'validates Function', () => {
    const result = isHandleStatusResponsesDefined( () => {} )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'validates null', () => {
    const result = isHandleStatusResponsesDefined( null )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'validates undefined', () => {
    const result = isHandleStatusResponsesDefined( undefined )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'invalidates other types', () => {
    const types = [ '', 'str', 0, [], {} ]
    for ( let type of types ) {
      const result = isHandleStatusResponsesDefined( type )
      chai.assert.isTrue(
        Validation.Failure.hasInstance( result ),
        `Type (${ type }) shouldn't be valid`,
      )
    }
  } )
} )
