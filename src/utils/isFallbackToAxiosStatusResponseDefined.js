import Validation from 'folktale/validation'

export default fallbackToAxiosStatusResponse => (
  fallbackToAxiosStatusResponse != null
  && fallbackToAxiosStatusResponse.constructor === Boolean
    ? Validation.Success()
    : Validation.Failure(
      `\n- middleware.fallbackToAxiosStatusResponse is expected to be of type Boolean, got instead ${ fallbackToAxiosStatusResponse }`,
    )
)
