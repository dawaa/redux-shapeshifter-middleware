import Validation from 'folktale/validation'

export default handleStatusResponse => (
  handleStatusResponse == null
    ? Validation.Success()
    : handleStatusResponse && handleStatusResponse.constructor === Function
      ? Validation.Success()
      : Validation.Failure(
        `\n- middleware.handleStatusResponse is expected to be of type Function, got instead ${ handleStatusResponse }`,
      )
)
