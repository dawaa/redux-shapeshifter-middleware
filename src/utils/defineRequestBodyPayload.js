import InvalidMethodError from '../errors/InvalidMethodError';
import defined from './defined';
import optional from './optional';

const methods = [ 'get', 'delete', 'post', 'put', 'patch' ]
const bodyMethods = methods.filter( m => m != 'get' )

export default (method, parameters = {}) => (
  method && methods.includes(method)
    ? (
      bodyMethods.includes(method)
        ? { data: parameters }
        : { params: parameters }
    )
    : new InvalidMethodError(`Expected method to be any of the following methods: ${methods}, got instead ${method}`)
)
