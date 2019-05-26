import Validation from 'folktale/validation'

export default useFullResponseObject => (
  useFullResponseObject != null && useFullResponseObject.constructor === Boolean
    ? Validation.Success()
    : Validation.Failure(
      `\n- middleware.useFullResponseObject is expected to be of type Boolean, got instead ${ useFullResponseObject }`,
    )
)
