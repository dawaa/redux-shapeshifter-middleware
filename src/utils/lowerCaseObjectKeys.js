export default obj => (
  obj && obj.constructor === Object
    ? Object.keys(obj)
      .filter(x => x && x.constructor === String)
      .reduce((seq, key) => ({ ...seq, [ key.toLowerCase() ]: obj[ key ] }), {})
    : new TypeError(`Expected passed argument to be of type Object, got instead ${obj}`)
)
