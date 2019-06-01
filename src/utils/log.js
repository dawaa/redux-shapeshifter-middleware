const prefix = 'redux-shapeshifter-middleware:'

const logOrReturn = (str, method, returnStr = false) => {
  const output = `${ prefix } ${ str }`

  if ( returnStr === true ) {
    return output
  }

  process.env.NODE_ENV !== 'test' && console[method]( output )
}

export default {
  info: (str, returnStr) => logOrReturn( str, 'info', returnStr ),
  warn: (str, returnStr) => logOrReturn( str, 'warn', returnStr ),
  error: (str, returnStr) => logOrReturn( str, 'error', returnStr ),
}
