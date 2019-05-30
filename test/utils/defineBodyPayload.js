import chai from 'chai'
import Result from 'folktale/result'

import defineBodyPayload from '../../src/utils/defineBodyPayload'

describe( 'defineBodyPayload', () => {
  it ( 'returns Result.Ok({ params: parameters })', () => {
    const result = defineBodyPayload( 'get', { test: true } )
    chai.assert.isTrue( Result.Ok.hasInstance( result ) )
    chai.assert.deepEqual(
      result.merge(),
      {
        params: {
          test: true,
        },
      },
      'Should wrap parameters with params property',
    )
  } )

  it ( 'returns Result.Ok({ data: { ...parameters } })', () => {
    const bodyMethods = [ 'post', 'put', 'patch', 'delete' ]

    for ( let method of bodyMethods ) {
      const result = defineBodyPayload( method, { test: true } )
      chai.assert.isTrue( Result.Ok.hasInstance( result ) )
      chai.assert.deepEqual(
        result.merge(),
        {
          data: {
            test: true,
          },
        },
        'Should wrap parameters with `data`-property',
      )
    }
  } )

  it ( 'returns Result.Error if not matching any method', () => {
    const result = defineBodyPayload( 'non-existent-method', { test: true } )
    chai.assert.isTrue( Result.Error.hasInstance( result ) )
  } )

  it ( 'returns Result.Ok({ params: {} })', () => {
    const result = defineBodyPayload( 'get' )
    chai.assert.isTrue( Result.Ok.hasInstance( result ) )
  } )
} )
