import chai from 'chai'
import Validation from 'folktale/validation'

import isFallbackToAxiosStatusResponseDefined from '../../src/utils/isFallbackToAxiosStatusResponseDefined'

describe( 'isFallbackToAxiosStatusResponseDefined', () => {
  it ( 'validates Boolean false', () => {
    const result = isFallbackToAxiosStatusResponseDefined( false )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'validates Boolean true', () => {
    const result = isFallbackToAxiosStatusResponseDefined( true )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'invalidates other types', () => {
    const types = [ null, undefined, () => {}, '', 'str', 0, 1, [], {} ]
    for ( let type of types ) {
      const result = isFallbackToAxiosStatusResponseDefined( type )
      chai.assert.isTrue(
        Validation.Failure.hasInstance( result ),
        `Type (${ type }) shouldn't be valid`,
      )
    }
  } )
} )
