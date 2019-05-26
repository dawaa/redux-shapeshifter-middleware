import Validation from 'folktale/validation'

export default baseUrl => baseUrl != null && baseUrl.constructor === String
  ? Validation.Success( baseUrl )
  : Validation.Failure( `\n- middleware.baseUrl is expected to be of type String, got instead ${ baseUrl }` )
