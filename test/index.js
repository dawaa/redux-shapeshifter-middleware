// external
import chai                   from 'chai'
import sinon                  from 'sinon'
import axios, { CancelToken } from 'axios'
import sinonChai              from 'sinon-chai'
import decache                from 'decache'
chai.use( sinonChai )

// internal
import { isGeneratorFn } from '../src/generator'
import shapeshifter, {
  middlewareOpts,
  addToStack,
  removeFromStack
} from '../src/middleware'
import * as callStack from '../src/callStack'
// import * as mdw from '../src/middleware'

const createApiAction = name => ({
  type: 'API',
  types: [
    `${name}`,
    `${name}_SUCCESS`,
    `${name}_FAILED`,
  ]
})

let store, next, dispatch, middleware, sandbox = sinon.sandbox.create();
const defaultConfig = { base: 'http://cp.api/v1', auth: { user: 'sessionid' } }
const setupMiddleware = (opts = defaultConfig) => {
  store = {
    dispatch: sinon.spy(),
    getState: () => ({
      user: {
        sessionid : 'abc123',
        token     : 'verylongsupersecret123token456',
      }
    })
  }

  middleware = shapeshifter( opts )
  next       = store.dispatch
  dispatch   = action => middleware( store )( next )( action )
}

const stubAxiosReturn = ({ method = 'get', ...fake }) => {
  const p    = new Promise( r => r( fake ) )
  const stub = sandbox.stub( axios, method ).returns( p )
  return {
    promise : p,
    stub    : stub,
  }
}

describe( 'shapeshifter middleware', () => {
  beforeEach(() => {
    setupMiddleware()
  })
  afterEach(() => {
    sandbox.restore()
    decache( '../src/callStack' )
    decache( '../src/middleware' )
    decache( '../src/generator' )
  })

  it ( 'Should set correct options', () => {
    chai.assert.deepEqual( middlewareOpts, {
      base: 'http://cp.api/v1',
      constants: {
        API       : 'API',
        API_ERROR : 'API_ERROR',
        API_VOID  : 'API_VOID'
      },
      auth: { user: 'sessionid' },
      fallbackToAxiosStatusResponse: true,
    } )
  } )

  it ( 'Should set headers within `auth` prop and successfully replace values with store values', () => {
    stubAxiosReturn({})
    setupMiddleware({
      base : 'http://cp.api/v1',
      auth : {
        headers : {
          'Authorization' : 'Bearer #user.token'
        }
      }
    })

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url  : '/users/fetch',
        auth : true, // Note this is important if we want to actually
                     // make sure the middleware looks at the Store
      })
    }

    dispatch( action )
      .finally(() => {
        chai.assert.deepEqual(
          middlewareOpts,
          {
            base : 'http://cp.api/v1',
            constants: {
              API       : 'API',
              API_ERROR : 'API_ERROR',
              API_VOID  : 'API_VOID',
            },
            auth : {
              headers : {
                'Authorization' : 'Bearer verylongsupersecret123token456',
              }
            },
            fallbackToAxiosStatusResponse: true,
          }
        )
      })
  } )

  it ( 'should pass headers correctly to Axios call', () => {
    setupMiddleware({
      base : 'http://cp.api/v1',
      auth : {
        headers : {
          'Authorization' : 'Bearer #user.token'
        }
      }
    })
    const { stub } = stubAxiosReturn({
      data: {
        status: 200
      }
    })

    const tokenSpy        = sinon.spy()
    const cancelSpy       = sinon.spy()
    const stubCancelToken = sandbox.stub( CancelToken, 'source' ).returns({
        token  : tokenSpy,
        cancel : cancelSpy,
      })

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url  : '/users/fetch',
        auth : true, // Note this is important if we want to actually
                     // make sure the middleware looks at the Store
      })
    }

    const expectedAxiosParams = {
      config : {
        headers : {
          Authorization : 'Bearer verylongsupersecret123token456',
        },
        params  : {
          cancelToken : tokenSpy,
        }
      }
    }

    dispatch( action )
      .finally(() => {
        chai.assert.deepEqual(
          stub.args[ 0 ][ 1 ],
          expectedAxiosParams.config,
          'The passed in config to Axios should match and should\'ve passed in Authorization header.'
        )
      })
  } )

  it ( 'should correctly pass options to axios config parameter', () => {
    // We are going to set the base ourselves through Axios config parameter
    setupMiddleware({ base: '' })
    const { stub } = stubAxiosReturn({ data: { status: 200 } })

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url  : '/users/fetch',
      }),
      axios: {
        baseURL : 'http://test.base',
        headers : {
          'custom-header': 'very custom yaaaas'
        },
        params  : {
          id: 1,
          user: 'dawaa',
        }
      }
    }

    dispatch( action )
      .finally(() => {
        const [ url, config ] = stub.args[ 0 ]
        chai.assert.strictEqual(
          'http://test.base/users/fetch',
          url,
          'Should be possible to set baseURL through axios parameter'
        )
        chai.assert.deepEqual(
          action.axios,
          config,
          'Should add Axios config to our config/params parameter in our Axios call'
        )
      })

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

    it ( 'Should add call to callStack and remove on success', () => {
      const payload  = { data: { name: 'Alejandro', status: 200 } }
      const resolved = new Promise(r => r( payload ))
      sandbox.stub( axios, 'get' ).returns( resolved )
      const addToStackSpy = sandbox.spy( callStack, 'addToStack' )

      const action = {
        ...createApiAction( 'FETCH_USER' ),
        payload: () => ({
          url: '/users/fetch'
        })
      }

      dispatch( action )

      chai.assert.isTrue(
        addToStackSpy.calledOnce,
        '#addToStack should\'ve been called once'
      )
      chai.assert.strictEqual(
        addToStackSpy.callCount,
        1,
        'Should have been called once'
      )
      chai.assert.deepPropertyVal(
        addToStackSpy.lastCall.args[ 0 ],
        'call',
        'FETCH_USER'
      )
    } )

    it ( 'Should cancel call if new one is made', () => {
      const payload  = { data: { name: 'Alejandro', status: 200 } }
      const resolved = new Promise(r => {
        setTimeout(() => {
          r( payload )
        }, 3000)
      })

      const resolved2 = new Promise(r => r( payload ))

      sandbox.stub( axios, 'get' )
        .onFirstCall().returns( resolved )
        .onSecondCall().returns( resolved2 )
      const addToStackSpy = sandbox.spy( callStack, 'addToStack' )


      const action = {
        ...createApiAction( 'FETCH_USER' ),
        payload: () => ({
          url: '/users/fetch'
        })
      }
      const actionTwo = {
        ...createApiAction( 'FETCH_USER' ),
        payload: () => ({
          url: '/users/fetch'
        })
      }

      dispatch( action )

      const firstCall = addToStackSpy.firstCall
      const firstActionCancelSpy = sandbox.spy( firstCall.args[ 0 ], 'cancel' )

      dispatch( actionTwo )

      chai.assert.isTrue(
        firstActionCancelSpy.called,
        'First dispatched Action should have been cancelled.'
      )
    } )

    describe( 'Failed API calls', () => {
      it ( 'Let fallback failure() method capture it', () => {
        stubAxiosReturn({ data: 'Failed to do stuff.' })

        const action = {
          ...createApiAction( 'FETCH_USER' ),
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
          .finally(() => {})
          .then(() => {
            chai.assert.isTrue( store.dispatch.called, 'Dispatch should\'ve been called' )
            chai.assert.deepEqual(
              store.dispatch.firstCall.args[ 0 ],
              expectedAction,
              'Dispatch should have been called with expectedAction'
            )
          })
      } )

      it ( 'Custom failure() method', () => {
        stubAxiosReturn({ data: 'Failed to do stuff, twice.' })

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
          .finally(() => {})
          .then(() => {
            chai.assert.isTrue( store.dispatch.called )
            chai.assert.isTrue( store.dispatch.calledWith( expectedAction ) )
          })
      } )
    } )

    describe( 'Successful API calls, returning errors', () => {
      it ( 'Should reject with prop `error ', () => {
        stubAxiosReturn({
          data: {
            error: 'An error occurred in the back-end, oh danglers!',
            status: 200
          }
        })

        const failureSpy = sinon.spy()
        const action = {
          ...createApiAction( 'FETCH_USER' ),
          payload: () => ({
            url: '/users/fetch',
            failure: failureSpy
          })
        }

        dispatch( action )
          .finally(() => {})
          .then(() => {
            chai.assert.isTrue(
              failureSpy.called,
              'Call failure() when receiving prop `error` from back-end'
            )
            chai.assert.deepEqual(
              failureSpy.args[ 0 ],
              [
                'FETCH_USER_FAILED',
                'An error occurred in the back-end, oh danglers!'
              ]
            )
          })
      } )

      it ( 'Should reject with prop `errors` (array)', () => {
        stubAxiosReturn({
          data: {
            errors: [ 'Reject this one baby', 'Another error' ],
            status: 200
          }
        })

        const failureSpy = sinon.spy()

        const action = {
          ...createApiAction( 'FETCH_USER' ),
          payload: () => ({
            url: '/users/fetch',
            failure: failureSpy
          })
        }

        dispatch( action )
          .finally(() => {})
          .then(() => {
            chai.assert.isTrue( failureSpy.called, 'Should call failure()' )
            chai.assert.deepEqual(
              failureSpy.args[ 0 ],
              [
                'FETCH_USER_FAILED',
                '[\"Reject this one baby\",\"Another error\"]'
              ]
            )
          })
      } )
    } )

    describe( 'Successful API calls', () => {
      it ( 'Successful API call but wrong status code', () => {
        stubAxiosReturn({
          data: {
            errors: [ 'Error authorizing or something' ],
            status: 401
          }
        })

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
          type    : 'API_ERROR',
          message : 'FETCH_USER_FAILED failed.. lol',
          error   : JSON.stringify( [ 'Error authorizing or something' ] ),
        }

        dispatch( action )
          .finally(() => {})
          .then(() => {
            chai.assert.isTrue( store.dispatch.called )
            chai.assert.isTrue( store.dispatch.calledWith( expectedAction ) )
          })
      } )

      it ( 'Params should match without auth proprerty', () => {
        stubAxiosReturn({
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        })
        const tokenSpy  = sinon.spy()
        const cancelSpy = sinon.spy()
        const stubCancelToken = sandbox
          .stub( CancelToken, 'source' )
          .returns({
            token  : tokenSpy,
            cancel : cancelSpy,
          })

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
              username    : 'dawaa',
              email       : 'dawaa@heaven.com',
              cancelToken : tokenSpy
            }
          }
        }

        dispatch( action )
          .finally(() => {})
          .then(() => {
            chai.assert.deepEqual( axios.get.args[ 0 ][ 1 ], expected.args )
          })
      } )

      it ( 'Params should match with auth property', () => {
        stubAxiosReturn({
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        })
        const tokenSpy  = sinon.spy()
        const cancelSpy = sinon.spy()
        const stubCancelToken = sandbox
          .stub( CancelToken, 'source' )
          .returns({
            token  : tokenSpy,
            cancel : cancelSpy,
          })

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
              username    : 'dawaa',
              email       : 'dawaa@heaven.com',
              sessionid   : 'abc123',
              cancelToken : tokenSpy,
            }
          }
        }

        dispatch( action )
          .finally()
          .then(() => {
            chai.assert.deepEqual( axios.get.args[ 0 ][ 1 ], expected.args )
          })
      } )

      it ( 'Success() method should be called with (type, payload, meta = store)', () => {
        stubAxiosReturn({
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        })

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
          .finally(() => {
            chai.assert.isTrue( spy.called, 'payload.success() was called' )
            chai.assert.deepEqual( spy.args[ 0 ], expected )
          })
      } )

      it ( 'Success() method should be called with (type, payload, meta, store)', () => {
        stubAxiosReturn({
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        })

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
          .finally(() => {
            chai.assert.isTrue( spy.called )
            chai.assert.deepEqual( spy.args[ 0 ], expected )
          })
      } )

      it ( 'Should be fine with 204 status (empty response)', () => {
        stubAxiosReturn({
          data: {
            error: null,
            errors: null,
            message: 'No upcoming and confirmed lessons found.',
            status: 204
          }
        })

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
          .finally(() => {
            chai.assert.isTrue( spy.called )
          })
      } )

      it ( 'Merge params to meta parameter', () => {
        stubAxiosReturn({
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        })

        const spy       = sinon.spy()
        const tokenSpy  = sinon.spy()
        const cancelSpy = sinon.spy()
        const stubCancelToken = sandbox.stub( CancelToken, 'source' ).returns({
          token  : tokenSpy,
          cancel : cancelSpy,
        })

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
              userName    : 'dawaa',
              sessionid   : 'abc123',
              cancelToken : tokenSpy
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
          .finally(() => {
            chai.assert.isTrue( spy.called )
            chai.assert.deepEqual( spy.args[ 0 ], expected )
          })
      } )


      it ( 'Dispatch basic user firstName', () => {
        stubAxiosReturn({
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        })
        const tokenSpy  = sinon.spy()
        const cancelSpy = sinon.spy()
        const stubCancelToken = sandbox.stub( CancelToken, 'source' ).returns({
          token  : tokenSpy,
          cancel : cancelSpy,
        })

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
              sessionid   : 'abc123',
              cancelToken : tokenSpy,
            }
          }
        }

        dispatch( action )
          .finally(() => {
            chai.assert.isTrue( store.dispatch.called )
            chai.assert.isTrue( store.dispatch.calledWith( expected.action ) )
            chai.assert.deepEqual( axios.get.args[ 0 ][ 1 ], expected.args )
          })
      } )

      it ( 'Should run tapBeforeCall()', () => {
        stubAxiosReturn({
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        })

        const spy       = sinon.spy()
        const tokenSpy  = sinon.spy()
        const cancelSpy = sinon.spy()
        const stubCancelToken = sandbox.stub( CancelToken, 'source' ).returns({
          token  : tokenSpy,
          cancel : cancelSpy,
        })

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
            randomThought : 'Shower is taking a stand up bath',
            sessionid     : 'abc123',
            cancelToken   : tokenSpy,
          },
          dispatch: store.dispatch,
          state: store.getState(),
          getState: store.getState
        }

        dispatch( action )
          .finally(() => {
            chai.assert.isTrue( spy.called )
            chai.assert.isTrue( spy.calledOnce )
            chai.assert.deepEqual( spy.args[ 0 ][ 0 ], expectedParams )
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
