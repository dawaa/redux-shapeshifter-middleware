const callStack = []

export function existsInStack(call) {
  const index = callStack.map( x => x.call ).indexOf( call )
  return index >= 0 ? callStack[ index ] : false
}

export function addToStack(call) {
  callStack.push(call)
}

export function removeFromStack(call) {
  let index;
  let found = false;

  for (let i=0; i<callStack.length; i++) {
    const item = callStack[ i ]
    if ( item.call === call && found === false ) {
      found = true
      index = i
      break
    }

    index = null
  }

  if ( index != null ) {
    callStack.splice( index, 1 )
  }
}
