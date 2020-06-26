/**
 * A Node in the prase tree representing some part of the variable expression
 */
export interface ParseNode {
  /**
   * Child nodes
   */
  children: ParseNode[];
  /**
   * The start index relative to the entire expression
   */
  start: number;
  /**
   * The length of the expression contained in this, including its children
   */
  length: number;
  /**
   * The type of parse node
   */
  type: ParseNodeType;
  /**
   * Errors parsing this node
   */
  error?: string;
}

/**
 * Represents the type of information represented by a `ParseNode`
 */
export const enum ParseNodeType {
  /**
   * A parse tree root node
   */
  Root = 'root',
  /**
   * An expression containing a variable
   */
  Expression = 'expression',
  /**
   * Text, potentially inside another node
   */
  Text = 'text',
  /**
   * An escaped character
   */
  EscapedCharacter = 'escape'
}
