import Result from 'folktale/result'

const methods = [ 'get', 'delete', 'post', 'put', 'patch' ]
const bodyMethods = methods.filter( m => m != 'get' )

export default (method, parameters = {}) => (
  method && methods.includes( method )
    ? (
      bodyMethods.includes( method )
        ? Result.Ok({ data: parameters })
        : Result.Ok({ params: parameters })
    )
    : Result.Error(
      `Expected method to be of type String and any of the following methods: ${ methods }, got instead ${ method }`
    )
)
