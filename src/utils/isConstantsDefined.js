import Validation from 'folktale/validation'

export default constants => {
  if ( !constants || constants.constructor !== Object ) {
    return Validation.Failure([
      `\n- middleware.constants is expected to be of type Object, got instead ${ constants }`,
    ])
  }

  const { API, API_ERROR, API_VOID } = constants
  const errors = []

  if ( !API || API.constructor !== String ) {
    errors.push( Validation.Failure([
      `\n- middleware.constants.API is expected to be of type String, got instead ${ API }`,
    ]) )
  }

  if ( !API_ERROR || API_ERROR.constructor !== String ) {
    errors.push( Validation.Failure([
      `\n- middleware.constants.API_ERROR is expected to be of type String, got instead ${ API_ERROR }`,
    ]) )
  }

  if ( !API_VOID || API_VOID.constructor !== String ) {
    errors.push( Validation.Failure([
      `\n- middleware.constants.API_VOID is expected to be of type String, got instead ${ API_VOID }`,
    ]) )
  }

  return errors.length ? Validation.collect( errors ) : Validation.Success()
}
