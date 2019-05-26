import chai from 'chai'
import Validation from 'folktale/validation'

import isBaseUrlDefined from '../../src/utils/isBaseUrlDefined'

describe( 'isBaseUrlDefined', () => {
  it ( 'validates empty url', () => {
    const result = isBaseUrlDefined( '' )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'validates url', () => {
    const result = isBaseUrlDefined( 'http://base.url/api' )
    chai.assert.isTrue( Validation.Success.hasInstance( result ) )
  } )

  it ( 'invalidates types other than String', () => {
    const types = [ null, undefined, [], {}, 0 ]
    for ( let type of types ) {
      const result = isBaseUrlDefined( type )
      chai.assert.isTrue(
        Validation.Failure.hasInstance( result ),
        `Type (${ type }) shouldn't be valid`,
      )
    }
  } )
} )
