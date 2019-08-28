function recursiveObjFind(state, findByObj) {
  const rObj = {};

  // eslint-disable-next-line guard-for-in
  for (const prop in findByObj) {
    if ({}.hasOwnProperty.call(state, prop) === false) {
      // eslint-disable-next-line no-console
      console.warn(
        `Tried reaching prop: ${prop}, that couldn't be found in the state tree.`,
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    /**
     * If we are searching using a string
     *
     * state: {
     *   user: 'sessionid'
     * }
     */
    if (findByObj[prop].constructor === String) {
      return { [findByObj[prop]]: state[prop][findByObj[prop]] };
    }

    /**
     * If we are searching using an object
     *
     * state: {
     *   user: {
     *     sessionid: true,
     *     teacher: true
     *   }
     * }
     */
    if (findByObj[prop].constructor === Boolean) {
      const mustExist = findByObj[prop] === true;

      if ({}.hasOwnProperty.call(state, prop)) {
        if (mustExist === false) {
          throw new Error(`${prop} was found when it shouldn't have been.`);
        }

        rObj[prop] = state[prop];
      }
    }

    if (typeof state[prop] === 'object' && state[prop] !== null) {
      const findings = recursiveObjFind(state[prop], findByObj[prop]);

      if (findings !== null && findings !== undefined) {
        return findings;
      }
    }
  }

  if (Object.keys(rObj).length > 0) {
    return rObj;
  }

  return false;
}

export default recursiveObjFind;
