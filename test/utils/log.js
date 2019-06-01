import chai from 'chai'
import sinon from 'sinon'

import log from '../../src/utils/log'

const sandbox = sinon.createSandbox()

describe( 'log', () => {
  const node_env = process.env.NODE_ENV

  beforeEach(() => {
    process.env.NODE_ENV = ''
  })

  afterEach(() => {
    sandbox.restore()
    process.env.NODE_ENV = node_env
  })

  it ( 'prepends library name to output', () => {
    const result = log.info( 'Random info log', true )
    const expected = /^redux-shapeshifter-middleware: .*$/

    chai.assert.match( result, expected )
  } )

  it ( 'calls console.info()', () => {
    const mock = sandbox.mock( console ).expects( 'info' ).once()

    log.info( 'Random info log' )

    mock.verify()
  } )

  it ( 'calls console.warn()', () => {
    const mock = sandbox.mock( console ).expects( 'warn' ).once()

    log.warn( 'Warning!' )

    mock.verify()
  } )

  it ( 'calls console.error()', () => {
    const mock = sandbox.mock( console ).expects( 'error' ).once()

    log.error( 'Something exploded!' )

    mock.verify()
  } )
} )
