// external
import chai  from 'chai'
import sinon from 'sinon'

// internal
import recursiveObjFind from '../src/recursiveObjFind'

describe ( 'Recursive Object Find module', () => {
  let state;

  beforeEach(() => {
    state = {
      user: {
        sessionid: 'abc123',
        teacher: true,
        student: false
      }
    }
  })

  afterEach(() => state = null)

  it ( 'Should return correct value from a deep object', () => {
    chai.assert.deepEqual(
      recursiveObjFind( state, { user: 'sessionid' } ),
      { sessionid: 'abc123' },
      'Returns object by passing in an object with string pointer'
    )
  } )

  it ( 'Should return correct values from a deep object', () => {
    chai.assert.deepEqual(
      recursiveObjFind(
        state,
        {
          user: {
            sessionid: true,
            teacher: true
          }
        }
      ),
      {
        sessionid: 'abc123',
        teacher: true
      },
      'Returns object by passing in an object'
    )
  } )

  it ( 'Should throw error if declined prop is found', () => {
    chai.expect(
      () => recursiveObjFind(
        state,
        {
          user: {
            sessionid: true,
            student: false
          }
        }
      )
    )
    .to.throw( Error )
  } )

  it ( 'Should console.warn if required prop wasn\'t found', () => {
    const mock = sinon.mock( console )
    mock.expects( 'warn' ).once()

    const findings = recursiveObjFind(
      state,
      {
        user: {
          sessionid: true,
          missingProperty: true
        }
      }
    )

    chai.assert.deepEqual(
      findings,
      { sessionid: 'abc123' },
      'Only found props are returned'
    )

    chai.assert.isTrue( mock.verify(), 'Should call console.warn once' )

    mock.restore()
  } )
} )
