import { min } from 'lodash';
import { ParseNode, ParseNodeType } from './parse-node';

/**
 * Represents a parsed expression which can detect and replace variables.
 * Parsing is done lazily.
 * TODO: revisit this...
 */
export class ExpressionParser {
  private static readonly ESCAPE: string = '\\';
  private static readonly START: string = '$';
  private static readonly OPEN: string = '{';
  private static readonly CLOSE: string = '}';
  private static readonly EXPRESSION_OPEN_LENGTH: number = ExpressionParser.START.length + ExpressionParser.OPEN.length;
  private static readonly EXPRESSION_CLOSE_LENGTH: number = ExpressionParser.CLOSE.length;

  private readonly rootRule: Partial<ParseRule> = {
    // Partial because a root rule doesn't have a start condition
    type: ParseNodeType.Root,
    endBefore: () => this.expression.length === 0,
    endAfter: index => index === this.lastIndexOfLength(this.expression.length),
    parsedUntil: () => this.lastIndexOfLength(this.expression.length)
  };

  private readonly parseRules: ReadonlyArray<ParseRule> = [
    {
      type: ParseNodeType.EscapedCharacter,
      startWith: this.isEscapeSequence.bind(this),
      beginParseFrom: startingIndex => startingIndex + ExpressionParser.ESCAPE.length,
      endBefore: () => true, // Immediately end after following character
      parsedUntil: endingIndex => min([endingIndex, this.lastIndexOfLength(this.expression.length)])!,
      errorOn: index =>
        index > this.lastIndexOfLength(this.expression.length) ? 'Cannot end with escape character' : undefined
    },
    {
      type: ParseNodeType.Expression,
      startWith: this.isExpressionOpen.bind(this),
      beginParseFrom: startingIndex => startingIndex + ExpressionParser.EXPRESSION_OPEN_LENGTH,
      endBefore: this.isExpressionClose.bind(this),
      parsedUntil: index => this.lastIndexOfLength(ExpressionParser.EXPRESSION_CLOSE_LENGTH, index)
    },
    {
      type: ParseNodeType.Text,
      // "default" state - always start a text node if not in one
      startWith: (_index: number, currentNodeType: ParseNodeType) => currentNodeType !== ParseNodeType.Text,
      endBefore: (index: number, parentNodeType: ParseNodeType) =>
        this.isEscapeSequence(index) ||
        this.isExpressionOpen(index) ||
        (parentNodeType === ParseNodeType.Expression && this.isExpressionClose(index)),
      endAfter: (index: number) => index === this.lastIndexOfLength(this.expression.length),
      parsedUntil: (endingIndex: number, parentNodeType: ParseNodeType) =>
        this.isEscapeSequence(endingIndex) ||
        this.isExpressionOpen(endingIndex) ||
        (parentNodeType === ParseNodeType.Expression && this.isExpressionClose(endingIndex))
          ? endingIndex - 1
          : endingIndex
    }
  ];

  private parsed?: ParseNode;

  public constructor(private readonly expression: string) {}

  /**
   * Transform source string into parse tree
   */
  public parse(): ParseNode {
    if (!this.parsed) {
      this.parsed = this.parseByRule(0, this.rootRule as ParseRule);
    }

    return this.parsed;
  }

  private isEscapeSequence(index: number): boolean {
    return this.expression.startsWith(ExpressionParser.ESCAPE, index);
  }

  private isExpressionOpen(index: number): boolean {
    return this.expression.startsWith(ExpressionParser.START + ExpressionParser.OPEN, index);
  }

  private isExpressionClose(index: number): boolean {
    return this.expression.startsWith(ExpressionParser.CLOSE, index);
  }

  private lengthBetween(startIndex: number, endIndex: number): number {
    return endIndex - startIndex + 1;
  }

  private lastIndexOfLength(length: number, startIndex: number = 0): number {
    return startIndex + length - 1;
  }

  private parseByRule(startingFrom: number, currentRule: ParseRule, parentRule?: ParseRule): ParseNode {
    let currentIndex = currentRule.beginParseFrom ? currentRule.beginParseFrom(startingFrom) : startingFrom;
    const result = {
      type: currentRule.type,
      start: startingFrom,
      children: [] as ParseNode[]
    };
    do {
      const error = currentRule.errorOn && currentRule.errorOn(currentIndex);
      if (error) {
        return {
          ...result,
          length: this.lengthBetween(
            startingFrom,
            currentRule.parsedUntil(currentIndex, parentRule && parentRule.type)
          ),
          error: error
        };
      }
      if (currentRule.endBefore && currentRule.endBefore(currentIndex, parentRule && parentRule.type)) {
        return {
          ...result,
          length: this.lengthBetween(startingFrom, currentRule.parsedUntil(currentIndex, parentRule && parentRule.type))
        };
      }
      const newRule = this.parseRules.find(rule => rule.startWith(currentIndex, currentRule.type));
      if (newRule) {
        const child = this.parseByRule(currentIndex, newRule, currentRule);
        result.children.push(child);
        currentIndex = this.lastIndexOfLength(child.length, child.start);
        if (child.error) {
          return {
            ...result,
            length: this.lengthBetween(startingFrom, currentIndex),
            error: 'Parse error in child node'
          };
        }
      }

      if (currentRule.endAfter && currentRule.endAfter(currentIndex, parentRule && parentRule.type)) {
        return {
          ...result,
          length: this.lengthBetween(startingFrom, currentRule.parsedUntil(currentIndex, parentRule && parentRule.type))
        };
      }
      currentIndex += 1;
    } while (currentIndex < this.expression.length);

    return {
      ...result,
      length: this.expression.length - startingFrom,
      error: 'Reached end of expression without completing parsing'
    };
  }
}

interface ParseRule {
  /**
   * Applicable node type
   */
  type: ParseNodeType;
  /**
   * Returns true if the rule applies starting at the provided index
   */
  startWith(index: number, currentNodeType: ParseNodeType): boolean;
  /**
   * Returns an error string if an error is detected at the provided index
   */
  errorOn?(index: number): string | undefined;
  /**
   * Returns true if the rule ends before the provided index
   */
  endBefore?(index: number, parentNodeType?: ParseNodeType): boolean;
  /**
   * Returns true if the rule ends after the provided index
   */
  endAfter?(index: number, parentNodeType?: ParseNodeType): boolean;
  /**
   * Returns the final parsed index after the rule has completed
   */
  parsedUntil(endingIndex: number, parentNodeType?: ParseNodeType): number;
  /**
   * Returns the index to begin parsing after the rule was triggered
   */
  beginParseFrom?(startingIndex: number): number;
}
