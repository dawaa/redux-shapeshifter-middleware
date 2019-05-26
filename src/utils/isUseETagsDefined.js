import Validation from 'folktale/validation'

export default useETags => (
  useETags != null && useETags.constructor === Boolean
    ? Validation.Success()
    : Validation.Failure(
      `\n- middleware.useETags is expected to be of type Boolean, got instead ${ useETags }`,
    )
)
