import Validation from 'folktale/validation'
import Result from 'folktale/result'

export default middlewareOpts => cachedETag => store =>
  Result.of( middlewareOpts.matchingETagHeaders )
    .chain( matchingETagHeaders => (
      matchingETagHeaders && matchingETagHeaders.constructor === Function
        ? Result.Ok( matchingETagHeaders({
          ETag: cachedETag,
          ...store,
        }) )
        : Result.Error()
    ) )
    .orElse(_ => Result.Ok({
      'If-None-Match': cachedETag,
      'Cache-Control': 'private, must-revalidate',
    }))
    .chain( ETagHeaders => (
      middlewareOpts.useETags && cachedETag
        ? Result.Ok( ETagHeaders )
        : Result.Ok({})
    ) )
    .chain( ETagHeaders => (
      ETagHeaders && ETagHeaders.constructor === Object
        ? Result.Ok( ETagHeaders )
        : Result.Error(
          `middleware.matchingETagHeaders is expected to return a value of type Object, got instead ${ ETagHeaders }`,
        )
    ) )
    .matchWith({
      Ok: ({ value }) => value,
      Error: ({ value }) => ({
        error: true,
        errorMsg: value,
      })
    })

