import chai from 'chai'
import Validation from 'folktale/validation'

import isUseOnlyAxiosStatusResponseDefined from '../../src/utils/isUseOnlyAxiosStatusResponseDefined'

describe( 'isUseOnlyAxiosStatusResponseDefined', () => {
  it ( 'validates Boolean false', () => {
    const result = isUseOnlyAxiosStatusResponseDefined( false )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'validates Boolean true', () => {
    const result = isUseOnlyAxiosStatusResponseDefined( true )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'invalidates other types', () => {
    const types = [ null, undefined, () => {}, '', 'str', 0, 1, [], {} ]
    for ( let type of types ) {
      const result = isUseOnlyAxiosStatusResponseDefined( type )
      chai.assert.isTrue(
        Validation.Failure.hasInstance( result ),
        `Type (${ type }) shouldn't be valid`,
      )
    }
  } )
} )
