// parser.ts
import { Lexer, Token, TokenType } from './lexer';
import * as ast from './ast';

// Define operator precedence levels
enum Precedence {
    LOWEST = 0,
    ASSIGN,        // = (Though handled separately in statements)
    OR,            // or
    AND,           // and
    EQUALS,        // ==, !=
    LESSGREATER,   // >, <, >=, <=
    SUM,           // +, -
    PRODUCT,       // *, /
    PREFIX,        // not, -X
    CALL,          // myFunction(X)
    INDEX,         // array[X]
    MEMBER         // object.X
}

// Map token types to precedence levels
const precedences: Map<TokenType, Precedence> = new Map([
    [TokenType.ASSIGN, Precedence.ASSIGN], // Should be handled by statement parsing
    [TokenType.OR, Precedence.OR],
    [TokenType.AND, Precedence.AND],
    [TokenType.EQUAL, Precedence.EQUALS],
    [TokenType.NOT_EQUAL, Precedence.EQUALS],
    [TokenType.LESS, Precedence.LESSGREATER],
    [TokenType.GREATER, Precedence.LESSGREATER],
    [TokenType.LESS_EQUAL, Precedence.LESSGREATER],
    [TokenType.GREATER_EQUAL, Precedence.LESSGREATER],
    [TokenType.PLUS, Precedence.SUM],
    [TokenType.MINUS, Precedence.SUM],
    [TokenType.MULTIPLY, Precedence.PRODUCT],
    [TokenType.DIVIDE, Precedence.PRODUCT],
    [TokenType.LEFT_PAREN, Precedence.CALL],       // For function calls
    [TokenType.LEFT_BRACKET, Precedence.INDEX],    // For subscript access
    [TokenType.DOT, Precedence.MEMBER],       // For member access
]);

export class Parser {
    private lexer: Lexer;
    private currentToken: Token;
    private peekToken: Token;
    private errors: string[] = [];

    // Pratt parser function types
    private prefixParseFns: Map<TokenType, () => ast.Expression | null>;
    private infixParseFns: Map<TokenType, (left: ast.Expression) => ast.Expression | null>;

    private isInClass = false; // Track if parsing inside a class definition

    constructor(lexer: Lexer) {
        this.lexer = lexer;

        // Initialize tokens safely
        this.currentToken = this.lexer.nextToken();
        this.peekToken = this.lexer.nextToken(); // Initialize peekToken before using it in nextToken logic

        // Call nextToken to correctly position current and peek, skipping initial comments
        this.nextToken(); // Sets up currentToken and peekToken properly
        if (this.currentToken.type === TokenType.EOF && this.peekToken.type !== TokenType.EOF) {
             // Handle edge case where file starts with comments
             this.nextToken();
        }


        // Register Pratt parser functions
        this.prefixParseFns = new Map();
        this.registerPrefix(TokenType.IDENTIFIER, this.parseIdentifierOrInstanceCreation);
        this.registerPrefix(TokenType.INTEGER, this.parseIntegerLiteral);
        this.registerPrefix(TokenType.FLOAT, this.parseFloatLiteral);
        this.registerPrefix(TokenType.STRING, this.parseStringLiteral);
        this.registerPrefix(TokenType.TRUE, this.parseBooleanLiteral);
        this.registerPrefix(TokenType.FALSE, this.parseBooleanLiteral);
        this.registerPrefix(TokenType.LEFT_PAREN, this.parseGroupedExpression);
        this.registerPrefix(TokenType.LEFT_BRACKET, this.parseListLiteral);
        this.registerPrefix(TokenType.LEFT_BRACE, this.parseDictLiteral);
        this.registerPrefix(TokenType.NOT, this.parsePrefixExpression);
        this.registerPrefix(TokenType.MINUS, this.parsePrefixExpression); // For unary minus if needed
        this.registerPrefix(TokenType.SELF, this.parseSelfExpression);

        this.infixParseFns = new Map();
        this.registerInfix(TokenType.PLUS, this.parseInfixExpression);
        this.registerInfix(TokenType.MINUS, this.parseInfixExpression);
        this.registerInfix(TokenType.MULTIPLY, this.parseInfixExpression);
        this.registerInfix(TokenType.DIVIDE, this.parseInfixExpression);
        this.registerInfix(TokenType.EQUAL, this.parseInfixExpression);
        this.registerInfix(TokenType.NOT_EQUAL, this.parseInfixExpression);
        this.registerInfix(TokenType.LESS, this.parseInfixExpression);
        this.registerInfix(TokenType.GREATER, this.parseInfixExpression);
        this.registerInfix(TokenType.LESS_EQUAL, this.parseInfixExpression);
        this.registerInfix(TokenType.GREATER_EQUAL, this.parseInfixExpression);
        this.registerInfix(TokenType.AND, this.parseInfixExpression);
        this.registerInfix(TokenType.OR, this.parseInfixExpression);
        this.registerInfix(TokenType.LEFT_PAREN, this.parseFunctionCall);
        this.registerInfix(TokenType.LEFT_BRACKET, this.parseSubscriptAccess);
        this.registerInfix(TokenType.DOT, this.parseMemberAccess);
    }

    // Advances tokens, skipping comments. Ensures peekToken is always valid or EOF.
    private nextToken(): void {
        this.currentToken = this.peekToken ?? { type: TokenType.EOF, literal: '', line: 0, column: 0 };
        this.peekToken = this.lexer.nextToken();

        // Skip comment tokens by recursively calling nextToken until a non-comment peek is found
        while (this.peekToken && this.peekToken.type === TokenType.COMMENT) {
            this.peekToken = this.lexer.nextToken();
        }
         // Ensure peekToken is EOF if lexer returns null
         if (!this.peekToken) {
             this.peekToken = { type: TokenType.EOF, literal: '', line: this.currentToken.line, column: this.currentToken.column + 1 }; // Approximate position
         }
    }


    getErrors(): string[] {
        return this.errors;
    }

    private peekError(expected: TokenType): void {
        const msg = `Expected next token to be ${expected}, got ${this.peekToken.type} instead (line ${this.peekToken.line}, col ${this.peekToken.column})`;
        this.errors.push(msg);
    }

     private currentTokenIs(tokenType: TokenType): boolean {
        return this.currentToken.type === tokenType;
    }

    private peekTokenIs(tokenType: TokenType): boolean {
        return this.peekToken.type === tokenType;
    }

    // Checks if the *next* token matches the expected type.
    // If it matches, it consumes the token (advances) and returns true.
    // If it doesn't match, it logs an error and returns false.
    private expectPeek(tokenType: TokenType): boolean {
        if (this.peekTokenIs(tokenType)) {
            this.nextToken(); // Consume the token
            return true;
        } else {
            this.peekError(tokenType);
            return false;
        }
    }

    // --- Precedence Helpers ---
     private peekPrecedence(): Precedence {
        return precedences.get(this.peekToken.type) || Precedence.LOWEST;
    }

    private currentPrecedence(): Precedence {
        return precedences.get(this.currentToken.type) || Precedence.LOWEST;
    }

    // --- Registration Helpers ---
    private registerPrefix(tokenType: TokenType, fn: () => ast.Expression | null): void {
        this.prefixParseFns.set(tokenType, fn.bind(this));
    }

    private registerInfix(tokenType: TokenType, fn: (left: ast.Expression) => ast.Expression | null): void {
        this.infixParseFns.set(tokenType, fn.bind(this));
    }

    // --- Main Parsing Method ---
    parseProgram(): ast.Program {
        const program: ast.Program = {
            kind: ast.AstNodeKind.Program,
            token: this.currentToken, // Usually the first significant token
            statements: [],
        };

        // Skip leading newlines/dedents before the first statement
        while (this.currentTokenIs(TokenType.NEWLINE) || this.currentTokenIs(TokenType.DEDENT)) {
            this.nextToken();
        }

        while (!this.currentTokenIs(TokenType.EOF)) {
            const stmt = this.parseStatement();
            if (stmt) {
                program.statements.push(stmt);
            } else {
                 // If parseStatement returns null, an error occurred.
                 // We need to advance the token to avoid infinite loop if recovery isn't perfect.
                 // This ensures progress even if a statement fails badly.
                 console.error(`Parser: Failed to parse statement starting with ${this.currentToken.type} at line ${this.currentToken.line}. Advancing token.`);
                 this.nextToken();
            }

            // Skip trailing newlines/dedents after a statement
             while (this.currentTokenIs(TokenType.NEWLINE) || this.currentTokenIs(TokenType.DEDENT)) {
                // Special case: Don't skip DEDENT if it's immediately followed by EOF, lexer handles final DEDENTs
                 if(this.currentTokenIs(TokenType.DEDENT) && this.peekTokenIs(TokenType.EOF)) break;
                 this.nextToken();
                 if (this.currentTokenIs(TokenType.EOF)) break;
            }
        }

        return program;
    }

    private parseStatement(): ast.Statement | null {
        // console.log(`Parsing statement: current=${this.currentToken.type}, peek=${this.peekToken.type}`); // Debug logging

        switch (this.currentToken.type) {
            case TokenType.LET:
            case TokenType.VAR:
                return this.parseVariableDeclaration();
            case TokenType.RETURN:
                return this.parseReturnStatement();
            case TokenType.FUNC:
                 if (this.peekTokenIs(TokenType.INIT)) {
                     if (!this.isInClass) {
                        this.errors.push(`Parser Error: 'init' found outside of class definition (line ${this.currentToken.line})`);
                        return null;
                     }
                    return this.parseFunctionDeclaration(true, true); // isMethod=true, isInitializer=true
                 }
                 return this.parseFunctionDeclaration(this.isInClass, false); // isMethod depends on context, isInitializer=false
            case TokenType.CLASS:
                 return this.parseClassDeclaration();
            case TokenType.IF:
                 return this.parseIfStatement();
            case TokenType.WHILE:
                 return this.parseWhileStatement();
            case TokenType.FOR:
                 return this.parseForStatement();
             case TokenType.NEWLINE: // Skip empty lines
             case TokenType.DEDENT:  // Should be handled by block/program loop
                 this.nextToken();
                 return null; // Not a statement itself
            default:
                // Assume it's an expression statement
                return this.parseExpressionStatement();
        }
    }

    // Parses an indented block of statements.
    // Assumes the token *before* the block (e.g., ':') has just been consumed.
    // Expects NEWLINE -> INDENT -> statements -> DEDENT
    private parseBlockStatement(): ast.BlockStatement | null {
        const blockToken = this.currentToken; // Token that *triggered* the block (e.g., ':')

        // Expect NEWLINE followed by INDENT
        if (!this.expectPeek(TokenType.NEWLINE)) {
             this.errors.push(`Expected NEWLINE after ':' or '->' to start block, got ${this.peekToken.type}`);
            return null;
        }
        if (!this.expectPeek(TokenType.INDENT)) {
             this.errors.push(`Expected INDENT to start block body, got ${this.peekToken.type}`);
            return null;
        }
        // currentToken is now INDENT

        const block: ast.BlockStatement = {
            kind: ast.AstNodeKind.BlockStatement,
            token: blockToken, // Associate with the token that started the block structure
            statements: [],
        };

        // Parse statements until DEDENT
        while (!this.currentTokenIs(TokenType.DEDENT) && !this.currentTokenIs(TokenType.EOF)) {
            // Skip any blank lines within the block
            while (this.currentTokenIs(TokenType.NEWLINE)) {
                 this.nextToken();
            }
            // Check again after skipping newlines
            if (this.currentTokenIs(TokenType.DEDENT) || this.currentTokenIs(TokenType.EOF)) {
                break;
            }

            const stmt = this.parseStatement();
            if (stmt) {
                block.statements.push(stmt);
            } else {
                 // Error occurred parsing statement within block or encountered skipped token (like NEWLINE)
                 // parseStatement returning null might mean error OR just a skipped token.
                 // If currentToken hasn't advanced, force it to prevent loop. This shouldn't be needed if parseStatement handles advancement on error.
                 // Let the main loop handle advancement if stmt is null.
                 // However, need to ensure we eventually hit DEDENT or EOF.
                 // If we are stuck NOT on DEDENT/EOF, and parseStatement is null -> advance.
                 if (!this.currentTokenIs(TokenType.DEDENT) && !this.currentTokenIs(TokenType.EOF)) {
                     // This path indicates parseStatement failed AND didn't advance or returned null for a non-statement token
                     // Maybe log this?
                     // console.warn(`parseBlockStatement: Advancing token after null statement, current=${this.currentToken.type}`);
                     // this.nextToken(); // Risky - might skip required DEDENT
                 }
            }
        }

        if (!this.currentTokenIs(TokenType.DEDENT)) {
             // Allow EOF to implicitly end the last block? Or require DEDENT?
             // The lexer should guarantee a DEDENT before EOF unless the file is empty/malformed.
             if (!this.currentTokenIs(TokenType.EOF)) {
                 this.errors.push(`Expected DEDENT to end block, got ${this.currentToken.type} (line ${this.currentToken.line})`);
                 // Attempt recovery: Assume block ends here, but don't consume the unexpected token.
                 // return block; // Return partially parsed block
                 return null; // Indicate failure
             }
        } else {
            // We are on the DEDENT token. Consume it.
            // The outer loop (parseProgram or parseClassBody) might also skip DEDENTs,
            // but consuming it here correctly marks the end of *this* block.
            // this.nextToken(); // Consume DEDENT
            // Let the caller handle the DEDENT, as it signifies end of block *and* potentially affects outer structure.
        }

        return block;
    }

    // let name: Type = value NEWLINE
    // var name = value NEWLINE
    private parseVariableDeclaration(): ast.VariableDeclaration | null {
        const declToken = this.currentToken; // 'let' or 'var'
        const isConstant = this.currentTokenIs(TokenType.LET);

        if (!this.expectPeek(TokenType.IDENTIFIER)) return null;
        const identifier: ast.Identifier = {
            kind: ast.AstNodeKind.Identifier,
            token: this.currentToken,
            name: this.currentToken.literal,
        };

        let typeAnnotation: ast.TypeAnnotation | undefined = undefined;
        if (this.peekTokenIs(TokenType.COLON)) {
            this.nextToken(); // Consume ':'
            typeAnnotation = this.parseTypeAnnotation(); // consumes the type Identifier
            if (!typeAnnotation) return null;
        }

        if (!this.expectPeek(TokenType.ASSIGN)) return null; // Expect '=', consumes '='
        // currentToken is now '='

        this.nextToken(); // Consume '=', advance to start of initializer expression

        const initializer = this.parseExpression(Precedence.LOWEST);
        if (!initializer) {
            this.errors.push(`Expected expression for variable initializer (line ${this.currentToken.line})`);
            return null;
        }
        // currentToken is now the last token of the initializer expression

        // Expect a NEWLINE to terminate the simple statement
        if (!this.expectPeek(TokenType.NEWLINE)) {
             // Allow parsing to continue if EOF follows expression? Consider spec.
            if (!this.currentTokenIs(TokenType.EOF)) {
                 this.errors.push(`Expected NEWLINE after variable declaration, got ${this.currentToken.type} (line ${this.currentToken.line})`);
                 // Don't return null, allow partial AST but record error
             }
         }
         // If expectPeek succeeded, NEWLINE was consumed. currentToken is now NEWLINE.


        return {
            kind: ast.AstNodeKind.VariableDeclaration,
            token: declToken,
            isConstant: isConstant,
            identifier: identifier,
            typeAnnotation: typeAnnotation,
            initializer: initializer,
        };
    }

    // Parses TYPE in ': TYPE'. Assumes ':' was just consumed.
    private parseTypeAnnotation(): ast.TypeAnnotation | null {
        if (!this.expectPeek(TokenType.IDENTIFIER)) { // Type names are identifiers
            this.errors.push(`Expected type name after ':', got ${this.peekToken.type}`);
            return null;
        }
        // expectPeek consumed IDENTIFIER, currentToken is now IDENTIFIER
        const typeIdentifier: ast.Identifier = {
            kind: ast.AstNodeKind.Identifier,
            token: this.currentToken,
            name: this.currentToken.literal,
        };
        return {
            kind: ast.AstNodeKind.TypeAnnotation,
            token: typeIdentifier.token, // Use identifier token
            typeName: typeIdentifier
        };
    }

    // return expression? NEWLINE
    private parseReturnStatement(): ast.ReturnStatement | null {
        const returnToken = this.currentToken;
        this.nextToken(); // Consume 'return'

        let returnValue: ast.Expression | undefined = undefined;

        // If the current token is not NEWLINE or EOF, parse an expression
        if (!this.currentTokenIs(TokenType.NEWLINE) && !this.currentTokenIs(TokenType.EOF)) {
             returnValue = this.parseExpression(Precedence.LOWEST);
             if (!returnValue) {
                 // Parsing expression failed, error already logged? Let's add one just in case.
                 this.errors.push(`Expected expression or newline after 'return', got ${this.currentToken.type}`);
                 return null;
             }
             // currentToken is now the last token of the returnValue expression
        }

        // Expect a NEWLINE to terminate the simple statement
        if (!this.expectPeek(TokenType.NEWLINE)) {
             // Allow EOF to terminate the last statement?
             if (!this.currentTokenIs(TokenType.EOF)) {
                 this.errors.push(`Expected NEWLINE after return statement, got ${this.currentToken.type} (line ${this.currentToken.line})`);
                 // Continue, but with error recorded
             }
        }
        // If expectPeek succeeded, currentToken is now NEWLINE.

        return {
            kind: ast.AstNodeKind.ReturnStatement,
            token: returnToken,
            returnValue: returnValue,
        };
    }

    // Expression NEWLINE
    private parseExpressionStatement(): ast.ExpressionStatement | null {
        const stmtToken = this.currentToken;
        const expression = this.parseExpression(Precedence.LOWEST);

        if (!expression) {
            // If no expression could be parsed from the current token, it's an error.
            this.errors.push(`Unexpected token ${this.currentToken.type} when expecting an expression or statement start (line ${this.currentToken.line})`);
            return null; // Can't form a valid statement here.
        }
        // currentToken is now the last token of the expression

        // Simple statements must end with a newline (or EOF)
        if (!this.expectPeek(TokenType.NEWLINE)) {
            if (!this.currentTokenIs(TokenType.EOF)) {
                this.errors.push(`Expected NEWLINE after expression statement, got ${this.currentToken.type} (line ${this.currentToken.line})`);
                // Continue, record error
            }
        }
        // If expectPeek worked, currentToken is NEWLINE

        return {
            kind: ast.AstNodeKind.ExpressionStatement,
            token: stmtToken, // Use the token starting the expression
            expression: expression,
        };
    }

     // --- Expression Parsers (Pratt Parser Implementation) ---

    private parseExpression(precedence: Precedence): ast.Expression | null {
        const prefixFn = this.prefixParseFns.get(this.currentToken.type);
        if (!prefixFn) {
            this.errors.push(`No prefix parse function found for ${this.currentToken.type} (line ${this.currentToken.line})`);
            return null;
        }
        let leftExp = prefixFn(); // Prefix function consumes its tokens
        if (!leftExp) return null; // Error during prefix parsing

        // While the *next* token is an infix operator and has higher precedence than the current binding power
        while (!this.peekTokenIs(TokenType.NEWLINE) && !this.peekTokenIs(TokenType.EOF) && precedence < this.peekPrecedence()) {
            const infixFn = this.infixParseFns.get(this.peekToken.type);
            if (!infixFn) {
                // Not an infix operator we handle, or lower precedence. Stop associating.
                return leftExp;
            }

            this.nextToken(); // Consume the infix operator token (e.g., '+', '(', '[', '.')

            const result = infixFn(leftExp); // Call the infix function. It consumes the rest of its expression.
            if (!result) return null; // Error during infix parsing
            leftExp = result;
            // Continue loop: check precedence of the *next* peekToken against the original 'precedence' level
        }

        // Base case: No more infix operators or lower precedence found.
        return leftExp;
    }


    // --- Prefix Parse Functions ---
    // These functions are called when their token type is encountered in prefix position.
    // They must parse the expression starting with that token and leave `currentToken`
    // on the *last* token of the parsed expression.

    private parseIdentifierOrInstanceCreation = (): ast.Expression | null => {
         const identToken = this.currentToken;
         const identifier: ast.Identifier = {
            kind: ast.AstNodeKind.Identifier,
            token: identToken,
            name: identToken.literal,
         };

         // Check for Instance Creation: ClassName(...)
         if (this.peekTokenIs(TokenType.LEFT_PAREN)) {
             // Heuristic: Check if Identifier starts with Uppercase
             const firstChar = identifier.name.charCodeAt(0);
             if (firstChar >= 65 && firstChar <= 90) { // A-Z
                 this.nextToken(); // Consume IDENTIFIER, currentToken is now '('
                 // Delegate to parseFunctionCall logic, treating the identifier as the function/class name
                 // Need a way to distinguish between call and instantiation in AST or later phase.
                 // Using InstanceCreation AST node here.
                 const callExpr = this.parseFunctionCall(identifier); // Pass identifier as the "function" part
                 if (!callExpr) return null;

                 // Convert FunctionCall AST to InstanceCreation AST
                 if (callExpr.kind === ast.AstNodeKind.FunctionCall) {
                     return {
                        kind: ast.AstNodeKind.InstanceCreation,
                        token: identToken, // Token of the class name
                        className: identifier,
                        arguments: callExpr.arguments,
                     };
                 } else {
                     // Should not happen if parseFunctionCall returns correctly
                     this.errors.push("Internal parser error: Expected FunctionCall result when parsing instance creation.");
                     return null;
                 }
             }
         }

         // Just a regular identifier, no '('. The main loop will handle infix operators if any.
         // Current token is still the identifier. Need to advance *past* it.
         // NO - the Pratt loop expects the prefix/infix function to leave currentToken on the last token consumed.
         // If it's just an identifier, that's the last token of this "expression".
         return identifier;
     };

    private parseIntegerLiteral = (): ast.Expression | null => {
        const token = this.currentToken;
        const value = parseInt(token.literal, 10);
        if (isNaN(value)) {
            this.errors.push(`Could not parse integer literal: ${token.literal} (line ${token.line})`);
            return null;
        }
        // currentToken is the integer token. Return the node.
        return {
            kind: ast.AstNodeKind.IntegerLiteral,
            token: token,
            value: value,
        };
    };

     private parseFloatLiteral = (): ast.Expression | null => {
        const token = this.currentToken;
        const value = parseFloat(token.literal);
        if (isNaN(value)) {
            this.errors.push(`Could not parse float literal: ${token.literal} (line ${token.line})`);
            return null;
        }
        // currentToken is the float token. Return the node.
        return {
            kind: ast.AstNodeKind.FloatLiteral,
            token: token,
            value: value,
        };
    };

     private parseStringLiteral = (): ast.Expression | null => {
        // currentToken is the string token. Return the node.
        return {
            kind: ast.AstNodeKind.StringLiteral,
            token: this.currentToken,
            value: this.currentToken.literal,
        };
    };

    private parseBooleanLiteral = (): ast.Expression | null => {
        // currentToken is TRUE or FALSE. Return the node.
        return {
            kind: ast.AstNodeKind.BooleanLiteral,
            token: this.currentToken,
            value: this.currentTokenIs(TokenType.TRUE),
        };
    };

     private parsePrefixExpression = (): ast.Expression | null => {
        const operatorToken = this.currentToken; // 'not' or '-'
        const operator = operatorToken.literal;

        this.nextToken(); // Consume the operator, advance to operand start

        const operand = this.parseExpression(Precedence.PREFIX); // Parse operand with correct precedence
        if (!operand) {
            this.errors.push(`Expected expression after prefix operator '${operator}' (line ${operatorToken.line})`);
            return null;
        }
        // currentToken is now the last token of the operand expression.

        return {
            kind: ast.AstNodeKind.UnaryExpression,
            token: operatorToken,
            operator: operator,
            operand: operand,
        };
    };

    // Parses '(' expression ')'
    private parseGroupedExpression = (): ast.Expression | null => {
        // currentToken is '('. Consume it to get to the expression start.
        this.nextToken();

        const exp = this.parseExpression(Precedence.LOWEST);
        if (!exp) return null; // Error parsing expression inside parentheses

        // After parsing the inner expression, expect the closing parenthesis ')'
        if (!this.expectPeek(TokenType.RIGHT_PAREN)) {
            // Error already logged by expectPeek
            return null;
        }
        // expectPeek consumed ')'. currentToken is now ')'. This is the last token of the grouped expression.

        return exp; // Return the inner expression, the parens just affect precedence
    };

     // Parses '[' (expression (',' expression)*)? ']'
    private parseListLiteral = (): ast.Expression | null => {
        const listToken = this.currentToken; // '['
        // currentToken is '['. parseExpressionList expects to be called *after* '['
        // and will consume the closing ']'.
        const elements = this.parseExpressionList(TokenType.RIGHT_BRACKET, TokenType.LEFT_BRACKET);
        if (elements === null) return null; // Error parsing elements

        // parseExpressionList consumed ']'. currentToken is now ']'.

        return {
            kind: ast.AstNodeKind.ListLiteral,
            token: listToken,
            elements: elements,
        };
    };

    // Parses '{' (item (',' item)*)? '}' where item is key ':' value
    private parseDictLiteral = (): ast.Expression | null => {
        const dictToken = this.currentToken; // '{'
        this.nextToken(); // Consume '{'

        const items: ast.DictItem[] = [];

        // Handle empty dict {}
        if (this.currentTokenIs(TokenType.RIGHT_BRACE)) {
            // We consumed '{', now currentToken is '}'. This is the end of the literal.
             // Let the main loop advance past it.
            return {
                kind: ast.AstNodeKind.DictLiteral,
                token: dictToken,
                items: items,
            };
        }

        // Parse first item (if not empty)
        const firstItem = this.parseDictItem();
        if (!firstItem) return null;
        items.push(firstItem);
        // currentToken is now the last token of the first item's value

        // Parse subsequent items (comma-separated)
        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken(); // Consume ','

            // Check for trailing comma followed by '}'
            if (this.peekTokenIs(TokenType.RIGHT_BRACE)) {
                 // Don't consume '}', just break the loop. The '}' check below will handle it.
                 this.nextToken(); // Consume the trailing ','
                break;
            }
             // If not trailing comma, then current token is now ','
             this.nextToken(); // Consume ',', advance to the start of the next key


            const item = this.parseDictItem();
            if (!item) return null;
            items.push(item);
            // currentToken is now the last token of this item's value
        }

        // Expect '}'
        if (!this.currentTokenIs(TokenType.RIGHT_BRACE)) {
             this.errors.push(`Expected '}' or ',' to continue dictionary literal, got ${this.currentToken.type}`);
            return null;
        }
        // currentToken is '}'. This is the end of the dict literal.

        return {
            kind: ast.AstNodeKind.DictLiteral,
            token: dictToken,
            items: items,
        };
    };

     // Parses key_expression ':' value_expression
     // Assumes currentToken is at the start of the key expression.
     // Leaves currentToken on the last token of the value expression.
     private parseDictItem = (): ast.DictItem | null => {
         const key = this.parseExpression(Precedence.LOWEST); // Parses key expression
         if (!key) {
             this.errors.push(`Expected dictionary key expression, got ${this.currentToken.type}`);
             return null;
         }
         // currentToken is last token of key expression

         // Expect ':' after key
         if (!this.expectPeek(TokenType.COLON)) {
             this.errors.push(`Expected ':' after dictionary key, got ${this.peekToken.type}`);
             return null;
         }
         // expectPeek consumed ':'. currentToken is now ':'.

         // Advance past ':' to the value expression start
         this.nextToken();

         const value = this.parseExpression(Precedence.LOWEST); // Parses value expression
         if (!value) {
             this.errors.push(`Expected dictionary value expression, got ${this.currentToken.type}`);
             return null;
         }
         // currentToken is now the last token of the value expression.

         return {
             kind: ast.AstNodeKind.DictItem,
             token: key.token, // Use key's token for item's representative token
             key: key,
             value: value,
         };
     }

    private parseSelfExpression = (): ast.Expression | null => {
        if (!this.isInClass) {
             this.errors.push(`'self' keyword used outside of a class method or initializer (line ${this.currentToken.line})`);
             // Allow parsing to continue, maybe useful in REPL context, but it's an error.
        }
        // currentToken is 'self'. Return the node.
        return {
            kind: ast.AstNodeKind.SelfExpression,
            token: this.currentToken,
            name: 'self'
        };
    }


    // --- Infix Parse Functions ---
    // These functions are called when their token type is encountered in infix position.
    // `left` is the expression parsed to the left of the operator.
    // The function is called when `currentToken` is the infix operator.
    // They must parse the right-hand side and return the combined expression,
    // leaving `currentToken` on the *last* token of the *entire* infix expression.

    private parseInfixExpression = (left: ast.Expression): ast.Expression | null => {
        const operatorToken = this.currentToken; // e.g., '+', '=='
        const operator = operatorToken.literal;
        const precedence = this.currentPrecedence(); // Precedence of the current operator

        this.nextToken(); // Consume the operator, advance to the start of the right expression

        const right = this.parseExpression(precedence); // Parse right operand with operator's precedence
        if (!right) {
            this.errors.push(`Expected expression after infix operator '${operator}' (line ${operatorToken.line})`);
            return null;
        }
        // currentToken is now the last token of the right expression.

        return {
            kind: ast.AstNodeKind.BinaryExpression,
            token: operatorToken,
            left: left,
            operator: operator,
            right: right,
        };
    };

    // Parses comma-separated expressions until a given endToken is encountered.
    // Assumes the opening token (startToken) has *just* been consumed.
    // Consumes tokens including the endToken.
    // Leaves currentToken on the endToken.
    private parseExpressionList = (endToken: TokenType, startToken: TokenType): ast.Expression[] | null => {
        const list: ast.Expression[] = [];

        // Check for empty list: e.g., () or []
        // currentToken is startToken (e.g. '(', '['). Check if peek is endToken.
        if (this.peekTokenIs(endToken)) {
             this.nextToken(); // Consume the end token (e.g., ')')
            // currentToken is now endToken
            return list;
        }

        // List is not empty, advance past the opening token to the first expression.
        this.nextToken(); // Consume startToken, currentToken is now start of first expr

        // Parse first expression
        const firstExp = this.parseExpression(Precedence.LOWEST);
        if (!firstExp) {
             this.errors.push(`Expected expression after '${startToken}' in list, got ${this.currentToken.type}`);
             return null;
        }
        list.push(firstExp);
        // currentToken is now the last token of the first expression


        // Parse subsequent expressions (comma-separated)
        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken(); // Consume ','

            // Handle trailing comma: if the next token is endToken, consume the comma and break
            if (this.peekTokenIs(endToken)) {
                 this.nextToken(); // Consume endToken
                 // currentToken is now endToken
                 return list; // Return list parsed so far
            }
             // If not endToken after comma, must be another expression
             this.nextToken(); // Consume ',', advance to the start of the next expression


            const exp = this.parseExpression(Precedence.LOWEST);
             if (!exp) {
                 this.errors.push(`Expected expression after ',' in list, got ${this.currentToken.type}`);
                 return null;
             }
            list.push(exp);
            // currentToken is now the last token of this expression
        }

        // After the loop, expect the end token
        if (!this.currentTokenIs(endToken)) {
             // If we didn't find endToken immediately after the last expr or after trailing comma
             if (!this.expectPeek(endToken)) { // Checks peek, consumes if matches
                 this.errors.push(`Expected ',' or '${endToken}' in expression list, got ${this.peekToken.type}`);
                 return null;
             }
        }
        // currentToken is now endToken

        return list;
    }


     // Called when currentToken is '('. Left is the function/callable expression.
     private parseFunctionCall = (funcExp: ast.Expression): ast.Expression | null => {
        const callToken = this.currentToken; // '(' token
        // currentToken is '('. parseExpressionList expects to be called *after* '('
        // and will consume ')', leaving currentToken on ')'.
        const args = this.parseExpressionList(TokenType.RIGHT_PAREN, TokenType.LEFT_PAREN);
        if (args === null) return null; // Error parsing arguments

        // parseExpressionList already consumed ')' and left currentToken on it.
        // The AST node is complete.

        return {
            kind: ast.AstNodeKind.FunctionCall,
            token: callToken, // Use '(' token as representative token
            function: funcExp,
            arguments: args,
        };
    };

    // Called when currentToken is '['. Left is the object being indexed.
     private parseSubscriptAccess = (objectExp: ast.Expression): ast.Expression | null => {
        const indexToken = this.currentToken; // '[' token
        // currentToken is '[', consume it to get to the index expression start
        this.nextToken();

        const indexExp = this.parseExpression(Precedence.LOWEST);
        if (!indexExp) {
            this.errors.push(`Expected index expression inside '[ ]', got ${this.currentToken.type}`);
            return null;
        }
        // currentToken is the last token of the index expression

        // Expect the closing bracket ']'
        if (!this.expectPeek(TokenType.RIGHT_BRACKET)) {
            // Error logged by expectPeek
            return null;
        }
        // expectPeek consumed ']'. currentToken is now ']'. This is the last token of the subscript expression.

        return {
            kind: ast.AstNodeKind.SubscriptAccess,
            token: indexToken, // Use '[' token
            object: objectExp,
            index: indexExp,
        };
    };

    // Called when currentToken is '.'. Left is the object.
    private parseMemberAccess = (objectExp: ast.Expression): ast.Expression | null => {
        const dotToken = this.currentToken; // '.' token

        // Expect an identifier after the dot
        if (!this.expectPeek(TokenType.IDENTIFIER)) {
             this.errors.push(`Expected identifier for member name after '.', got ${this.peekToken.type}`);
            return null;
        }
         // expectPeek consumed IDENTIFIER. currentToken is now IDENTIFIER.

        const property: ast.Identifier = {
            kind: ast.AstNodeKind.Identifier,
            token: this.currentToken,
            name: this.currentToken.literal,
        };
        // currentToken is the property Identifier. This is the last token of the member access expression.

        return {
            kind: ast.AstNodeKind.MemberAccess,
            token: dotToken, // Use '.' token
            object: objectExp,
            property: property,
        };
    };

     // --- Compound Statement Parsers ---

    // func name(params) -> Type : Block
    // or func init(params) : Block
    private parseFunctionDeclaration(isMethod: boolean, isInitializer: boolean): ast.FunctionDeclaration | null {
        const funcToken = this.currentToken; // 'func' token

        if (isInitializer) {
            // Expect 'init' after 'func'
            if (!this.expectPeek(TokenType.INIT)) return null;
            // currentToken is now 'init'
        } else {
            // Expect IDENTIFIER after 'func'
            if (!this.expectPeek(TokenType.IDENTIFIER)) return null;
             // currentToken is now IDENTIFIER
        }

         const name: ast.Identifier = { // Use 'init' literal if initializer
            kind: ast.AstNodeKind.Identifier,
            token: this.currentToken,
            name: this.currentToken.literal,
        };

        // Expect '(' for parameters
        if (!this.expectPeek(TokenType.LEFT_PAREN)) return null;
         // currentToken is now '('

        // parseParameters expects to be called *after* '(', consumes ')', leaves currentToken on ')'
        const parameters = this.parseParameters(TokenType.RIGHT_PAREN, TokenType.LEFT_PAREN);
        if (parameters === null) return null; // Error parsing parameters
        // currentToken is now ')'

        let returnType: ast.TypeAnnotation | undefined = undefined;
        if (this.peekTokenIs(TokenType.ARROW)) {
             if (isInitializer) {
                 this.errors.push(`Initializer 'init' cannot have an explicit return type annotation '->' (line ${this.peekToken.line})`);
                 return null;
             }
            this.nextToken(); // Consume '->'
            // currentToken is '->'
            returnType = this.parseTypeAnnotation(); // Consumes the type IDENTIFIER
            if (!returnType) return null; // Error parsing return type
             // currentToken is the type IDENTIFIER
        }

         // Expect ':' before block
         if (!this.expectPeek(TokenType.COLON)) return null;
         // currentToken is now ':'

         const currentInClass = this.isInClass;
         if (isMethod) this.isInClass = true; // Set context for 'self' parsing within the body
        const body = this.parseBlockStatement(); // Expects NEWLINE INDENT after ':', consumes DEDENT implicitly (by stopping before it)
         this.isInClass = currentInClass; // Restore context

        if (!body) {
            this.errors.push(`Expected function body block after ':' (line ${this.currentToken.line})`);
            return null;
        }
        // currentToken should be DEDENT (or EOF if it was the last thing)

        return {
            kind: ast.AstNodeKind.FunctionDeclaration,
            token: funcToken,
            name: name,
            parameters: parameters,
            returnType: returnType,
            body: body,
            isMethod: isMethod,
            isInitializer: isInitializer
        };
    }

     // Parses parameter list: (param1: Type = default, param2, ...)
     // Similar to parseExpressionList, but parses Parameters instead of Expressions.
     // Assumes startToken (e.g., '(') was just consumed. Consumes endToken (e.g., ')').
     // Leaves currentToken on the endToken.
     private parseParameters(endToken: TokenType, startToken: TokenType): ast.Parameter[] | null {
        const params: ast.Parameter[] = [];

        // Check for empty list: e.g., ()
         if (this.peekTokenIs(endToken)) {
             this.nextToken(); // Consume endToken
             // currentToken is now endToken
             return params;
         }

         // List is not empty, advance past the opening token to the first parameter.
         this.nextToken(); // Consume startToken, currentToken is now start of first param identifier

        // Parse first parameter
         let firstParam = this.parseSingleParameter();
         if (!firstParam) return null;
         params.push(firstParam);
         // currentToken is the last token of the first parameter (identifier, type, or default value)

        // Parse subsequent parameters (comma-separated)
        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken(); // Consume ','

             // Handle trailing comma: if next is endToken, consume endToken and return
             if (this.peekTokenIs(endToken)) {
                  this.nextToken(); // Consume endToken
                  // currentToken is endToken
                 return params; // Return list parsed so far
             }
              // If not endToken after comma, must be another parameter
              // currentToken is now ',', need to advance to param identifier
             this.nextToken(); // Consume ',', advance to the start of the next param identifier


            const param = this.parseSingleParameter();
            if (!param) return null;
            params.push(param);
             // currentToken is the last token of this parameter
        }

         // Expect the end token if we didn't hit trailing comma case
         if (!this.currentTokenIs(endToken)) {
             if (!this.expectPeek(endToken)) {
                 this.errors.push(`Expected ',' or '${endToken}' after parameter, got ${this.peekToken.type}`);
                 return null;
             }
         }
         // currentToken is now endToken

        return params;
    }

     // Parses IDENTIFIER (: Type)? (= Expression)?
     // Assumes currentToken is the IDENTIFIER.
     // Leaves currentToken on the last token of the parameter (identifier, type, or default value).
     private parseSingleParameter(): ast.Parameter | null {
        if (!this.currentTokenIs(TokenType.IDENTIFIER)) {
            this.errors.push(`Expected parameter name (identifier), got ${this.currentToken.type}`);
            return null;
        }
        const paramToken = this.currentToken;
        const identifier: ast.Identifier = {
            kind: ast.AstNodeKind.Identifier,
            token: paramToken,
            name: paramToken.literal,
        };

        let typeAnnotation: ast.TypeAnnotation | undefined = undefined;
        if (this.peekTokenIs(TokenType.COLON)) {
            this.nextToken(); // Consume IDENTIFIER
            // currentToken is ':'
            typeAnnotation = this.parseTypeAnnotation(); // Consumes type IDENTIFIER
            if (!typeAnnotation) return null;
             // currentToken is type IDENTIFIER
        }

        let defaultValue: ast.Expression | undefined = undefined;
        if (this.peekTokenIs(TokenType.ASSIGN)) {
            this.nextToken(); // Consume IDENTIFIER or Type Annotation
            // currentToken is '='
            this.nextToken(); // Consume '=', advance to expression start

            defaultValue = this.parseExpression(Precedence.LOWEST); // Or a restricted precedence? LOWEST is fine.
            if (!defaultValue) {
                this.errors.push(`Expected default value expression after '=' for parameter ${identifier.name}`);
                return null;
            }
            // currentToken is the last token of the default value expression
        }

        // currentToken is the last token consumed for this parameter
        return {
            kind: ast.AstNodeKind.Parameter,
            token: paramToken, // Use identifier token
            identifier: identifier,
            typeAnnotation: typeAnnotation,
            defaultValue: defaultValue,
        };
    }

    // class Name : Block
    private parseClassDeclaration(): ast.ClassDeclaration | null {
        const classToken = this.currentToken; // 'class' token
        if (!this.expectPeek(TokenType.IDENTIFIER)) return null;
         // currentToken is IDENTIFIER

        const name: ast.Identifier = {
            kind: ast.AstNodeKind.Identifier,
            token: this.currentToken,
            name: this.currentToken.literal,
        };

         // Expect ':' before body
         if (!this.expectPeek(TokenType.COLON)) return null;
        // currentToken is ':'

         const currentInClass = this.isInClass;
         this.isInClass = true; // Set context for member/method parsing
        const bodyMembers = this.parseClassBody(); // Parses the indented block
         this.isInClass = currentInClass; // Restore context

        if (!bodyMembers) {
            // parseClassBody should have reported specific error
            this.errors.push(`Expected class body block after ':' (line ${this.currentToken.line})`);
            return null;
        }
        // parseClassBody stopped before DEDENT. currentToken is DEDENT (or EOF).

        return {
            kind: ast.AstNodeKind.ClassDeclaration,
            token: classToken,
            name: name,
            members: bodyMembers,
        };
    }

    // Parses the indented block of a class, containing member vars and methods.
    // Assumes ':' was just consumed. Expects NEWLINE -> INDENT -> members -> DEDENT.
    // Returns list of members or null on error.
    // Leaves currentToken on DEDENT.
    private parseClassBody(): (ast.VariableDeclaration | ast.FunctionDeclaration)[] | null {
         const members: (ast.VariableDeclaration | ast.FunctionDeclaration)[] = [];

         // Expect NEWLINE followed by INDENT
         if (!this.expectPeek(TokenType.NEWLINE)) {
             this.errors.push(`Expected NEWLINE after class ':' to start body, got ${this.peekToken.type}`);
             return null;
         }
         if (!this.expectPeek(TokenType.INDENT)) {
              this.errors.push(`Expected INDENT to start class body, got ${this.peekToken.type}`);
             return null;
         }
         // currentToken is INDENT

        // Parse members until DEDENT
        while (!this.currentTokenIs(TokenType.DEDENT) && !this.currentTokenIs(TokenType.EOF)) {
             // Skip blank lines within the block
             while (this.currentTokenIs(TokenType.NEWLINE)) {
                 this.nextToken();
             }
             // Check again after skipping newlines
             if (this.currentTokenIs(TokenType.DEDENT) || this.currentTokenIs(TokenType.EOF)) {
                 break;
             }

            let member: ast.VariableDeclaration | ast.FunctionDeclaration | null = null;
            switch(this.currentToken.type) {
                case TokenType.LET:
                case TokenType.VAR:
                    // Member variable declaration (requires type annotation)
                    member = this.parseMemberVariableDeclaration();
                    break;
                case TokenType.FUNC:
                     // Method or Initializer declaration
                     const isInit = this.peekTokenIs(TokenType.INIT);
                    member = this.parseFunctionDeclaration(true, isInit); // isMethod=true
                    break;
                default:
                    this.errors.push(`Unexpected token in class body: ${this.currentToken.type}. Expected 'let', 'var', or 'func'. (line ${this.currentToken.line})`);
                    // Attempt recovery: skip token to prevent infinite loop
                     this.nextToken();
                     member = null; // Indicate failure for this line
            }

            if (member) {
                members.push(member);
                 // Member parsing function should leave currentToken on the last token of the member (often NEWLINE)
                 // The loop condition and newline skipping handle moving to the next member.
            } else {
                 // Error occurred parsing member, or unexpected token was skipped.
                 // Ensure progress if we are stuck.
                 if (!this.currentTokenIs(TokenType.NEWLINE) && !this.currentTokenIs(TokenType.DEDENT) && !this.currentTokenIs(TokenType.EOF)) {
                     // This might happen if parseMemberVariableDeclaration or parseFunctionDeclaration returns null without advancing properly.
                     // console.warn(`parseClassBody: Advancing token after null member, current=${this.currentToken.type}`);
                     // this.nextToken(); // Advance cautiously
                 }
            }
        }

        if (!this.currentTokenIs(TokenType.DEDENT)) {
             if (!this.currentTokenIs(TokenType.EOF)) {
                 this.errors.push(`Expected DEDENT to end class body, got ${this.currentToken.type} (line ${this.currentToken.line})`);
                 return null; // Failed to find end of class body
             }
             // EOF is acceptable end if lexer guarantees final DEDENTs
        }
        // currentToken is DEDENT (or EOF). Let the caller handle it.


        return members;
    }

     // Parses: ('let' | 'var') IDENTIFIER ':' Type ('=' Expression)? NEWLINE
     // Assumes currentToken is 'let' or 'var'.
     // Leaves currentToken on the terminating NEWLINE.
     private parseMemberVariableDeclaration(): ast.VariableDeclaration | null {
        const declToken = this.currentToken; // 'let' or 'var'
        const isConstant = this.currentTokenIs(TokenType.LET);

        if (!this.expectPeek(TokenType.IDENTIFIER)) return null;
        // currentToken is IDENTIFIER
        const identifier: ast.Identifier = {
            kind: ast.AstNodeKind.Identifier,
            token: this.currentToken,
            name: this.currentToken.literal,
        };

        // Type annotation is required for members per common style/spec assumption
        if (!this.expectPeek(TokenType.COLON)) {
             this.errors.push(`Expected ':' for type annotation after member variable name '${identifier.name}', got ${this.peekToken.type}`);
            return null;
        }
         // currentToken is ':'
        const typeAnnotation = this.parseTypeAnnotation(); // consumes the type Identifier
        if (!typeAnnotation) return null;
         // currentToken is type IDENTIFIER

        let initializer: ast.Expression | undefined = undefined;
        if (this.peekTokenIs(TokenType.ASSIGN)) {
            this.nextToken(); // Consume type IDENTIFIER
            // currentToken is '='
            this.nextToken(); // Consume '=', advance to expression start
            initializer = this.parseExpression(Precedence.LOWEST);
            if (!initializer) {
                this.errors.push(`Expected expression for member variable initializer (line ${this.currentToken.line})`);
                return null;
            }
            // currentToken is the last token of the initializer expression
        }

        // Require initializer either here or in 'init' - This is a semantic check, parser accepts optional initializer syntactically.

        // Expect a NEWLINE to terminate the member declaration
        if (!this.expectPeek(TokenType.NEWLINE)) {
             if (!this.currentTokenIs(TokenType.EOF) && !this.currentTokenIs(TokenType.DEDENT)) { // DEDENT might follow if last member
                 this.errors.push(`Expected NEWLINE after member variable declaration, got ${this.currentToken.type} (line ${this.currentToken.line})`);
                 // Continue parsing, but record error
             }
        }
        // If expectPeek succeeded, currentToken is NEWLINE.

        return {
            kind: ast.AstNodeKind.VariableDeclaration,
            token: declToken,
            isConstant: isConstant,
            identifier: identifier,
            typeAnnotation: typeAnnotation, // Type annotation is required syntactically here
            initializer: initializer, // Initializer is optional syntactically
        };
    }

     // if condition : Block (elif condition : Block)* (else : Block)?
     private parseIfStatement(): ast.IfStatement | null {
        const ifToken = this.currentToken; // 'if' token
        this.nextToken(); // Consume 'if', advance to condition start

        const condition = this.parseExpression(Precedence.LOWEST);
        if (!condition) {
            this.errors.push(`Expected condition expression after 'if'`);
            return null;
        }
        // currentToken is last token of condition

         if (!this.expectPeek(TokenType.COLON)) return null;
         // currentToken is ':'

        const consequence = this.parseBlockStatement(); // Parses block, stops before DEDENT
        if (!consequence) {
            this.errors.push(`Expected block for 'if' consequence`);
            return null;
        }
         // currentToken is DEDENT

        const alternatives: { condition: ast.Expression; consequence: ast.BlockStatement }[] = [];
        let alternative: ast.BlockStatement | undefined = undefined;

        // Check for 'elif' branches
        // Need to advance past DEDENT first
        this.nextToken(); // Consume DEDENT

        while (this.currentTokenIs(TokenType.ELIF)) {
            // const elifToken = this.currentToken;
            this.nextToken(); // Consume 'elif', advance to condition start

            const elifCondition = this.parseExpression(Precedence.LOWEST);
            if (!elifCondition) {
                this.errors.push(`Expected condition expression after 'elif'`);
                return null; // Or attempt recovery?
            }
             // currentToken is last token of condition

             if (!this.expectPeek(TokenType.COLON)) return null;
             // currentToken is ':'

            const elifConsequence = this.parseBlockStatement(); // Parses block, stops before DEDENT
            if (!elifConsequence) {
                this.errors.push(`Expected block for 'elif' consequence`);
                return null; // Or attempt recovery?
            }
            // currentToken is DEDENT
            alternatives.push({ condition: elifCondition, consequence: elifConsequence });

            this.nextToken(); // Consume DEDENT to check for next elif/else/statement
        }

        // Check for 'else' branch (after handling all elifs)
        if (this.currentTokenIs(TokenType.ELSE)) {
            this.nextToken(); // Consume 'else'
             if (!this.expectPeek(TokenType.COLON)) return null;
             // currentToken is ':'

            const elseBlock = this.parseBlockStatement(); // Parses block, stops before DEDENT
            if (!elseBlock) {
                this.errors.push(`Expected block for 'else' alternative`);
                return null;
            }
             alternative = elseBlock;
             // currentToken is DEDENT
             // Consume the final DEDENT from the else block? The main loop will handle it.
             // No, the 'if' statement as a whole is finished. The main loop expects us to be positioned *after* the 'if'.
             // Let's check if parseBlockStatement consumed DEDENT. No, it stops *before* it.
             // So, currentToken IS DEDENT here. Let the main program loop handle it.
        }

        // If we finished on an 'if' or 'elif' block, currentToken is DEDENT.
        // If there was no 'else', currentToken is whatever followed the last DEDENT (next statement or EOF).
        // If there *was* an 'else', currentToken is the DEDENT from that block.

        return {
            kind: ast.AstNodeKind.IfStatement,
            token: ifToken,
            condition: condition,
            consequence: consequence,
            alternatives: alternatives,
            alternative: alternative,
        };
    }

    // while condition : Block
    private parseWhileStatement(): ast.WhileStatement | null {
        const whileToken = this.currentToken; // 'while' token
        this.nextToken(); // Consume 'while', advance to condition start

        const condition = this.parseExpression(Precedence.LOWEST);
        if (!condition) {
            this.errors.push(`Expected condition expression after 'while'`);
            return null;
        }
        // currentToken is last token of condition

         if (!this.expectPeek(TokenType.COLON)) return null;
         // currentToken is ':'

        const body = this.parseBlockStatement(); // Parses block, stops before DEDENT
        if (!body) {
            this.errors.push(`Expected block for 'while' loop body`);
            return null;
        }
        // currentToken is DEDENT (or EOF)

        return {
            kind: ast.AstNodeKind.WhileStatement,
            token: whileToken,
            condition: condition,
            body: body,
        };
    }

    // for IDENTIFIER in Expression : Block
    private parseForStatement(): ast.ForStatement | null {
        const forToken = this.currentToken; // 'for' token

        if (!this.expectPeek(TokenType.IDENTIFIER)) {
             this.errors.push(`Expected identifier after 'for', got ${this.peekToken.type}`);
             return null;
         }
         // currentToken is IDENTIFIER

        const variable: ast.Identifier = {
            kind: ast.AstNodeKind.Identifier,
            token: this.currentToken,
            name: this.currentToken.literal,
        };

        if (!this.expectPeek(TokenType.IN)) {
            this.errors.push(`Expected 'in' keyword after loop variable in 'for' loop, got ${this.peekToken.type}`);
            return null;
        }
        // currentToken is 'in'

        this.nextToken(); // Consume 'in', advance to iterable expression start
        const iterable = this.parseExpression(Precedence.LOWEST);
        if (!iterable) {
            this.errors.push(`Expected iterable expression after 'in' in 'for' loop`);
            return null;
        }
        // currentToken is last token of iterable expression

         if (!this.expectPeek(TokenType.COLON)) return null;
        // currentToken is ':'

        const body = this.parseBlockStatement(); // Parses block, stops before DEDENT
        if (!body) {
            this.errors.push(`Expected block for 'for' loop body`);
            return null;
        }
        // currentToken is DEDENT (or EOF)

        return {
            kind: ast.AstNodeKind.ForStatement,
            token: forToken,
            variable: variable,
            iterable: iterable,
            body: body,
        };
    }
} // End class Parser

// --- Example Usage ---
function testParser() {
    console.log("Testing parser...");
    const source = `
let greeting = "Hello"
var count = 0
let pi: Float = 3.14159

func add(a: Int, b: Int) -> Int:
    return a + b

class Counter:
    var value: Int = 0 # Required type

    func init(start: Int):
        self.value = start

    func increment(by: Int = 1):
        self.value = self.value + by # Check self usage

    func get() -> Int:
        self.value # Implicit return? AST captures the expression

let counter = Counter(start: 10) # Instance creation
counter.increment()
counter.increment(by: 5)

if counter.get() > 15:
    print("Large")
elif counter.get() == 15:
    print("Exactly 15!")
else:
    let result = add(counter.get(), 2)
    print("Small: (result)") # String interpolation - AST has raw string

while count < 3:
    print("Count: (count)")
    count = count + 1

let names = ["A", "B", "C"]
for name in names:
    print(name)

let dict = {"a": 1, "b": 2}
print(dict["a"]) # Subscript access

# Final statement EOF test
print("Done")
`;

    const lexer = new Lexer(source);
    const parser = new Parser(lexer);
    console.log("Lexer Parser initialized.");
    const program = parser.parseProgram();

    const errors = parser.getErrors();
    if (errors.length > 0) {
        console.log("Parser encountered errors:");
        errors.forEach(err => console.error(err));
    } else {
        console.log("Parsing successful!");
        // Pretty print the AST (can be large)
        console.log(JSON.stringify(program, null, 2));
    }
}

// Run the test
 testParser();

// Export Parser and AST types if used as a module
//export { Parser, ast };