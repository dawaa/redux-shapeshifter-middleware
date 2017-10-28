// external
import chai           from 'chai'
import sinon          from 'sinon'
import axios          from 'axios'

// internal
import { isGeneratorFn } from '../src/generator'
import shapeshifter      from '../src/middleware'

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

    middleware = shapeshifter({ base: 'http://cp.api/v1' })
    next       = store.dispatch
    dispatch   = action => middleware( store )( next )( action )

    sandbox = sinon.sandbox.create()
  })
  afterEach(() => sandbox.restore())


  it ( 'should ignore action if not of type API', () => {
    const action = { type: 'MISS_ME', payload: {} }
    dispatch( action )
    chai.assert.isTrue( next.called )
    chai.assert.isTrue( next.calledWith( action ) )
  } )

  it ( 'should ignore API action with no payload property', () => {
    const action = {
      type: 'API',
      params: {
        user: 'dawaa'
      }
    }

    dispatch( action )
    chai.assert.isTrue( next.called )
    chai.assert.isTrue( next.calledWith( action ) )
  } )

  it ( 'should ignore API action with payload property but not a function', () => {
    const action = {
      type: 'API',
      payload: {
        url: '/test'
      }
    }

    dispatch( action )
    chai.assert.isTrue( next.called )
    chai.assert.isTrue( next.calledWith( action ) )
  } )

  it ( 'should call action.payload() method with dispatch and state', () => {
    const payloadSpy = sinon.spy()
    const action = {
      type: 'API',
      payload: (store) => {
        payloadSpy(store)

        return {
          url: '/users/fetch',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ]
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
        const payload  = {
          data: 'Failed to do stuff.'
        }
        const resolved = new Promise(r => r( payload ))
        sandbox.stub( axios, 'get' ).returns( resolved )

        const action = {
          type: 'API',
          payload: () => ({
            url: '/users/fetch',
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ]
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
          payload: () => ({
            url: '/users/fetch',
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ],
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
        payload: () => ({
          url: '/users/fetch',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
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


    describe( 'Successful API calls', () => {
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
          payload: () => ({
            url: '/users/fetch',
            params: {
              username: 'dawaa',
              email: 'dawaa@heaven.com'
            },
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ]
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
          payload: () => ({
            url: '/users/fetch',
            params: {
              username: 'dawaa',
              email: 'dawaa@heaven.com'
            },
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ],
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
          payload: () => ({
            url: '/users/fetch',
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ],
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
          chai.assert.isTrue( spy.called )
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
          payload: () => ({
            url: '/users/fetch',
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ],
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
          payload: () => ({
            url: '/users/fetch',
            params: {
              userName: 'dawaa'
            },
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ],
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
          payload: () => ({
            url: '/users/fetch',
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ],
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
          payload: () => ({
            url: '/users/fetch',
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ],
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

      it ( 'Success generator function should yield SUCCESS with payload', done => {
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
          payload: () => ({
            url: '/users/fetch',
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ],
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
          chai.assert.isTrue( store.dispatch.called )
          chai.assert.deepEqual( store.dispatch.args[ 0 ][ 0 ], expected )
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
          payload: () => ({
            url: '/users/fetch',
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ],
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
          payload: () => ({
            url: '/users/fetch',
            types: [
              'FETCH_USER',
              'FETCH_USER_SUCCESS',
              'FETCH_USER_FAILED'
            ],
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
