import NotShapeshifterAction from '../errors/NotShapeshifterAction';
import MalformedShapeshifterAction from '../errors/MalformedShapeshifterAction';
import defined from './defined';
import optional from './optional';

export default shapeshifterType => action => {
  const errors = [];

  const addError = (opt, type, value) => errors.push(
    `\n - action.${opt} is expected to be of type ${type}, got instead ${value}`,
  );

  if (!defined(action, Object)) {
    return new NotShapeshifterAction('Action is not of type object');
  }

  if (!defined(action.type, String)) {
    return new NotShapeshifterAction('Action is missing a type property');
  }

  if (!defined(action.type, String, shapeshifterType)) {
    return new NotShapeshifterAction('Is not a shapeshifter action');
  }

  if (!defined(action.types, Array)) {
    addError('types', 'Array', action.types);
  } else {
    if (action.types.length !== 3) {
      errors.push(
        `\n - action.types should contain a Neutral, Success and Failure types`,
      );
    }
  }

  if (!defined((action.method || 'get'), String)) {
    addError('method', 'String', action.method);
  }

  if (!defined(action.payload, Function)) {
    addError('payload', 'Function', action.payload);
  }

  if (!optional(action.meta, Object)) {
    addError('meta', 'Object', action.meta);
  }

  if (!optional(action.axios, Object)) {
    addError('axios', 'Object', action.axios);
  }

  if (errors.length) {
    return new MalformedShapeshifterAction(errors.join(''), errors);
  }

  return action;
};
