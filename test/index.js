// external
import chai           from 'chai'
import sinon          from 'sinon'
import axios          from 'axios'

// internal
import { isGeneratorFn } from '../src/generator'
import shapeshifter, { middlewareOpts } from '../src/middleware'

const createApiAction = name => ({
  type: 'API',
  types: [
    `${name}`,
    `${name}_SUCCESS`,
    `${name}_FAILED`,
  ]
})

describe( 'shapeshifter middleware', () => {
  let store, next, dispatch, middleware, sandbox;

  beforeEach(() => {
    store = {
      dispatch: sinon.spy(),
      getState: () => ({
        user: {
          sessionid: 'abc123'
        }
      })
    }

    middleware = shapeshifter({
      base: 'http://cp.api/v1',
      auth: { user: 'sessionid' }
    })
    next       = store.dispatch
    dispatch   = action => middleware( store )( next )( action )

    sandbox = sinon.sandbox.create()
  })
  afterEach(() => sandbox.restore())

  it ( 'Should set correct options', () => {
    chai.assert.deepEqual( middlewareOpts, {
      base: 'http://cp.api/v1',
      constants: {
        API       : 'API',
        API_ERROR : 'API_ERROR',
        API_VOID  : 'API_VOID'
      },
      auth: { user: 'sessionid' }
    } )
  } )

  it ( 'should ignore action if not of type API', () => {
    const action = { type: 'MISS_ME', payload: {} }
    dispatch( action )
    chai.assert.isTrue( next.called )
    chai.assert.isTrue( next.calledWith( action ) )
  } )

  it ( 'should ignore API action with no payload property', () => {
    const mock = sandbox.mock( console )
    mock.expects( 'error' ).once()

    const action = {
      type: 'API',
      params: {
        user: 'dawaa'
      }
    }

    dispatch( action )
    chai.assert.isTrue( next.called )
    chai.assert.isTrue( next.calledWith( action ) )
    chai.assert.isTrue( mock.verify() )
  } )

  it ( 'should ignore API action with payload property but not a function', () => {
    const mock = sandbox.mock( console )
    mock.expects( 'error' ).once()

    const action = {
      type: 'API',
      payload: {
        url: '/test'
      }
    }

    dispatch( action )
    chai.assert.isTrue( next.called )
    chai.assert.isTrue( next.calledWith( action ) )
    chai.assert.isTrue( mock.verify() )
  } )

  it ( 'should call action.payload() method with dispatch and state', () => {
    const payloadSpy = sinon.spy()
    const action = {
      type: 'API',
      types: [
        'FETCH_USER',
        'FETCH_USER_SUCCESS',
        'FETCH_USER_FAILED'
      ],
      payload: (store) => {
        payloadSpy(store)

        return {
          url: '/users/fetch'
        }
      }
    }

    dispatch( action )

    chai.assert.isTrue( payloadSpy.called )
    chai.assert.isTrue(
      payloadSpy.calledWith({
        dispatch: store.dispatch,
        state:    store.getState()
      })
    )
  } )

  it ( 'should throw an error if payload property doesn\'t return an object', () => {
    const action = {
      type: 'API',
      payload: () => {}
    }

    chai.expect(
      () => dispatch( action )
    ).to.throw( Error )
  } )

  describe( 'axios calls', () => {

    describe( 'Failed API calls', () => {
      it ( 'Let fallback failure() method capture it', done => {
        const payload  = { data: 'Failed to do stuff.' }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const action = {
          ...createApiAction('FETCH_USER'),
          payload: () => ({
            url: '/users/fetch'
          })
        }

        const expectedAction = {
          type: 'API_ERROR',
          message: 'FETCH_USER_FAILED failed.. lol',
          error: 'Failed to do stuff.'
        }

        dispatch( action )

        setTimeout(() => {
          chai.assert.isTrue( store.dispatch.called )
          chai.assert.isTrue( store.dispatch.calledWith( expectedAction ) )
          done()
        })
      } )

      it ( 'Custom failure() method', done => {
        const payload  = {
          data: 'Failed to do stuff, twice.'
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            failure: (type, error) => ({
              type,
              message: 'Failed to fetch a user.',
              error
            })
          })
        }

        const expectedAction = {
          type: 'FETCH_USER_FAILED',
          message: 'Failed to fetch a user.',
          error: 'Failed to do stuff, twice.'
        }

        dispatch( action )

        setTimeout(() => {
          chai.assert.isTrue( store.dispatch.called )
          chai.assert.isTrue( store.dispatch.calledWith( expectedAction ) )
          done()
        })
      } )
    } )

    describe( 'Successful API calls, returning errors', () => {
      it ( 'Should reject with prop `error ', done => {
        sandbox.stub( axios, 'get' )
          .returns(
            new Promise(r => r({
              data: {
                error: 'An error occurred in the back-end, oh danglers!',
                status: 200
              }
            }))
          )

        const failureSpy = sinon.spy()
        const action = {
          ...createApiAction( 'FETCH_USER' ),
          payload: () => ({
            url: '/users/fetch',
            failure: failureSpy
          })
        }

        dispatch( action )

        setTimeout(() => {
          chai.assert.isTrue( failureSpy.called, 'Call failure() when receiving prop `error` from back-end' )
          chai.assert.deepEqual(
            failureSpy.args[ 0 ],
            [
              'FETCH_USER_FAILED',
              'An error occurred in the back-end, oh danglers!'
            ]
          )
          done()
        })
      } )

      it ( 'Should reject with prop `errors` (array)', done => {
        const payload = {
          data: {
            errors: [ 'Reject this one baby', 'Another error' ],
            status: 200
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const failureSpy = sinon.spy()

        const action = {
          ...createApiAction( 'FETCH_USER' ),
          payload: () => ({
            url: '/users/fetch',
            failure: failureSpy
          })
        }

        dispatch( action )

        setTimeout(() => {
          chai.assert.isTrue( failureSpy.called, 'Should call failure()' )
          chai.assert.deepEqual(
            failureSpy.args[ 0 ],
            [
              'FETCH_USER_FAILED',
              '[\"Reject this one baby\",\"Another error\"]'
            ]
          )
          done()
        })
      } )
    } )

    describe( 'Successful API calls', () => {
      it ( 'Successful API call but wrong status code', done => {
        const payload  = {
          data: {
            errors: [ 'Error authorizing or something' ],
            status: 401
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            success: (type, { user: { name } }) => ({
              type,
              firstName: name
            })
          })
        }

        const expectedAction = {
          type: 'API_ERROR',
          message: 'FETCH_USER_FAILED failed.. lol',
          error: JSON.stringify( payload.data.errors )
        }

        dispatch( action )

        setTimeout(() => {
          chai.assert.isTrue( store.dispatch.called )
          chai.assert.isTrue( store.dispatch.calledWith( expectedAction ) )
          done()
        })
      } )

      it ( 'Params should match without auth proprerty', done => {
        const payload  = {
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            params: {
              username: 'dawaa',
              email: 'dawaa@heaven.com'
            },
          })
        }

        const expected = {
          args: {
            params: {
              username: 'dawaa',
              email: 'dawaa@heaven.com'
            }
          }
        }

        dispatch( action )


        setTimeout(() => {
          chai.assert.deepEqual( axios.get.args[ 0 ][ 1 ], expected.args )
          done()
        })
      } )

      it ( 'Params should match with auth proprerty', done => {
        const payload  = {
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            params: {
              username: 'dawaa',
              email: 'dawaa@heaven.com'
            },
            auth: true
          })
        }

        const expected = {
          args: {
            params: {
              username: 'dawaa',
              email: 'dawaa@heaven.com',
              sessionid: 'abc123'
            }
          }
        }

        dispatch( action )


        setTimeout(() => {
          chai.assert.deepEqual( axios.get.args[ 0 ][ 1 ], expected.args )
          done()
        })
      } )

      it ( 'Success() method should be called with (type, payload, meta = store)', done => {
        const payload  = {
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const spy = sinon.spy()

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            success: spy,
            auth: true
          })
        }

        const expected = [
          // type
          'FETCH_USER_SUCCESS',
          // payload
          {
            user: { name: 'Alejandro' },
            status: 200
          },
          // meta = store
          {
            dispatch: store.dispatch,
            getState: store.getState,
            state: store.getState()
          },
          // store = null
          null
        ]

        dispatch( action )


        setTimeout(() => {
          chai.assert.isTrue( spy.called, 'payload.success() was called' )
          chai.assert.deepEqual( spy.args[ 0 ], expected )
          done()
        })
      } )

      it ( 'Success() method should be called with (type, payload, meta, store)', done => {
        const payload  = {
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const spy = sinon.spy()

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            success: spy,
            auth: true
          }),
          meta: {
            args: {
              extraParameter: 'This is an extra param!'
            }
          }
        }

        const expected = [
          // type
          'FETCH_USER_SUCCESS',
          // payload
          {
            user: { name: 'Alejandro' },
            status: 200
          },
          // meta
          {
            args: {
              extraParameter: 'This is an extra param!'
            }
          },
          // store
          {
            dispatch: store.dispatch,
            getState: store.getState,
            state: store.getState()
          }
        ]

        dispatch( action )


        setTimeout(() => {
          chai.assert.isTrue( spy.called )
          chai.assert.deepEqual( spy.args[ 0 ], expected )
          done()
        })
      } )

      it ( 'Should be fine with 204 status (empty response)', done => {
        const payload  = {
          data: {
            error: null,
            errors: null,
            message: 'No upcoming and confirmed lessons found.',
            status: 204
          }
        }
        const resolved = new Promise(r => r(payload))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const spy = sinon.spy()

        const action = {
          type: 'API',
          types: [
            'FETCH_NEXT_CLASS',
            'FETCH_NEXT_CLASS_SUCCESS',
            'FETCH_NEXT_CLASS_FAILED'
          ],
          payload: () => ({
            url: '/bookings/123/nextClass',
            success: spy,
            auth: true
          }),
        }

        dispatch( action )

        setTimeout(() => {
          chai.assert.isTrue( spy.called )
          done()
        })
      } )

      it ( 'Merge params to meta parameter', done => {
        const payload  = {
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const spy = sinon.spy()

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            params: {
              userName: 'dawaa'
            },
            success: spy,
            auth: true
          }),
          meta: {
            mergeParams: true,
            args: {
              extraParameter: 'This is an extra param!'
            }
          }
        }

        const expected = [
          // type
          'FETCH_USER_SUCCESS',
          // payload
          {
            user: { name: 'Alejandro' },
            status: 200
          },
          // meta
          {
            mergeParams: true,
            params: {
              userName: 'dawaa',
              sessionid: 'abc123'
            },
            args: {
              extraParameter: 'This is an extra param!'
            }
          },
          // store
          {
            dispatch: store.dispatch,
            getState: store.getState,
            state: store.getState()
          }
        ]

        dispatch( action )


        setTimeout(() => {
          chai.assert.isTrue( spy.called )
          chai.assert.deepEqual( spy.args[ 0 ], expected )
          done()
        })
      } )


      it ( 'Dispatch basic user firstName', done => {
        const payload  = {
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            success: (type, { user: { name } }) => ({
              type,
              firstName: name
            }),
            auth: true
          })
        }

        const expected = {
          action: {
            type: 'FETCH_USER_SUCCESS',
            firstName: 'Alejandro'
          },
          args: {
            params: {
              sessionid: 'abc123'
            }
          }
        }

        dispatch( action )


        setTimeout(() => {
          chai.assert.isTrue( store.dispatch.called )
          chai.assert.isTrue( store.dispatch.calledWith( expected.action ) )
          chai.assert.deepEqual( axios.get.args[ 0 ][ 1 ], expected.args )
          done()
        })
      } )

      it ( 'Should run tapBeforeCall()', done => {
        const payload  = {
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const spy = sinon.spy()

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            params: {
              randomThought: 'Shower is taking a stand up bath'
            },
            tapBeforeCall: (store) => {
              spy(store)
            },
            success: (type, { user: { name } }) => ({
              type,
              firstName: name
            }),
            auth: true
          })
        }

        const expectedParams = {
          params: {
            randomThought: 'Shower is taking a stand up bath',
            sessionid: 'abc123'
          },
          dispatch: store.dispatch,
          state: store.getState(),
          getState: store.getState
        }

        dispatch( action )


        setTimeout(() => {
          chai.assert.isTrue( spy.called )
          chai.assert.isTrue( spy.calledOnce )
          chai.assert.deepEqual( spy.args[ 0 ][ 0 ], expectedParams )
          done()
        })
      } )

    } )

    describe( 'Successful API calls generators', () => {
      it ( 'Not a valid generator funciton', () => {
        const fn = () => {}
        chai.assert.isFalse( isGeneratorFn( fn ) )
      } )

      it ( 'Valid generator function', () => {
        const fn = function* () {}
        chai.assert.isTrue( isGeneratorFn( fn ) )
      } )

      it ( 'Success generator function should yield API_VOID', done => {
        const payload  = {
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            success: function* (type, payload) {
              const string  = yield "A string"
            },
            auth: true
          })
        }

        const expected = {
          type: 'API_VOID',
          LAST_ACTION: 'FETCH_USER'
        }

        dispatch( action )

        setTimeout(() => {
          chai.assert.isTrue( store.dispatch.called )
          chai.assert.deepEqual( store.dispatch.args[ 0 ][ 0 ], expected )
          done()
        })
      } )

      it ( 'should yield SUCCESS with payload', done => {
        const payload  = {
          data: {
            user: { name: 'Alejandro' },
            status: 200,
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            success: function* (type, { user }) {
              const fakePayload = { data: { user: { id: 1 }} }
              const response    = yield new Promise(r => r( fakePayload ))

              return {
                type,
                id: response.data.user.id
              }
            },
            auth: true
          })
        }

        const expected = {
          type: 'FETCH_USER_SUCCESS',
          id: 1
        }

        dispatch( action )

        setTimeout(() => {
          chai.assert.isTrue( store.dispatch.called, 'store.dispatch() was called' )
          chai.assert.deepEqual(
            store.dispatch.args[ 0 ][ 0 ],
            expected,
            'Dispatch params match expected literal object'
          )
          done()
        })
      } )

      it ( 'Success generator function should dispatch multiple actions and return VOID', done => {
        const payload  = {
          data: {
            user: { name: 'Alejandro', id: 1 },
            status: 200
          }
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            success: function* (type, { user }, { dispatch, state }) {
              dispatch({ type: 'FETCH_AVATAR', sessionid: state.user.sessionid })
              dispatch({ type: 'FETCH_MESSAGES', id: user.id })
              dispatch({ type: 'FETCH_TEACHERS' })
            },
            auth: true
          })
        }

        const expected = {
          type: 'API_VOID',
          LAST_ACTION: 'FETCH_USER'
        }

        dispatch( action )

        setTimeout(() => {
          chai.assert.strictEqual( store.dispatch.callCount, 4 )
          chai.assert.deepEqual(
            store.dispatch.getCall( 0 ).args[ 0 ],
            {
              type: 'FETCH_AVATAR',
              sessionid: 'abc123'
            }
          )
          chai.assert.deepEqual(
            store.dispatch.getCall( 1 ).args[ 0 ],
            {
              type: 'FETCH_MESSAGES',
              id: 1
            }
          )
          chai.assert.deepEqual(
            store.dispatch.getCall( 2 ).args[ 0 ],
            {
              type: 'FETCH_TEACHERS'
            }
          )
          chai.assert.deepEqual( store.dispatch.lastCall.args[ 0 ], expected )
          done()
        })
      } )

      it ( 'Success generator function should throw error and not call dispatch', done => {
        const resolved = new Promise(r => r( { data: { status: 200 } } ))
        sandbox.stub( axios, 'get' ).returns( resolved )
        const mock = sandbox.mock( console )

        mock.expects( 'error' ).once();

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          payload: () => ({
            url: '/users/fetch',
            success: function* () {
              yield () => { throw 'Ugh' }
            },
            auth: true
          })
        }

        dispatch( action )

        setTimeout(() => {
          chai.assert.isTrue( store.dispatch.notCalled )
          chai.assert.isTrue( mock.verify() )
          done()
        })
      } )
    } )

  } )

} )
