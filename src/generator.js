// eslint-disable-next-line func-names, no-empty-function
export const GeneratorFunction = (function* () {}).constructor;

export const isGeneratorFn = (fn) => fn instanceof GeneratorFunction;
