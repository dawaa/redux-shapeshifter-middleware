import log from './log'

const tokenRgx = /#(\w+\.?)+/g

export default (store, string) => (
  string.replace( tokenRgx, (match) => {
    const m = match.substr( 1 ).split( '.' )
    const prop = m.shift()

    let _storeVal = store[ prop ]
    while ( _storeVal != null && m.length ) {
      _storeVal = _storeVal[ m.shift() ]
    }

    if ( _storeVal == null ) {
      process.env.NODE_ENV !== 'test' && log.warn(
        'redux-shapeshifter-middleware: ' +
        `Tried to substitute string (${ string }) but couldn't find property (${ prop }) in the store`
      )

      _storeVal = `#${ prop }`
    }

    return _storeVal
  } )
)
