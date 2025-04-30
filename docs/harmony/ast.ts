// ast.ts
import { Token } from './lexer'; // Assuming lexer is in lexer.ts

// --- Base Node ---
export interface AstNode {
    kind: AstNodeKind;
    token: Token; // Primarily for error reporting/debugging, points to the main token of the node
}

export enum AstNodeKind {
    // Statements
    Program = 'Program',
    VariableDeclaration = 'VariableDeclaration',
    FunctionDeclaration = 'FunctionDeclaration',
    ClassDeclaration = 'ClassDeclaration',
    IfStatement = 'IfStatement',
    WhileStatement = 'WhileStatement',
    ForStatement = 'ForStatement',
    ReturnStatement = 'ReturnStatement',
    ExpressionStatement = 'ExpressionStatement',
    BlockStatement = 'BlockStatement', // Represents an indented block

    // Expressions
    Identifier = 'Identifier',
    IntegerLiteral = 'IntegerLiteral',
    FloatLiteral = 'FloatLiteral',
    StringLiteral = 'StringLiteral',
    BooleanLiteral = 'BooleanLiteral',
    ListLiteral = 'ListLiteral',
    DictLiteral = 'DictLiteral',
    BinaryExpression = 'BinaryExpression',
    UnaryExpression = 'UnaryExpression',
    FunctionCall = 'FunctionCall',
    MemberAccess = 'MemberAccess',
    SubscriptAccess = 'SubscriptAccess',
    InstanceCreation = 'InstanceCreation',
    SelfExpression = 'SelfExpression', // Represents 'self' keyword

    // Others
    Parameter = 'Parameter',
    TypeAnnotation = 'TypeAnnotation',
    DictItem = 'DictItem',
    Comment = 'Comment', // Optionally include comments in AST
}

// --- Program ---
export interface Program extends AstNode {
    kind: AstNodeKind.Program;
    statements: Statement[];
}

// --- Statements ---
export type Statement =
    | VariableDeclaration
    | FunctionDeclaration
    | ClassDeclaration
    | IfStatement
    | WhileStatement
    | ForStatement
    | ReturnStatement
    | ExpressionStatement
    | BlockStatement; // BlockStatement is useful internally

export interface BlockStatement extends AstNode {
    kind: AstNodeKind.BlockStatement;
    statements: Statement[];
}

export interface VariableDeclaration extends AstNode {
    kind: AstNodeKind.VariableDeclaration;
    isConstant: boolean; // true for 'let', false for 'var'
    identifier: Identifier;
    typeAnnotation?: TypeAnnotation;
    initializer: Expression;
}

export interface FunctionDeclaration extends AstNode {
    kind: AstNodeKind.FunctionDeclaration;
    name: Identifier;
    parameters: Parameter[];
    returnType?: TypeAnnotation;
    body: BlockStatement;
    isMethod: boolean; // Flag if it's a class method or initializer
    isInitializer: boolean; // Flag if it's 'init'
}

export interface ClassDeclaration extends AstNode {
    kind: AstNodeKind.ClassDeclaration;
    name: Identifier;
    members: (VariableDeclaration | FunctionDeclaration)[]; // Members are vars or methods/init
}

export interface IfStatement extends AstNode {
    kind: AstNodeKind.IfStatement;
    condition: Expression;
    consequence: BlockStatement;
    alternatives: { condition: Expression; consequence: BlockStatement }[]; // elif branches
    alternative?: BlockStatement; // else branch
}

export interface WhileStatement extends AstNode {
    kind: AstNodeKind.WhileStatement;
    condition: Expression;
    body: BlockStatement;
}

export interface ForStatement extends AstNode {
    kind: AstNodeKind.ForStatement;
    variable: Identifier; // The 'item' in 'for item in iterable'
    iterable: Expression;
    body: BlockStatement;
}

export interface ReturnStatement extends AstNode {
    kind: AstNodeKind.ReturnStatement;
    returnValue?: Expression;
}

export interface ExpressionStatement extends AstNode {
    kind: AstNodeKind.ExpressionStatement;
    expression: Expression;
}

// --- Expressions ---
export type Expression =
    | Identifier
    | IntegerLiteral
    | FloatLiteral
    | StringLiteral
    | BooleanLiteral
    | ListLiteral
    | DictLiteral
    | BinaryExpression
    | UnaryExpression
    | FunctionCall
    | MemberAccess
    | SubscriptAccess
    | InstanceCreation
    | SelfExpression;

export interface Identifier extends AstNode {
    kind: AstNodeKind.Identifier;
    name: string;
}

export interface IntegerLiteral extends AstNode {
    kind: AstNodeKind.IntegerLiteral;
    value: number;
}

export interface FloatLiteral extends AstNode {
    kind: AstNodeKind.FloatLiteral;
    value: number;
}

export interface StringLiteral extends AstNode {
    kind: AstNodeKind.StringLiteral;
    value: string;
    // Note: Interpolation parsing is complex. This AST assumes the string
    // value contains the raw content, including '(...)'. A later pass
    // would handle interpolation processing based on this raw string.
}

export interface BooleanLiteral extends AstNode {
    kind: AstNodeKind.BooleanLiteral;
    value: boolean;
}

export interface ListLiteral extends AstNode {
    kind: AstNodeKind.ListLiteral;
    elements: Expression[];
}

export interface DictLiteral extends AstNode {
    kind: AstNodeKind.DictLiteral;
    items: DictItem[];
}

export interface DictItem extends AstNode {
    kind: AstNodeKind.DictItem;
    key: Expression;
    value: Expression;
}

export interface BinaryExpression extends AstNode {
    kind: AstNodeKind.BinaryExpression;
    left: Expression;
    operator: string; // e.g., '+', '==', 'and'
    right: Expression;
}

export interface UnaryExpression extends AstNode {
    kind: AstNodeKind.UnaryExpression;
    operator: string; // e.g., 'not', '-' (if implemented)
    operand: Expression;
}

export interface FunctionCall extends AstNode {
    kind: AstNodeKind.FunctionCall;
    function: Expression; // Could be Identifier or MemberAccess
    arguments: Expression[];
}

export interface MemberAccess extends AstNode {
    kind: AstNodeKind.MemberAccess;
    object: Expression;
    property: Identifier;
}

export interface SubscriptAccess extends AstNode {
    kind: AstNodeKind.SubscriptAccess;
    object: Expression;
    index: Expression;
}

export interface InstanceCreation extends AstNode {
    kind: AstNodeKind.InstanceCreation;
    className: Identifier;
    arguments: Expression[];
}

export interface SelfExpression extends AstNode {
    kind: AstNodeKind.SelfExpression;
    name: 'self';
}

// --- Others ---
export interface Parameter extends AstNode {
    kind: AstNodeKind.Parameter;
    identifier: Identifier;
    typeAnnotation?: TypeAnnotation;
    defaultValue?: Expression;
}

export interface TypeAnnotation extends AstNode {
    kind: AstNodeKind.TypeAnnotation;
    typeName: Identifier; // Represents the name of the type (e.g., String, Int, MyClass)
}

// Optional: Comment Node
export interface CommentNode extends AstNode {
    kind: AstNodeKind.Comment;
    text: string;
}