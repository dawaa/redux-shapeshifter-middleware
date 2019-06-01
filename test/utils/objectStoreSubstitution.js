import chai from 'chai'

import objectStoreSubstitution from '../../src/utils/objectStoreSubstitution'

describe( 'objectStoreSubstitution', () => {
  let store

  beforeEach(() => {
    store = {
      id: 1,
      name: 'BabyJesus',
      favoriteMeal: 'chicken',
    }
  })

  it ( 'substitutes object and returns new object', () => {
    const obj = { someValue: '#id' }

    const result = objectStoreSubstitution( store, obj )

    chai.assert.notDeepEqual( result, obj )
  } )

  it ( 'substitutes object values with store values', () => {
    const obj = {
      someValue: '#id',
      query: '?name=#name&food=#favoriteMeal',
    }

    const result = objectStoreSubstitution( store, obj )
    const expected = {
      someValue: '1',
      query: '?name=BabyJesus&food=chicken',
    }

    chai.assert.deepEqual( result, expected )
  } )

  it ( 'leaves value unchanged on missing store key', () => {
    const obj = {
      missingValue: '#senseOfHumor',
    }

    const result = objectStoreSubstitution( store, obj )

    chai.assert.deepEqual( result, obj )
  } )

  it ( 'substitute one and leaves one value unchanged', () => {
    const obj = {
      missingValue: '#name has a good #senseOfHumor',
    }

    const result = objectStoreSubstitution( store, obj )

    const expected = {
      missingValue: 'BabyJesus has a good #senseOfHumor',
    }

    chai.assert.deepEqual( result, expected )
  } )
} )
