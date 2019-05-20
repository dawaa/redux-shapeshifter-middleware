import Result from 'folktale/result'

import isValidAction from './isValidAction'
import isShapeshifterAction from './isShapeshifterAction'
import hasPayload from './hasPayload'
import hasTypes from './hasTypes'
import maybeSkipAction from './maybeSkipAction'

export default shapeshifterType => next => action => (
  Result.of( action )
    .chain( isValidAction )
    .chain( isShapeshifterAction( shapeshifterType ) )
    .orElse( maybeSkipAction( next ) )
    .chain( hasTypes )
    .chain( hasPayload )
    .matchWith({
      Ok: _ => true,
      Error: ({ value }) => value,
    })
)
