import Validation from 'folktale/validation'

export default useOnlyAxiosStatusResponse => (
  useOnlyAxiosStatusResponse != null
  && useOnlyAxiosStatusResponse.constructor === Boolean
    ? Validation.Success()
    : Validation.Failure(
      `\n- middleware.useOnlyAxiosStatusResponse is expected to be of type Boolean, got instead ${ useOnlyAxiosStatusResponse }`,
    )
)
