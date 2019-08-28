import { API, API_ERROR, API_VOID } from './consts';

export default {
  base: '',
  constants: {
    API,
    API_ERROR,
    API_VOID,
  },
  customSuccessResponses: null,
  emitRequestType: false,
  fallbackToAxiosStatusResponse: true,
  handleStatusResponses: null,
  useOnlyAxiosStatusResponse: false,
  useETags: false,
  useFullResponseObject: false,
  warnOnCancellation: false,
};
