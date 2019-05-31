import axios from 'axios'

export default dispatch => requestConfig => processResponse => actionOpts => response => {
  if ( !response || !response._shapeShifterRepeat ) return response

  const {
    success,
    failure,
    types: { REQUEST, SUCCESS, FAILURE },
    meta,
    repeat,
    interval,
  } = actionOpts

  return new Promise((parentResolve, parentReject) => {
    const resolveRepeater = data => {
      dispatch(
        success(
          SUCCESS,
          data,
          meta,
          (meta.getState && typeof meta.getState === 'function' ? null : store),
        )
      )

      parentResolve( data )
      return data
    }
    const rejectRepeater = data => {
      parentReject( data )
      return data
    }

    const repeater = async () => {
      const newRequest  = await axios.request( requestConfig )
      const newResponse = await processResponse( newRequest )({
        success,
        failure,
        types: { REQUEST, SUCCESS, FAILURE },
        meta,
        repeat,
      })

      delete newResponse._shapeShifterRepeat

      const result = repeat(
        newResponse,
        resolveRepeater,
        rejectRepeater,
      )

      if ( result === true ) {
        return resolveRepeater( newResponse )
      } else if ( result === false ) {
        return rejectRepeater( newResponse )
      } else if ( result != null && result.constructor !== Boolean ) {
        return result
      }
      setTimeout(() => {
        repeater()
      }, interval)
    }

    return repeater()
  })
}
