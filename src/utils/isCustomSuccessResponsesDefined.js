import Validation from 'folktale/validation'

export default customSuccessResponses => (
  customSuccessResponses == null
    ? Validation.Success()
    : customSuccessResponses && customSuccessResponses.constructor === Array
      ? Validation.Success()
      : Validation.Failure(
        `\n- middleware.customSuccessResponses is expected to be of type Array, got instead ${ customSuccessResponses }`,
      )
)
