import defined from './utils/defined';
import lowerCaseObjectKeys from './utils/lowerCaseObjectKeys';

const parseableHeaders = (headers) => (
  headers != null
  || (!!headers && headers.constructor === Object && Object.keys(headers).length)
);

export default (context = {}) => (response) => {
  const {
    dispatch,
    path,
    useETags,
    dispatchETagCreationType,
    ETags,
  } = context;
  const { headers } = response;

  if (!parseableHeaders(headers)) {
    return response;
  }

  const normalizedHeaders = lowerCaseObjectKeys(headers);

  if (normalizedHeaders instanceof Error) {
    // eslint-disable-next-line no-console
    console.warn(normalizedHeaders);
    return response;
  }

  if (useETags && normalizedHeaders.etag) {
    ETags[path] = normalizedHeaders.etag;

    if (dispatchETagCreationType && defined(dispatchETagCreationType, String)) {
      dispatch({
        type: dispatchETagCreationType,
        ETag: normalizedHeaders.etag,
        key: path,
      });
    }
  }

  return response;
};
