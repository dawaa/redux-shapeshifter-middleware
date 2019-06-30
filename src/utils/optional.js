import defined from './defined';

export default (obj, type, expectation = null) => (
  obj == null
  || defined(obj, type, expectation)
)
