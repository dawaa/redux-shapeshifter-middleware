import options from './options';
import { removeFromStack } from './callStack';

export default (store) => (next) => (response) => ({ success, types, meta }) => {
  const {
    constants: {
      API_VOID,
    },
  } = options;

  const {
    REQUEST,
    SUCCESS,
  } = types;

  return new Promise((resolve, reject) => {
    const gen = success(
      SUCCESS,
      response.data,
      meta,
      (meta.getState && typeof meta.getState === 'function' ? null : store),
    );

    // eslint-disable-next-line no-underscore-dangle
    const _resolve = (data) => {
      try {
        const it = gen.next(data);
        // eslint-disable-next-line no-use-before-define
        _iterate(it);
      } catch (e) {
        reject(e);
      }
    };

    // eslint-disable-next-line no-underscore-dangle
    const _reject = (error) => {
      try {
        // eslint-disable-next-line no-use-before-define
        _iterate(gen.throw(error));
      } catch (e) {
        reject(e);
      }
    };

    // eslint-disable-next-line no-underscore-dangle, consistent-return
    const _iterate = (it) => {
      const { done, value } = it || {};

      if (done === true) {
        // Remove call from callStack when finished
        removeFromStack(REQUEST);

        if (value === undefined) {
          return resolve({ type: API_VOID, LAST_ACTION: REQUEST });
        }

        return resolve(value);
      }

      // If we are dealing with a generator function
      if (value.then && typeof value.then === 'function') {
        Promise.resolve(value).then(_resolve, _reject);

        // If value is function
      } else if (typeof value === 'function') {
        try {
          _resolve(value());
        } catch (e) {
          _reject(e);
        }

        // If all else fails
      } else {
        _resolve(value);
      }
    };

    // Kick it Stevie Wonder!
    _resolve();
  })
    .then(next, (error) => {
      // Remove call from callStack when finished
      removeFromStack(REQUEST);

      // eslint-disable-next-line no-console
      console.error(`Generator ACTION had an error ==> ${error}`);
    });
};
