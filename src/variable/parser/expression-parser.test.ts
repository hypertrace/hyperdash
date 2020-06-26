// tslint:disable:no-invalid-template-strings max-file-line-count

import { ExpressionParser } from './expression-parser';
import { ParseNodeType } from './parse-node';

describe('Expression parser', () => {
  test('should cache results', () => {
    // Kinda hard to test this as it's intentionally internal
    const parser = new ExpressionParser('interpolated ${something\\}');

    expect(parser.parse()).toBe(parser.parse());
  });

  test('should identify normal strings', () => {
    expect(new ExpressionParser('').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 0,
        children: []
      })
    );

    expect(new ExpressionParser('test string').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 11,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 11
          })
        ]
      })
    );

    expect(new ExpressionParser('test {}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 7,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 7
          })
        ]
      })
    );

    expect(new ExpressionParser('test {').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 6,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 6
          })
        ]
      })
    );

    expect(new ExpressionParser('test {').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 6,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 6
          })
        ]
      })
    );

    expect(new ExpressionParser('test $').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 6,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 6
          })
        ]
      })
    );

    expect(new ExpressionParser('{}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 2,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 2
          })
        ]
      })
    );

    expect(new ExpressionParser('test {}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 7,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 7
          })
        ]
      })
    );

    expect(new ExpressionParser('{}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 2,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 2
          })
        ]
      })
    );

    expect(new ExpressionParser('}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 1,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 1
          })
        ]
      })
    );

    expect(new ExpressionParser('{').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 1,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 1
          })
        ]
      })
    );

    expect(new ExpressionParser('$').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 1,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 1
          })
        ]
      })
    );

    expect(new ExpressionParser('$ {test}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 8,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 8
          })
        ]
      })
    );
  });

  test('escaped expressions', () => {
    expect(new ExpressionParser('\\').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 1,
        error: expect.any(String),
        children: [
          expect.objectContaining({
            type: ParseNodeType.EscapedCharacter,
            length: 1,
            error: expect.any(String)
          })
        ]
      })
    );

    expect(new ExpressionParser('\\${test}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 8,
        children: [
          expect.objectContaining({
            type: ParseNodeType.EscapedCharacter,
            length: 2
          }),
          expect.objectContaining({
            type: ParseNodeType.Text,
            start: 2,
            length: 6
          })
        ]
      })
    );

    expect(new ExpressionParser('$\\{test}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 8,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 1
          }),
          expect.objectContaining({
            type: ParseNodeType.EscapedCharacter,
            start: 1,
            length: 2
          }),
          expect.objectContaining({
            type: ParseNodeType.Text,
            start: 3,
            length: 5
          })
        ]
      })
    );
  });

  test('should identify strings containing expressions', () => {
    expect(new ExpressionParser('${test}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 7,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Expression,
            length: 7,
            children: [
              expect.objectContaining({
                type: ParseNodeType.Text,
                length: 4,
                start: 2
              })
            ]
          })
        ]
      })
    );

    expect(new ExpressionParser('${ test}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 8,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Expression,
            length: 8,
            children: [
              expect.objectContaining({
                type: ParseNodeType.Text,
                length: 5,
                start: 2
              })
            ]
          })
        ]
      })
    );

    expect(new ExpressionParser('${test }').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 8,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Expression,
            length: 8,
            children: [
              expect.objectContaining({
                type: ParseNodeType.Text,
                length: 5,
                start: 2
              })
            ]
          })
        ]
      })
    );

    expect(new ExpressionParser('interpolated ${test}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 20,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 13
          }),
          expect.objectContaining({
            type: ParseNodeType.Expression,
            start: 13,
            length: 7,
            children: [
              expect.objectContaining({
                type: ParseNodeType.Text,
                length: 4,
                start: 15
              })
            ]
          })
        ]
      })
    );

    expect(new ExpressionParser('interpolated ${test} $}{').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 24,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 13
          }),
          expect.objectContaining({
            type: ParseNodeType.Expression,
            start: 13,
            length: 7,
            children: [
              expect.objectContaining({
                type: ParseNodeType.Text,
                length: 4,
                start: 15
              })
            ]
          }),
          expect.objectContaining({
            type: ParseNodeType.Text,
            start: 20,
            length: 4
          })
        ]
      })
    );

    expect(new ExpressionParser('interpolated ${  test  }').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 24,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 13
          }),
          expect.objectContaining({
            type: ParseNodeType.Expression,
            start: 13,
            length: 11,
            children: [
              expect.objectContaining({
                type: ParseNodeType.Text,
                length: 8,
                start: 15
              })
            ]
          })
        ]
      })
    );

    expect(new ExpressionParser('test \\$${test}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 14,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 5
          }),
          expect.objectContaining({
            type: ParseNodeType.EscapedCharacter,
            length: 2,
            start: 5
          }),
          expect.objectContaining({
            type: ParseNodeType.Expression,
            start: 7,
            length: 7,
            children: [
              expect.objectContaining({
                type: ParseNodeType.Text,
                length: 4,
                start: 9
              })
            ]
          })
        ]
      })
    );

    expect(new ExpressionParser('${}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 3,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Expression,
            length: 3,
            // This one is invalid in template strings, but seems safe enough to just remove if interpolatd
            children: []
          })
        ]
      })
    );
  });

  test('should identify strings with invalid expressions', () => {
    expect(new ExpressionParser('interpolated ${test} ${').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 23,
        error: expect.any(String),
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 13
          }),
          expect.objectContaining({
            type: ParseNodeType.Expression,
            start: 13,
            length: 7,
            children: [
              expect.objectContaining({
                type: ParseNodeType.Text,
                length: 4,
                start: 15
              })
            ]
          }),
          expect.objectContaining({
            type: ParseNodeType.Text,
            start: 20,
            length: 1
          }),
          expect.objectContaining({
            type: ParseNodeType.Expression,
            start: 21,
            length: 2,
            error: expect.any(String)
          })
        ]
      })
    );

    expect(new ExpressionParser('interpolated ${').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 15,
        error: expect.any(String),
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 13
          }),
          expect.objectContaining({
            type: ParseNodeType.Expression,
            start: 13,
            length: 2,
            error: expect.any(String)
          })
        ]
      })
    );

    expect(new ExpressionParser('interpolated ${something').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 24,
        error: expect.any(String),
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 13
          }),
          expect.objectContaining({
            type: ParseNodeType.Expression,
            start: 13,
            length: 11,
            error: expect.any(String),
            children: [
              expect.objectContaining({
                type: ParseNodeType.Text,
                start: 15,
                length: 9
              })
            ]
          })
        ]
      })
    );

    expect(new ExpressionParser('interpolated ${something\\}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 26,
        error: expect.any(String),
        children: [
          expect.objectContaining({
            type: ParseNodeType.Text,
            length: 13
          }),
          expect.objectContaining({
            type: ParseNodeType.Expression,
            start: 13,
            length: 13,
            error: expect.any(String),
            children: [
              expect.objectContaining({
                type: ParseNodeType.Text,
                start: 15,
                length: 9
              }),
              expect.objectContaining({
                type: ParseNodeType.EscapedCharacter,
                start: 24,
                length: 2
              })
            ]
          })
        ]
      })
    );
  });

  test('should support sub expressions', () => {
    expect(new ExpressionParser('${${first}\\$${last}}').parse()).toEqual(
      expect.objectContaining({
        type: ParseNodeType.Root,
        length: 20,
        children: [
          expect.objectContaining({
            type: ParseNodeType.Expression,
            length: 20,
            children: [
              expect.objectContaining({
                type: ParseNodeType.Expression,
                start: 2,
                length: 8,
                children: [
                  expect.objectContaining({
                    type: ParseNodeType.Text,
                    start: 4,
                    length: 5
                  })
                ]
              }),
              expect.objectContaining({
                type: ParseNodeType.EscapedCharacter,
                start: 10,
                length: 2
              }),
              expect.objectContaining({
                type: ParseNodeType.Expression,
                start: 12,
                length: 7,
                children: [
                  expect.objectContaining({
                    type: ParseNodeType.Text,
                    start: 14,
                    length: 4
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  });
});
