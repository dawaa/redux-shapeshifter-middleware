// external
import chai from 'chai';

// internal
import { GeneratorFunction, isGeneratorFn } from '../src/generator';


describe('Generator helper', () => {
  it('Should check GeneratorFunction', () => {
    chai.assert.strictEqual(GeneratorFunction.displayName, 'GeneratorFunction');
  });

  it('Should check if isGeneratorFn is of type function', () => {
    chai.assert.strictEqual(typeof isGeneratorFn, 'function');
  });

  it('Should check if function is of type GeneratorFunction', () => {
    const fn = () => {};
    chai.assert.isFalse(isGeneratorFn(fn));
  });

  it('Should check if generator function is of type GeneratorFunction', () => {
    // eslint-disable-next-line no-empty-function
    const genFn = function* genFunc() {};
    chai.assert.isTrue(isGeneratorFn(genFn));
  });
});
