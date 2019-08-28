import axios from 'axios';

import handleResponse from './handleResponse';
import ResponseRepeatReject from './errors/ResponseRepeatReject';

export default (context = {}) => (response) => {
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

  // eslint-disable-next-line no-underscore-dangle
  if (!response || !response._shapeShifterRepeat) return response;

  return new Promise((parentResolve, parentReject) => {
    // eslint-disable-next-line no-shadow
    const resolveRepeater = (response) => {
      store.dispatch(
        success(
          SUCCESS,
          (useFullResponseObject ? response : response.data),
          meta,
          (meta && meta.getState && typeof meta.getState === 'function' ? null : store),
        ),
      );

      parentResolve(response);
      return response;
    };

    // eslint-disable-next-line no-shadow
    const rejectRepeater = (response) => {
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

      // eslint-disable-next-line no-underscore-dangle
      delete newResponse._shapeShifterRepeat;

      const result = repeat(newResponse, resolveRepeater, rejectRepeater);

      if (result === true) {
        return resolveRepeater(newResponse);
      } if (result === false) {
        return rejectRepeater(newResponse);
      } if (result != null && result.constructor !== Boolean) {
        return result;
      }
      setTimeout(() => {
        repeater();
      }, interval);
      return undefined;
    };

    return repeater();
  });
};
