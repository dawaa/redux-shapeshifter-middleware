const GeneratorFunction = (function*(){}).constructor;

export const isGeneratorFn = fn => fn instanceof GeneratorFunction
