export default (obj, type, expectation = null) => (
  obj != null
  && obj.constructor === type
  && ((expectation == null && true) || expectation === obj)
);
