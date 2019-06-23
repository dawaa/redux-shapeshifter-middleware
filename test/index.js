// external
import chai                   from 'chai'
import sinon                  from 'sinon'
import axios, { CancelToken } from 'axios'
import sinonChai              from 'sinon-chai'
import chaiAsPromised         from 'chai-as-promised'
import decache                from 'decache'
chai.use( sinonChai )
chai.use( chaiAsPromised )
sinon.assert.expose(chai.assert, { prefix: '' })

// internal
import flushPromises     from '../src/flushPromises'
import { isGeneratorFn } from '../src/generator'
import shapeshifter, {
  middlewareOpts,
  addToStack,
  removeFromStack,
  urlETags,
} from '../src/middleware'
import * as callStack from '../src/callStack'
import { MiddlewareOptionsValidationError } from '../src/utils/validateMiddlewareOptions'
import ResponseWithError from '../src/errors/ResponseWithError'
import ResponseWithErrors from '../src/errors/ResponseWithErrors'
import ResponseErrorMessage from '../src/errors/ResponseErrorMessage'
import ResponseWithBadStatusCode from '../src/errors/ResponseWithBadStatusCode'
import ResponseRepeatReject from '../src/errors/ResponseRepeatReject'

const { assert } = chai

const createApiAction = name => ({
  type: 'API',
  types: [
    `${name}`,
    `${name}_SUCCESS`,
    `${name}_FAILED`,
  ]
})

let store, next, dispatch, middleware, sandbox = sinon.createSandbox();
const defaultConfig = { base: 'http://some.api/v1', auth: { user: 'sessionid' } }
const setupMiddleware = (opts = defaultConfig) => {
  store = {
    dispatch: sandbox.stub(),
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


const stubApiResponse = payload => {
  return sandbox.stub( axios, 'request' ).resolves( payload )
}

describe( 'shapeshifter middleware', () => {
  var mockToken;
  var mockCancel;

  function mockCancelToken() {}
  mockCancelToken.prototype.throwIfRequested = sandbox.spy()
  mockToken = new mockCancelToken()
  mockCancel = sandbox.spy()

  beforeEach(() => {
    setupMiddleware()

    sandbox
      .stub( CancelToken, 'source' )
      .callsFake(() => {
        return {
          token  : mockToken,
          cancel : mockCancel,
        }
      })
  })

  afterEach(() => {
    sandbox.restore()
    decache( '../src/callStack' )
    decache( '../src/middleware' )
    decache( '../src/generator' )
  })

  it ( 'Should set correct options', () => {
    chai.assert.deepEqual( middlewareOpts, {
      base: 'http://some.api/v1',
      constants: {
        API       : 'API',
        API_ERROR : 'API_ERROR',
        API_VOID  : 'API_VOID'
      },
      auth: { user: 'sessionid' },
      handleStatusResponses: null,
      fallbackToAxiosStatusResponse: true,
      customSuccessResponses: null,
      useOnlyAxiosStatusResponse: false,
      useETags: false,
      emitRequestType: false,
      useFullResponseObject: false,
      warnOnCancellation: false,
    } )
  } )

  it ( 'Should set headers within `auth` prop and successfully replace values with store values', async () => {
    stubApiResponse({})
    setupMiddleware({
      base : 'http://some.api/v1',
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

    await assert.isRejected(dispatch( action ), new ResponseErrorMessage())

    assert.deepEqual(
      middlewareOpts,
      {
        base : 'http://some.api/v1',
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
        handleStatusResponses: null,
        fallbackToAxiosStatusResponse: true,
        customSuccessResponses: null,
        useOnlyAxiosStatusResponse: false,
        useETags: false,
        emitRequestType: false,
        useFullResponseObject: false,
        warnOnCancellation: false,
      }
    )
  } )

  it ( 'should ignore other rules if `useOnlyAxiosStatusResponse` is set to true', async () => {
    setupMiddleware({
      base : 'http://some.api/v1',
      fallbackToAxiosStatusResponse: true,
      customSuccessResponses: [ 'success' ],
      useOnlyAxiosStatusResponse: true,
    })
    const stub = stubApiResponse({
      data: {
        status: 'not-part-of-a-custom-success'
      },
      status: 200
    })

    const spy = sandbox.spy()
    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload : () => ({
        url     : '/users/fetch',
        success : spy,
      })
    }

    await dispatch( action )
    await flushPromises()

    assert.strictEqual( spy.calledOnce, true )
  } )

  it ( 'should pass headers correctly to Axios call', async () => {
    setupMiddleware({
      base : 'http://some.api/v1',
      auth : {
        headers : {
          'Authorization' : 'Bearer #user.token'
        }
      }
    })
    const stub = stubApiResponse({
      data: {
        status: 200
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

    const expectedAxiosParams = {
      config : {
        url: 'http://some.api/v1/users/fetch',
        method: 'get',
        headers : {
          Authorization : 'Bearer verylongsupersecret123token456',
        },
        params  : {
        },
        cancelToken : mockToken,
      }
    }

    await dispatch( action )

    chai.assert.deepEqual(
      stub.args[ 0 ][ 0 ],
      expectedAxiosParams.config,
      'The passed in config to Axios should match and should\'ve passed in Authorization header.'
    )
  } )

  it ( 'should correctly pass options to axios config parameter', async () => {
    // We are going to set the base ourselves through Axios config parameter
    setupMiddleware({ base: '' })
    const stub = stubApiResponse({ data: { status: 200 } })

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
    const expected = {
      ...action.axios,
      method: 'get',
      url: 'http://test.base/users/fetch'
    }

    await dispatch( action )
    await flushPromises()

    chai.assert.deepEqual(
      expected,
      stub.args[ 0 ][ 0 ],
      'Should add Axios config to our config/params parameter in our Axios call'
    )
  } )

  it ( 'should correctly merge headers if auth is also passed', async () => {
    setupMiddleware({
      base : 'http://some.api/v1',
      auth : {
        headers : {
          'Authorization' : 'Bearer #user.token'
        }
      }
    })
    const stub = stubApiResponse({
      data: {
        status: 200
      }
    })

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url  : '/users/fetch',
        auth : true, // Note this is important if we want to actually
                     // make sure the middleware looks at the Store
      }),
      axios: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }

    const expected = {
      method: 'get',
      url: 'http://some.api/v1/users/fetch',
      headers : {
        Authorization  : 'Bearer verylongsupersecret123token456',
        'Content-Type' : 'application/json',
      },
      params  : {
      },
    }

    await dispatch( action )

    chai.assert.deepEqual(
      stub.args[ 0 ][ 0 ],
      expected,
      'The passed in config to Axios should match and should\'ve passed in Authorization header as well as custom headers.'
    )
  } )

  it ( 'should track ETag(s) and save it to an object by URI segments', async () => {
    setupMiddleware({
      base     : 'http://some.api/v1',
      useETags : true,
    })
    const stub = stubApiResponse({
      status: 200,
      data: {
        user: { name: 'Alejandro' },
        status: 200
      },
      headers: {
        ETag: 'W/"6a-1imqN5TV7FQ3aYFfI8wc9y19qeQ"'
      },
    })

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch',
      })
    }

    await dispatch( action )
    await flushPromises()

    assert.isNotNull( urlETags[ '/users/fetch' ] )
    assert.strictEqual(
      urlETags[ '/users/fetch' ],
      'W/"6a-1imqN5TV7FQ3aYFfI8wc9y19qeQ"',
    )

    delete urlETags[ '/users/fetch' ]
  } )

  it ( 'should add default extra headers if ETag exists for URI segments', async () => {
    setupMiddleware({
      base     : 'http://some.api/v1',
      useETags : true,
    })

    const ETag = 'W/"6a-1imqN5TV7FQ3aYFfI8wc9y19qeQ"'
    urlETags[ '/users/fetch' ] = ETag

    const stub = stubApiResponse({
      data: {
        user: { name: 'Alejandro' },
        status: 200
      },
      headers: {
        ETag,
      },
    })

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch',
      })
    }

    await dispatch( action )

    assert.deepEqual(
      stub.args[ 0 ][ 0 ].headers,
      {
        'If-None-Match': ETag,
        'Cache-Control': 'private, must-revalidate',
      },
    )
    delete urlETags[ '/users/fetch' ]
  } )

  it ( 'should add custom extra headers if ETag exists for URI segments', async () => {
    setupMiddleware({
      base     : 'http://some.api/v1',
      useETags : true,
      matchingETagHeaders: ({ ETag, state }) => ({
        'a-custom-header': 'awesome',
        'user-session-id': state.user.sessionid,
        'If-None-Match': ETag,
      }),
    })

    const ETag = 'W/"6a-1imqN5TV7FQ3aYFfI8wc9y19qeQ"'
    urlETags[ '/users/fetch' ] = ETag

    const stub = stubApiResponse({
      data: {
        user: { name: 'Alejandro' },
        status: 200
      },
      headers: {
        ETag,
      },
    })

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch',
      })
    }

    await dispatch( action )

    assert.deepEqual(
      stub.args[ 0 ][ 0 ].headers,
      {
        'a-custom-header' : 'awesome',
        'user-session-id' : 'abc123',
        'If-None-Match'   : ETag,
      },
    )
    delete urlETags[ '/users/fetch' ]
  } )

  it ( 'should throw adding custom extra headers if ETag exists but return value is not of type object', async () => {
    setupMiddleware({
      base     : 'http://some.api/v1',
      useETags : true,
      matchingETagHeaders: () => {
      },
    })

    const ETag = 'W/"6a-1imqN5TV7FQ3aYFfI8wc9y19qeQ"'
    urlETags[ '/users/fetch' ] = ETag

    const stub = stubApiResponse({
      data: {
        user: { name: 'Alejandro' },
        status: 200
      },
      headers: {
        ETag,
      },
    })

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch',
      })
    }

    assert.throws(
      () => {dispatch( action )},
      Error,
      'Received ETagHeaders as a function but the returned value was not of type object.'
    )

    delete urlETags[ '/users/fetch' ]
  } )

  it ( 'should dispatch user-defined Type on creation of ETag', async () => {
    setupMiddleware({
      base                     : 'http://some.api/v1',
      useETags                 : true,
      dispatchETagCreationType : 'ON_ETAG_CREATION',
    })

    const ETag = 'W/"6a-1imqN5TV7FQ3aYFfI8wc9y19qeQ"'

    const stub = stubApiResponse({
      data: {},
      status: 200,
      headers: {
        ETag,
      },
    })

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch',
        ETagCallback: {
          type: 'ETAG_EXISTS',
        },
      })
    }

    await dispatch( action )
    await flushPromises()

    assert.deepEqual(
      store.dispatch.firstCall.args[ 0 ],
      {
        type: 'ON_ETAG_CREATION',
        ETag,
        key: '/users/fetch',
      }
    )

    delete urlETags[ '/users/fetch' ]
  } )

  it ( 'should call dispatch with ETagCallback if Object on status 304 Not Modified', async () => {
    setupMiddleware({
      base     : 'http://some.api/v1',
      useETags : true,
    })

    const ETag = 'W/"6a-1imqN5TV7FQ3aYFfI8wc9y19qeQ"'
    urlETags[ '/users/fetch' ] = ETag

    const stub = stubApiResponse({
      data: {
        status: 304,
        headers: {
          ETag,
        },
      },
    })

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch',
        ETagCallback: {
          type: 'ETAG_EXISTS',
        },
      })
    }

    await dispatch( action )
    await flushPromises()

    assert.deepEqual(
      store.dispatch.firstCall.args[ 0 ],
      {
        type: 'ETAG_EXISTS',
      }
    )

    delete urlETags[ '/users/fetch' ]
  } )

  it ( 'should call ETagCallback if Function on status 304 Not Modified', async () => {
    setupMiddleware({
      base     : 'http://some.api/v1',
      useETags : true,
    })

    const ETag = 'W/"6a-1imqN5TV7FQ3aYFfI8wc9y19qeQ"'
    urlETags[ '/users/fetch' ] = ETag

    const stub = stubApiResponse({
      data: {
        status: 304,
        headers: {
          ETag,
        },
      },
    })

    const spy = sandbox.spy()
    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch',
        ETagCallback: spy,
      })
    }

    await dispatch( action )
    await flushPromises()


    assert.isTrue( spy.calledOnce )
    assert.deepEqual(
      spy.args[ 0 ][ 0 ],
      {
        type     : action.types[ 0 ],
        path     : '/users/fetch',
        ETag     : ETag,
        dispatch : store.dispatch,
        getState : store.getState,
        state    : store.getState(),
      },
    )

    delete urlETags[ '/users/fetch' ]
  } )

  it ( 'should override base url in action if done through the axios config object', async () => {
    const stub = stubApiResponse({})
    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users'
      }),
      axios: {
        baseURL: 'http://other.domain',
      },
    }

    const expected = {
      url: 'http://other.domain/users',
      method: 'get',
      params: {},
      baseURL: 'http://other.domain',
    };

    await assert.isRejected(dispatch( action ), new ResponseErrorMessage())

    assert.deepEqual(stub.args[ 0 ][ 0 ], expected)
  } )

  it ( 'should return next(action) if not a valid shapeshifter action', () => {
    const mw2 = () => 'value of mw2'
    next.callsFake((...args) => mw2(...args))
    const thunkAction = () => {}
    const result = dispatch( thunkAction )
    chai.assert.calledWith( next, thunkAction )
    chai.assert.strictEqual( result, mw2() )
  } )

  it ( 'should ignore action if not of type API', () => {
    const action = { type: 'MISS_ME', payload: {} }
    dispatch( action )
    chai.assert.isTrue( next.calledOnce )
    chai.assert.isTrue( next.calledWith( action ) )
  } )

  it ( 'should call next() if action is of type Function', () => {
    dispatch(() => {})
    chai.assert.called( next )
  } )

  it ( 'should call action.payload() method with dispatch and state', async () => {
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

    await assert.isRejected(dispatch( action ), Error)

    chai.assert.isTrue( payloadSpy.called )
    chai.assert.calledWith(payloadSpy, {
      dispatch: store.dispatch,
      state:    store.getState(),
      cancel:   mockCancel,
    })
  } )

  it ( 'should throw an error if payload property doesn\'t return an object', () => {
    const action = {
      type: 'API',
      types: ['A', 'B', 'C'],
      payload: () => {}
    }

    chai.expect(
      () => dispatch( action )
    ).to.throw( Error )
  } )

  it ( 'should throw if `ACTION.payload.useFullResponseObject` is not of type Boolean', () => {
    const action = {
      type: 'API',
      types: ['A', 'B', 'C'],
      payload: () => ({ useFullResponseObject: 'crash-test' }),
    }

    chai.expect(
      () => dispatch( action )
    ).to.throw( Error, `action.payload.useFullResponseObject is expected to be of type Boolean, got instead crash-test` )
  } )

  it ( 'should throw if `middleware.useFullResponseObject` is not of type Boolean', () => {
    chai.expect(
      () => setupMiddleware({
        base                  : 'http://some.api/v1',
        useFullResponseObject : 'crash-me',
      })
    ).to.throw( Error, `middleware.useFullResponseObject is expected to be of type Boolean, got instead crash-me` )
  } )

  it ( 'should throw when middleware config contain errors', () => {
    chai.expect(
      () => setupMiddleware({ constants : null })
    ).to.throw( MiddlewareOptionsValidationError )
  } )

  it ( 'should throw when middleware config contains multiple errors', () => {
    chai.expect(
      () => setupMiddleware({
        base: { url: 'wrong-way' },
        constants : null,
      })
    ).to.throw(
      MiddlewareOptionsValidationError,
      /middleware\.\w+[\s\S]*middleware\.\w+/,
    )
  } )

  it ( 'should not return full response object when middleware.useFullResponseObject = false', async () => {
    const payload = {
      data: { status: 200 },
      headers: { someHeader: 'some-value' },
    }
    setupMiddleware({
      base                  : 'http://some.api/v1',
      useFullResponseObject : false,
    })
    stubApiResponse( payload )
    const spy = sandbox.spy()

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch',
        success: spy,
        useFullResponseObject: false,
      }),
    }
    await dispatch( action )
    await flushPromises()

    assert.deepInclude( spy.firstCall.args, { status: 200 } )
  } )

  it ( 'should return full response object when middleware.useFullResponseObject = true', async () => {
    const payload = {
      data: { status: 200 },
      headers: { someHeader: 'some-value' },
    }
    setupMiddleware({
      base                  : 'http://some.api/v1',
      useFullResponseObject : true,
    })
    stubApiResponse( payload )
    const spy = sandbox.spy()

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch',
        success: spy,
      }),
    }
    await dispatch( action )
    await flushPromises()

    assert.deepInclude( spy.firstCall.args, payload )
  } )

  it ( 'should not return full response object when ACTION.payload.useFullResponseObject = false', async () => {
    const payload = {
      data: { status: 200 },
      headers: { someHeader: 'some-value' },
    }
    setupMiddleware({ base : 'http://some.api/v1' })
    stubApiResponse( payload )
    const spy = sandbox.spy()

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch',
        success: spy,
        useFullResponseObject: false,
      }),
    }
    await dispatch( action )
    await flushPromises()

    assert.deepInclude( spy.firstCall.args, { status: 200 } )
  } )

  it ( 'should return full response object when ACTION.payload.useFullResponseObject = true', async () => {
    const payload = {
      data: { status: 200 },
      headers: { someHeader: 'some-value' },
    }
    setupMiddleware({ base : 'http://some.api/v1' })
    stubApiResponse( payload )
    const spy = sandbox.spy()

    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch',
        success: spy,
        useFullResponseObject: true,
      }),
    }
    await dispatch( action )
    await flushPromises()

    assert.deepInclude( spy.firstCall.args, payload )
  } )

  it ( 'should emit request type if set to true', async () => {
    setupMiddleware({
      base            : 'http://some.api/v1',
      emitRequestType : true,
    })
    stubApiResponse({ data: { status: 200 } })

    const payload = { data: { name: 'Alejandro', status: 200 } }
    const action = {
      ...createApiAction( 'FETCH_USER' ),
      payload: () => ({
        url: '/users/fetch'
      })
    }

    await dispatch( action )
    await flushPromises()

    assert.deepEqual(
      store.dispatch.firstCall.args[ 0 ],
      { type: 'FETCH_USER' }
    )
  } )

  describe( 'axios calls', () => {

    it ( 'Should add call to callStack and remove on success', async () => {
      const payload  = { data: { name: 'Alejandro', status: 200 } }
      sandbox.stub( axios, 'request' ).resolves( payload )
      const addToStackSpy = sandbox.spy( callStack, 'addToStack' )

      const action = {
        ...createApiAction( 'FETCH_USER' ),
        payload: () => ({
          url: '/users/fetch'
        })
      }

      await dispatch( action )
      await flushPromises()

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

    it ( 'should cancel call and warn', async () => {
      setupMiddleware({ warnOnCancellation: true })
      CancelToken.source.restore()
      const stub = sandbox.stub( global.console, 'warn' )
      const payload = { data: { name: 'Alejandro', status: 200 } }
      const resolved = new Promise(r => setTimeout(() => {
        r( payload )
      }, 3000))
      sandbox.stub( axios, 'request' )
        .onSecondCall().resolves( payload )
        .callThrough()

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
      await dispatch( actionTwo )

      chai.assert.calledOnce( stub )
      chai.assert.calledWith( stub, 'FETCH_USER call was canceled.' )
    } )

    it ( 'should return same promise chain', () => {
      let thenSpy, promiseStub
      sandbox.stub( axios, 'request' ).callsFake(() => {
        promiseStub = Promise.resolve({ data: { status: 200 } })
        thenSpy = sandbox.spy(promiseStub, 'then')
        return promiseStub
      })

      const action = {
        ...createApiAction( 'FETCH_USER' ),
        payload: () => ({
          url: '/users/fetch'
        })
      }

      const p = dispatch( action )
      p.then(function randomFn() {})

      chai.assert.strictEqual(thenSpy.callCount, 1);
    } )

    describe( 'Failed API calls', () => {
      it ( 'Let fallback failure() method capture it', async () => {
        stubApiResponse({ data: 'Failed to do stuff.' })

        const action = {
          ...createApiAction( 'FETCH_USER' ),
          payload: () => ({
            url: '/users/fetch'
          })
        }

        const expectedAction = {
          type: 'API_ERROR',
          message: 'FETCH_USER_FAILED failed.',
          error: sinon.match.instanceOf(ResponseErrorMessage)
        }

        await assert.isRejected(dispatch( action ), Error)
        assert.called(store.dispatch)
        assert.calledWith( store.dispatch, expectedAction )
      } )

      it ( 'Custom failure() method', async () => {
        stubApiResponse({ data: 'Failed to do stuff, twice.' })

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
          error: sinon.match.instanceOf(ResponseErrorMessage)
        }

        await assert.isRejected(dispatch( action ), Error)
        assert.isTrue( store.dispatch.called )
        assert.isTrue( store.dispatch.calledWith( expectedAction ) )
      } )
    } )

    describe( 'Successful API calls, returning errors', () => {
      it ( 'Should reject with prop `error`', async () => {
        stubApiResponse({
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

        await assert.isRejected(dispatch( action ), Error)
        assert.isTrue(
          failureSpy.called,
          'Call failure() when receiving prop `error` from back-end'
        )
        assert.calledWith(
          failureSpy,
          'FETCH_USER_FAILED',
          sinon.match.instanceOf(ResponseWithError),
        )
      } )

      it ( 'Should reject with prop `errors` (array)', async () => {
        stubApiResponse({
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

        await assert.isRejected(dispatch( action ), Error)
        assert.isTrue( failureSpy.called, 'Should call failure()' )
        assert.calledWith(
          failureSpy,
          'FETCH_USER_FAILED',
          sinon.match.instanceOf(ResponseWithErrors),
        )
      } )

      it ( 'Should using custom status response handler reject', async () => {
        const rejectSpy  = sandbox.spy()
        const resolveSpy = sandbox.spy()
        setupMiddleware({
          base: 'http://some.api/v1',
          handleStatusResponses(response, store) {
            if ( response.data && response.data.errors ) {
              rejectSpy()
              return Promise.reject( new ResponseErrorMessage( response.data.errors ) )
            }

            resolveSpy()
            return Promise.resolve()
          }
        })

        const stub = stubApiResponse({
          data: {
            errors: [ 'Reject this one baby', 'Another error' ],
            status: 200
          },
          status: 200
        })

        const failureSpy = sinon.spy()

        const action = {
          ...createApiAction( 'FETCH_USER' ),
          payload: () => ({
            url: '/users/fetch',
            failure: failureSpy
          })
        }

        await assert.isRejected(dispatch( action ), new ResponseErrorMessage())
        assert.isTrue( stub.calledOnce, 'API call(s) should be once.' )
        assert.isTrue( rejectSpy.called, 'Should return Promise.reject.' )
        assert.isFalse( resolveSpy.called, 'Should not return Promise.resolve.' )

        assert.isTrue(
          store.dispatch.called,
          'Should have called dispatch()'
        )
        assert.isTrue(
          failureSpy.calledOnce,
          'failure() method of Action should have been called.'
        )
        assert.calledWith(
          failureSpy,
          'FETCH_USER_FAILED',
          sinon.match.instanceOf( ResponseErrorMessage ),
        )
      } )

      it ( 'should using custom status response handler resolve', async () => {
        const rejectSpy  = sandbox.spy()
        const resolveSpy = sandbox.spy()
        setupMiddleware({
          base: 'http://some.api/v1',
          handleStatusResponses(response, store) {
            if ( response.data && response.data.errors ) {
              rejectSpy()
              return Promise.reject( response.data.errors )
            }

            resolveSpy()
            return Promise.resolve()
          }
        })

        const stub = stubApiResponse({
          data: {
            user: { name: 'Alejandro' },
            status: 200
          },
          status: 200
        })

        const successSpy = sinon.spy()

        const action = {
          ...createApiAction( 'FETCH_USER' ),
          payload: () => ({
            url: '/users/fetch',
            success: successSpy
          })
        }

        await dispatch( action )
        await flushPromises()

        assert.isTrue( stub.calledOnce, 'API call(s) should be once.' )
        assert.isTrue( resolveSpy.called, 'Should return Promise.resolve.' )
        assert.isFalse( rejectSpy.called, 'Should not return Promise.reject.' )
        // Because we have a nested Promise
        setTimeout(() => {
          assert.isTrue(
            store.dispatch.called,
            'Should have called dispatch()'
          )
          assert.isTrue(
            successSpy.calledOnce,
            'success() method of Action should have been called.'
          )
          assert.deepEqual(
            successSpy.firstCall.args,
            [
              'FETCH_USER_SUCCESS',
              {
                user: { name: 'Alejandro' },
                status: 200,
              },
              {
                ...store,
                state: {
                  user: {
                    sessionid: 'abc123',
                    token: 'verylongsupersecret123token456'
                  }
                }
              },
              null
            ]
          )
        })
      } )
    } )

    it ( 'should using custom status response handler resolve generator fn', async () => {
      const rejectSpy  = sandbox.spy()
      const resolveSpy = sandbox.spy()
      setupMiddleware({
        base: 'http://some.api/v1',
        handleStatusResponses(response, store) {
          if ( response.data && response.data.errors ) {
            rejectSpy()
            return Promise.reject( response.data.errors )
          }

          resolveSpy()
          return Promise.resolve()
        }
      })

      const stub = stubApiResponse({
        data: {
          user: { name: 'Alejandro' },
          status: 200
        },
        status: 200
      })

      const successSpy = sinon.spy()

      const action = {
        ...createApiAction( 'FETCH_USER' ),
        payload: () => ({
          url: '/users/fetch',
          success: function* (type, { user }) {
            successSpy()
            const fakePayload = { data: { user: { id: 1 }} }
            const response    = yield new Promise(r => r( fakePayload ))

            return {
              type,
              id: response.data.user.id,
              name: user.name
            }
          },
        })
      }

      const expected = {
        type: 'FETCH_USER_SUCCESS',
        id: 1,
        name: 'Alejandro'
      }

      await dispatch( action )
      await flushPromises()

      assert.isTrue( stub.calledOnce, 'API call(s) should be once.' )
      assert.isTrue( resolveSpy.called, 'Should return Promise.resolve.' )
      assert.isFalse( rejectSpy.called, 'Should not return Promise.reject.' )

      // Because we have a nested Promise
      await flushPromises()
      assert.isTrue(
        store.dispatch.calledOnce,
        'Should have called dispatch() twice'
      )
      assert.isTrue(
        successSpy.calledOnce,
        'success() generator method of Action should have been called.'
      )
      assert.deepEqual(
        store.dispatch.firstCall.args[ 0 ],
        expected,
        'handleStatusResponse() should resolve success() generator fn'
      )
    } )

    describe( 'Successful API calls', () => {
      it ( 'Successful API call but wrong status code', async () => {
        stubApiResponse({
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
          message : 'FETCH_USER_FAILED failed.',
          error   : sinon.match.instanceOf(ResponseWithBadStatusCode),
        }

        await assert.isRejected(dispatch( action ), Error)
        chai.assert.isTrue(
          store.dispatch.called,
          'store.dispatch() should have been called.'
        )
        chai.assert.isTrue(
          store.dispatch.calledWith( expectedAction ),
          'store.dispatch() should have been called with expectedAction.'
        )
      } )

      it ( 'Params should match using POST', async () => {
        const stub = stubApiResponse({
          method: 'post',
          data: {
            user: { name: 'Alejandro' },
            status: 200
          }
        })

        const action = {
          type: 'API',
          types: [
            'FETCH_USER',
            'FETCH_USER_SUCCESS',
            'FETCH_USER_FAILED'
          ],
          method: 'post',
          payload: () => ({
            url: '/users/fetch',
            params: {
              user_id: 1,
              username: 'dawaa',
              email: 'dawaa@heaven.com'
            },
          })
        }

        const expected = {
          method: 'post',
          url: 'http://some.api/v1/users/fetch',
          data: {
            user_id     : 1,
            username    : 'dawaa',
            email       : 'dawaa@heaven.com',
          },
          cancelToken : mockToken
        }

        await dispatch( action )

        assert.deepEqual(
          stub.args[ 0 ][ 0 ],
          expected,
        )
      } )

      it ( 'should not append anything if just a GET request is made', async () => {
        const stub = stubApiResponse({
          data: {
            user: { name: 'Alejandro' },
            status: 200
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
          })
        }

        await dispatch( action )

        assert.deepEqual(
          stub.args[ 0 ][ 0 ].params,
          {},
        )
      } )

      it ( 'Params should match without auth property', async () => {
        const stub = stubApiResponse({
          data: {
            user: { name: 'Alejandro' },
            status: 200
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
            params: {
              username: 'dawaa',
              email: 'dawaa@heaven.com'
            },
          })
        }

        const expected = {
          method: 'get',
          url: 'http://some.api/v1/users/fetch',
          params: {
            username    : 'dawaa',
            email       : 'dawaa@heaven.com',
          },
          cancelToken: mockToken,
        }

        await dispatch( action )
        await flushPromises()

        assert.deepEqual( stub.args[ 0 ][ 0 ], expected )
      } )

      it ( 'Params should match with auth property', async () => {
        const stub = stubApiResponse({
          data: {
            user: { name: 'Alejandro' },
            status: 200
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
            params: {
              username: 'dawaa',
              email: 'dawaa@heaven.com'
            },
            auth: true
          })
        }

        const expected = {
          method: 'get',
          url: 'http://some.api/v1/users/fetch',
          params: {
            username  : 'dawaa',
            email     : 'dawaa@heaven.com',
            sessionid : 'abc123',
          },
          cancelToken: mockToken,
        }

        await dispatch( action )
        await flushPromises()

        chai.assert.deepEqual( stub.args[ 0 ][ 0 ], expected )
      } )

      it ( 'Success() method should be called with (type, payload, meta = store)', async () => {
        const stub = stubApiResponse({
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

        await dispatch( action )
        await flushPromises()

        chai.assert.isTrue( spy.called, 'payload.success() was called' )
        chai.assert.deepEqual( spy.args[ 0 ], expected )
      } )

      it ( 'Success() method should be called with (type, payload, meta, store)', async () => {
        stubApiResponse({
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

        await dispatch( action )
        await flushPromises()

        chai.assert.isTrue( spy.called )
        chai.assert.deepEqual( spy.args[ 0 ], expected )
      } )

      it ( 'Should be fine with 204 status (empty response)', async () => {
        stubApiResponse({
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

        await dispatch( action )
        await flushPromises()

        chai.assert.isTrue( spy.called )
      } )

      it ( 'Merge params to meta parameter', async () => {
        stubApiResponse({
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

        await dispatch( action )
        await flushPromises()

        chai.assert.isTrue( spy.called )
        chai.assert.deepEqual( spy.args[ 0 ], expected )
      } )


      it ( 'Dispatch basic user firstName', async () => {
        const stub = stubApiResponse({
          data: {
            user: { name: 'Alejandro' },
            status: 200
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
            method: 'get',
            url: 'http://some.api/v1/users/fetch',
            params: {
              sessionid   : 'abc123',
            },
            cancelToken : mockToken,
          }
        }

        await dispatch( action )
        await flushPromises()

        chai.assert.isTrue( store.dispatch.called )
        chai.assert.isTrue( store.dispatch.calledWith( expected.action ) )
        chai.assert.deepEqual( stub.args[ 0 ][ 0 ], expected.args )
      } )

      it ( 'Should run tapBeforeCall()', async () => {
        stubApiResponse({
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
          },
          dispatch: store.dispatch,
          state: store.getState(),
          getState: store.getState
        }

        await dispatch( action )
        await flushPromises()

        chai.assert.isTrue( spy.called )
        chai.assert.isTrue( spy.calledOnce )
        chai.assert.deepEqual( spy.args[ 0 ][ 0 ], expectedParams )
      } )

      it ( 'Should succeed on a custom success response', async () => {
        setupMiddleware({
          base: 'http://some.api/v1',
          customSuccessResponses: [ 'success' ],
        })

        stubApiResponse({
          data: {
            status: 'success'
          },
          status: 200
        })

        const successSpy = sinon.spy()
        const action = {
          ...createApiAction( 'FETCH_USER' ),
          payload: () => ({
            url: '/users/fetch',
            success: successSpy
          })
        }

        await dispatch( action )
        await flushPromises()

        assert.isTrue(
          store.dispatch.calledOnce,
          'store.dispatch() should have been called.'
        )
        assert.isTrue(
          successSpy.calledOnce,
          'success() method should have been called.'
        )
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

      it ( 'Success generator function should yield API_VOID', async () => {
        stubApiResponse({
          data: {
            user: { name: 'Alejandro' },
            status: 200
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

        await dispatch( action )
        await flushPromises()

        chai.assert.isTrue( store.dispatch.called )
        chai.assert.deepEqual( store.dispatch.args[ 0 ][ 0 ], expected )
      } )

      it ( 'should yield SUCCESS with payload', async () => {
        stubApiResponse({
          data: {
            user: { name: 'Alejandro' },
            status: 200,
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

        await dispatch( action )
        await flushPromises()

        chai.assert.isTrue( store.dispatch.called, 'store.dispatch() was called' )
        chai.assert.deepEqual(
          store.dispatch.args[ 0 ][ 0 ],
          expected,
          'Dispatch params match expected literal object'
        )
      } )

      it ( 'Success generator function should dispatch multiple actions and return VOID', async () => {
        stubApiResponse({
          data: {
            user: { name: 'Alejandro', id: 1 },
            status: 200
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

        await dispatch( action )
        await flushPromises()

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
      } )

      it ( 'Success generator function should throw error and not call dispatch', async () => {
        stubApiResponse({ data: { status: 200 } })
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

        await dispatch( action )
        await flushPromises()

        chai.assert.isTrue( store.dispatch.notCalled )
        chai.assert.isTrue( mock.verify() )
      } )
    } )

  } )

  describe ( 'Repeat API calls', () => {
    it ( 'should repeatedly call an endpoint and resolve on boolean (true)', async () => {
      sandbox.stub( axios, 'request' )
        .onCall( 0 ).resolves({ status: 200, data: { isOnline: false } })
        .onCall( 1 ).resolves({ status: 200, data: { isOnline: false } })
        .onCall( 2 ).resolves({ status: 200, data: { isOnline: true } })

      const tickSpy = sinon.spy()
      const successSpy = sinon.spy()

      const action = {
        ...createApiAction( 'FETCH_USER' ),
        payload: () => ({
          url: '/users/fetch',
          success: successSpy,
          repeat: (response, resolve, reject) => {
            tickSpy()
            if ( response.data.isOnline ) {
              return true
            }
          },
          interval: 10,
        })
      }

      await dispatch( action )
      await flushPromises()

      await new Promise(r => setTimeout(r, 10))
      await flushPromises()

      chai.assert.strictEqual(
        tickSpy.callCount,
        2,
        'Should tick twice before isOnline is true',
      )
      chai.assert.isTrue(
        successSpy.called,
        'Success should\'ve been called after two ticks',
      )
      chai.assert.isTrue(
        successSpy.calledWith(
          'FETCH_USER_SUCCESS',
          { status: 200, data: { isOnline: true } },
          {
            state: store.getState(),
            getState: store.getState,
            dispatch: store.dispatch,
          }
        )
      )
    } )

    it ( 'should repeatedly call an endpoint and reject on boolean (false)', async () => {
      sandbox.stub( axios, 'request' )
        .onCall( 0 ).resolves({ status: 200, data: { isOnline: true } })
        .onCall( 1 ).resolves({ status: 200, data: { isOnline: true } })
        .onCall( 2 ).resolves({ status: 200, data: { isOnline: false } })

      const tickSpy = sinon.spy()
      const failureSpy = sinon.spy()

      const action = {
        ...createApiAction( 'FETCH_USER' ),
        payload: () => ({
          url: '/users/fetch',
          failure: failureSpy,
          repeat: (response, resolve, reject) => {
            tickSpy()
            if ( !response.data.isOnline ) {
              return false
            }
          },
          interval: 10,
        })
      }

      await assert.isRejected(dispatch( action ), Error)
      chai.assert.strictEqual(
        tickSpy.callCount,
        2,
        'Should tick twice before isOnline is false',
      )
      chai.assert.isTrue(
        failureSpy.called,
        'Success should\'ve been called after two ticks',
      )
    } )

    it ( 'should repeatedly call an endpoint and resolve with custom data', async () => {
      sandbox.stub( axios, 'request' )
        .onCall( 0 ).resolves({ status: 200, data: { isOnline: false } })
        .onCall( 1 ).resolves({ status: 200, data: { isOnline: false } })
        .onCall( 2 ).resolves({ status: 200, data: { isOnline: true } })

      const tickSpy = sinon.spy()
      const successSpy = sinon.spy()

      const action = {
        ...createApiAction( 'FETCH_USER' ),
        payload: () => ({
          url: '/users/fetch',
          success: successSpy,
          repeat: (response, resolve, reject) => {
            tickSpy()
            if ( response.data.isOnline ) {
              return resolve({ connected: true })
            }
          },
          interval: 50,
        })
      }

      await dispatch( action )
      await flushPromises()

      await new Promise(r => setTimeout(r, 100))
      await flushPromises()

      chai.assert.strictEqual(
        tickSpy.callCount,
        2,
        'Should tick twice before isOnline is true',
      )
      chai.assert.isTrue(
        successSpy.calledWith(
          'FETCH_USER_SUCCESS',
          { connected: true },
          {
            state: store.getState(),
            getState: store.getState,
            dispatch: store.dispatch,
          }
        )
      )
    } )

    it ( 'should repeatedly call an endpoint and reject with custom data', async () => {
      sandbox.stub( axios, 'request' )
        .onCall( 0 ).resolves({ status: 200, data: { isOnline: true } })
        .onCall( 1 ).resolves({ status: 200, data: { isOnline: true } })
        .onCall( 2 ).resolves({ status: 200, data: { isOnline: false } })

      const tickSpy = sinon.spy()
      const failureSpy = sinon.spy()

      const action = {
        ...createApiAction( 'FETCH_USER' ),
        payload: () => ({
          url: '/users/fetch',
          failure: failureSpy,
          repeat: (response, resolve, reject) => {
            tickSpy()
            if ( !response.data.isOnline ) {
              return reject({ buhu: true })
            }
          },
          interval: 10,
        })
      }

      await assert.isRejected(dispatch( action ), Error)
      chai.assert.strictEqual(
        tickSpy.callCount,
        2,
        'Should tick twice before isOnline is true',
      )
      chai.assert.calledWith(
        failureSpy,
        'FETCH_USER_FAILED',
        sinon.match.instanceOf( ResponseRepeatReject ),
      )
    } )
  } )

} )
