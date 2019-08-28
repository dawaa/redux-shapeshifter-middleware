import InvalidMethodError from '../errors/InvalidMethodError';

const methods = ['get', 'delete', 'post', 'put', 'patch'];
const bodyMethods = methods.filter((m) => m !== 'get');

export default (method, parameters = {}) => (
  // eslint-disable-next-line no-nested-ternary
  method && methods.includes(method)
    ? (
      bodyMethods.includes(method)
        ? { data: parameters }
        : { params: parameters }
    )
    : new InvalidMethodError(`Expected method to be any of the following methods: ${methods}, got instead ${method}`)
);
