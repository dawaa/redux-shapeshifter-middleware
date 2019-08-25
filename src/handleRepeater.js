import axios from 'axios';

import handleResponse from './handleResponse';
import defined from './utils/defined';
import ResponseRepeatReject from './errors/ResponseRepeatReject';

export default (context = {}) => response => {
  const {
    store,
    next,
    requestConfig,
    success,
    failure,
    types: { REQUEST, SUCCESS, FAILURE } = {},
    meta,
    repeat,
    interval,
    useFullResponseObject,
  } = context;

  if (!response || !response._shapeShifterRepeat) return response;

  return new Promise((parentResolve, parentReject) => {
    const resolveRepeater = response => {
      store.dispatch(
        success(
          SUCCESS,
          (useFullResponseObject ? response : response.data),
          meta,
          (meta && meta.getState && typeof meta.getState === 'function' ? null : store),
        )
      )

      parentResolve(response);
      return response;
    };

    const rejectRepeater = response => {
      parentReject(new ResponseRepeatReject(response));
      return response;
    };

    const repeater = async () => {
      const newRequest = await axios.request(requestConfig);
      const newResponse = await handleResponse({
        store,
        next,
        success,
        failure,
        types: { REQUEST, SUCCESS, FAILURE },
        meta,
        repeat,
        useFullResponseObject,
      })(newRequest);

      delete newResponse._shapeShifterRepeat;

      const result = repeat(newResponse, resolveRepeater, rejectRepeater);

      if ( result === true ) {
        return resolveRepeater(newResponse);
      } else if ( result === false ) {
        return rejectRepeater(newResponse);
      } else if ( result != null && result.constructor !== Boolean ) {
        return result;
      }
      setTimeout(() => {
        repeater();
      }, interval);
    };

    return repeater();
  });
};
