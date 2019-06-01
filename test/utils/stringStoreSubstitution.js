import chai from 'chai'
import sinon from 'sinon'

import stringStoreSubstitution from '../../src/utils/stringStoreSubstitution'

const sandbox = sinon.createSandbox()

describe( 'stringStoreSubstitution', () => {
  let store

  beforeEach(() => {
    store = {
      id: 1,
      favoriteMeal: 'chicken',
      information: {
        name: 'BabyJesus',
        age: 3,
        interests: {
          god: true,
          crosses: false,
        }
      },
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  it ( 'replaces shallow prop', () => {
    const result = stringStoreSubstitution( store, 'Jesus has id=#id' )
    const expected = 'Jesus has id=1'

    chai.assert.strictEqual( result, expected )
  } )

  it ( 'replaces two shallow props', () => {
    const result = stringStoreSubstitution( store, 'Jesus has id=#id and loves #favoriteMeal' )
    const expected = 'Jesus has id=1 and loves chicken'

    chai.assert.strictEqual( result, expected )
  } )

  it ( 'replaces one shallow and one nested', () => {
    const result = stringStoreSubstitution( store, 'Jesus has id=#id and he is only #information.age years old' )
    const expected = 'Jesus has id=1 and he is only 3 years old'

    chai.assert.strictEqual( result, expected )
  } )

  it ( 'replaces one deep nested and one nested', () => {
    const result = stringStoreSubstitution( store, 'Are crosses cool? #information.interests.crosses, yup #information.name doesn\'t like them!' )
    const expected = 'Are crosses cool? false, yup BabyJesus doesn\'t like them!'

    chai.assert.strictEqual( result, expected )
  } )

  it ( 'only replaces one out of two hashtags following each other', () => {
    const result = stringStoreSubstitution( store, 'His placement is ##id' )
    const expected = 'His placement is #1'

    chai.assert.strictEqual( result, expected )
  } )

  it ( 'warns when trying to substitute missing store key', () => {
    process.env.NODE_ENV = ''
    const mock = sandbox.mock( console ).expects( 'warn' ).once()

    const result = stringStoreSubstitution( store, 'My religion is #religion' )

    mock.verify()
    process.env.NODE_ENV = 'test'
  } )

  it ( 'returns unchanged value on missing store key', () => {
    const result = stringStoreSubstitution( store, 'My religion is #religion' )
    const expected = 'My religion is #religion'

    chai.assert.strictEqual( result, expected )
  } )
} )
