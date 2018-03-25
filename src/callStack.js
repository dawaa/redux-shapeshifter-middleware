const callStack = []

export function existsInStack(call) {
  return callStack.find(x => x.call === call) || false
}

export function addToStack(call) {
  callStack.push(call)
}

export function removeFromStack(call) {
  let index;
  let found = false;

  callStack.find((x, i) => {
    if ( x.call === call && found === false ) {
      // console.log('found something');
      // console.log( x );
      found = true
      return index = i
    }

    index = null
  })

  if ( index != null ) {
    callStack.splice( index, 1 )
  }

  // console.log('call stack  AFTER');
  // console.log( callStack );
}
