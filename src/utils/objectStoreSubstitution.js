import stringStoreSubstitution from './stringStoreSubstitution'

export default (store, obj) => (
  Object.keys( obj ).reduce((seq, key) => (
    { ...seq, [ key ]: stringStoreSubstitution( store, obj[ key ] ) }
  ), {})
)
