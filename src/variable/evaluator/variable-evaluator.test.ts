// tslint:disable:no-invalid-template-strings

import { VariableEvaluator } from './variable-evaluator';

describe('Variable evaluator', () => {
  test('works for basic properties', () => {
    const evaluator = new VariableEvaluator('${test}');

    expect(evaluator.evaluate({ test: 15 })).toEqual({
      value: 15,
      variableNamesAdded: ['test'],
      variableNamesRemoved: []
    });
    expect(evaluator.evaluate({ test: 'foo' })).toEqual({
      value: 'foo',
      variableNamesAdded: [],
      variableNamesRemoved: []
    });
  });

  test('works for interpolated strings', () => {
    const evaluator = new VariableEvaluator("I'm ${ test }!");

    expect(evaluator.evaluate({ test: 5 })).toEqual({
      value: "I'm 5!",
      variableNamesAdded: ['test'],
      variableNamesRemoved: []
    });
    expect(evaluator.evaluate({ test: 'foo' })).toEqual({
      value: "I'm foo!",
      variableNamesAdded: [],
      variableNamesRemoved: []
    });
  });

  test('returns error if lookup fails', () => {
    expect(new VariableEvaluator("I'm ${ test }!").evaluate({ not: 5 })).toEqual({
      variableNamesAdded: ['test'],
      variableNamesRemoved: [],
      error: 'Could not lookup variable value: test'
    });
    expect(new VariableEvaluator('${test}').evaluate({ not: 5 })).toEqual({
      variableNamesAdded: ['test'],
      variableNamesRemoved: [],
      error: 'Could not lookup variable value: test'
    });
  });

  test('returns undefined if bad parse', () => {
    expect(new VariableEvaluator("I'm ${!").evaluate({ not: 5 })).toEqual({
      variableNamesAdded: [],
      variableNamesRemoved: [],
      error: 'Parse error in child node'
    });
  });

  test('works for escaped strings', () => {
    expect(new VariableEvaluator("I'm ${\\$pecial}!").evaluate({ ['$pecial']: 5 })).toEqual({
      value: "I'm 5!",
      variableNamesAdded: ['$pecial'],
      variableNamesRemoved: []
    });
  });

  test('works for nested props', () => {
    expect(new VariableEvaluator('${${a}${b}}').evaluate({ a: 'foo', b: 'bar', foobar: 'baz' })).toEqual({
      value: 'baz',
      variableNamesAdded: ['a', 'b', 'foobar'],
      variableNamesRemoved: []
    });
  });

  test('returns correct diff if undefined and multiple variables', () => {
    expect(new VariableEvaluator('${${a}${b}}').evaluate({})).toEqual({
      error: 'Could not lookup variable value: a; Could not lookup variable value: b',
      variableNamesAdded: ['a', 'b'],
      variableNamesRemoved: []
    });

    expect(new VariableEvaluator('${a} and ${b}').evaluate({})).toEqual({
      error: 'Could not lookup variable value: a; Could not lookup variable value: b',
      variableNamesAdded: ['a', 'b'],
      variableNamesRemoved: []
    });

    expect(new VariableEvaluator('${${a}${b}} and ${${c}${d}}').evaluate({})).toEqual({
      // tslint:disable-next-line:max-line-length
      error:
        'Could not lookup variable value: a; Could not lookup variable value: b; Could not lookup variable value: c; Could not lookup variable value: d',
      variableNamesAdded: ['a', 'b', 'c', 'd'],
      variableNamesRemoved: []
    });
  });

  test('variable name diff works for nested props', () => {
    const evaluator = new VariableEvaluator('${${a}${b}}');

    evaluator.evaluate({ a: 'foo', b: 'bar', foobar: 'baz', food: 'stuff' }); // Tested above

    expect(evaluator.evaluate({ a: 'foo', b: 'd', foobar: 'baz', food: 'stuff' })).toEqual({
      value: 'stuff',
      variableNamesAdded: ['food'],
      variableNamesRemoved: ['foobar']
    });

    expect(evaluator.evaluate({ a: 'foo', foobar: 'baz', food: 'stuff' })).toEqual({
      error: 'Could not lookup variable value: b',
      variableNamesAdded: [],
      variableNamesRemoved: ['food']
    });
  });

  test('variable name diff works for self-referencing props', () => {
    const evaluator = new VariableEvaluator('${${foo}}');

    expect(evaluator.evaluate({ foo: 'foo' })).toEqual({
      value: 'foo',
      variableNamesAdded: ['foo'],
      variableNamesRemoved: []
    });

    expect(evaluator.evaluate({ foo: 'bar' })).toEqual({
      error: 'Could not lookup variable value: bar',
      variableNamesAdded: ['bar'],
      variableNamesRemoved: []
    });
  });

  test('returns error for undefined lookup', () => {
    expect(new VariableEvaluator('${test}').evaluate({ test: undefined })).toEqual({
      error: 'Could not lookup variable value: test',
      variableNamesAdded: ['test'],
      variableNamesRemoved: []
    });

    expect(new VariableEvaluator('${test} and ${other}').evaluate({ test: 'fine' })).toEqual({
      error: 'Could not lookup variable value: other',
      variableNamesAdded: ['test', 'other'],
      variableNamesRemoved: []
    });
  });

  test('unevaluate returns original string', () => {
    const evaluator = new VariableEvaluator('${test}');

    // Even if not evaluated
    expect(evaluator.unevaluate()).toEqual({
      value: '${test}',
      variableNamesAdded: [],
      variableNamesRemoved: []
    });

    evaluator.evaluate({});

    expect(evaluator.unevaluate()).toEqual({
      value: '${test}',
      variableNamesAdded: [],
      variableNamesRemoved: ['test']
    });
  });
});
