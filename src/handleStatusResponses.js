import defined from './utils/defined';
import ResponseWithError from './errors/ResponseWithError';
import ResponseWithErrors from './errors/ResponseWithErrors';
import ResponseWithBadStatusCode from './errors/ResponseWithBadStatusCode';
import ResponseNotModified from './errors/ResponseNotModified';
import HandleStatusResponsesInvalidReturn from './errors/HandleStatusResponsesInvalidReturn';

export default (context = {}) => (response) => {
  const {
    store,
    fallbackToAxiosStatusResponse,
    useOnlyAxiosStatusResponse,
    handleStatusResponses,
    customSuccessResponses,
  } = context;

  const {
    data: {
      error,
      errors,
    } = {},
    data = {},
  } = response;

  let validStatus = false;

  if (typeof handleStatusResponses === 'function') {
    validStatus = handleStatusResponses(response, store);

    if (defined(validStatus, Boolean, true)) {
      return response;
    } if (validStatus == null) {
      throw new HandleStatusResponsesInvalidReturn(
        `\`middleware.handleStatusResponses\` is expected to return a Boolean, instead ${JSON.stringify(validStatus)} was returned`,
      );
    }
  }

  // Try catching the response status from the API call, otherwise
  // fallback to Axios own status response.
  const status = (
    // eslint-disable-next-line no-nested-ternary
    fallbackToAxiosStatusResponse && !useOnlyAxiosStatusResponse
      ? (data.status || response.status)
      : (
        useOnlyAxiosStatusResponse
          ? response.status
          : data.status
      )
  );

  if (status >= 200 && status < 300) {
    // .. we good
  } else {
    // If we have a custom success response and we received one that fits
    // our array
    // eslint-disable-next-line no-lonely-if
    if (customSuccessResponses != null
      && customSuccessResponses.constructor === Array
      && customSuccessResponses.indexOf(status) !== -1) {
      // .. we good
    } else if (status === 304) {
      throw new ResponseNotModified(response);
    } else {
      throw new ResponseWithBadStatusCode(response);
    }
  }

  /**
   * In case we don't have a custom status reponse handler we will
   * by default look for the keys `error` or `errors` in the response
   * object to see if we should deal with them.
   */
  if (typeof handleStatusResponses !== 'function' || !validStatus) {
    if (error != null
      && error.constructor === String
      && errors instanceof Array === false) {
      throw new ResponseWithError(error);
    }

    if (errors != null
      && errors.constructor === Array
      && errors.length > 0) {
      throw new ResponseWithErrors(errors);
    }
  }

  return response;
};
