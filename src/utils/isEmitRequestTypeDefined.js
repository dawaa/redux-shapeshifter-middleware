import Validation from 'folktale/validation'

export default emitRequestType => (
  emitRequestType != null && emitRequestType.constructor === Boolean
    ? Validation.Success()
    : Validation.Failure(
      `\n- middleware.emitRequestType is expected to be of type Boolean, got instead ${ emitRequestType }`,
    )
)
