import ResponseWithError from '../errors/ResponseWithError'
import ResponseWithErrors from '../errors/ResponseWithErrors'
import ResponseErrorMessage from '../errors/ResponseErrorMessage'
import ResponseWithBadStatusCode from '../errors/ResponseWithBadStatusCode'
import ResponseRepeatReject from '../errors/ResponseRepeatReject'

export default error => (
  error instanceof ResponseWithError
  || error instanceof ResponseWithErrors
  || error instanceof ResponseErrorMessage
  || error instanceof ResponseWithBadStatusCode
  || error instanceof ResponseRepeatReject
)
