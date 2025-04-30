// Harmony Programming Language Lexer
// Implementation in TypeScript based on the provided language specification

// Token types enum
enum TokenType {
    // Keywords
    LET = 'LET',
    VAR = 'VAR',
    FUNC = 'FUNC',
    CLASS = 'CLASS',
    INIT = 'INIT',
    SELF = 'SELF',
    IF = 'IF',
    ELIF = 'ELIF',
    ELSE = 'ELSE',
    WHILE = 'WHILE',
    FOR = 'FOR',
    IN = 'IN',
    RETURN = 'RETURN',
    TRUE = 'TRUE',
    FALSE = 'FALSE',
    AND = 'AND',
    OR = 'OR',
    NOT = 'NOT',
    
    // Literals
    INTEGER = 'INTEGER',
    FLOAT = 'FLOAT',
    STRING = 'STRING',
    
    // Identifiers
    IDENTIFIER = 'IDENTIFIER',
    
    // Operators
    PLUS = 'PLUS',             // +
    MINUS = 'MINUS',           // -
    MULTIPLY = 'MULTIPLY',     // *
    DIVIDE = 'DIVIDE',         // /
    ASSIGN = 'ASSIGN',         // =
    EQUAL = 'EQUAL',           // ==
    NOT_EQUAL = 'NOT_EQUAL',   // !=
    LESS = 'LESS',             // <
    GREATER = 'GREATER',       // >
    LESS_EQUAL = 'LESS_EQUAL', // <=
    GREATER_EQUAL = 'GREATER_EQUAL', // >=
    
    // Delimiters
    DOT = 'DOT',               // .
    COMMA = 'COMMA',           // ,
    COLON = 'COLON',           // :
    ARROW = 'ARROW',           // ->
    LEFT_PAREN = 'LEFT_PAREN', // (
    RIGHT_PAREN = 'RIGHT_PAREN', // )
    LEFT_BRACKET = 'LEFT_BRACKET', // [
    RIGHT_BRACKET = 'RIGHT_BRACKET', // ]
    LEFT_BRACE = 'LEFT_BRACE', // {
    RIGHT_BRACE = 'RIGHT_BRACE', // }
    
    // Whitespace handling
    NEWLINE = 'NEWLINE',
    INDENT = 'INDENT',
    DEDENT = 'DEDENT',
    
    // Misc
    COMMENT = 'COMMENT',
    EOF = 'EOF',
    ILLEGAL = 'ILLEGAL'
  }
  
  // Token class
  class Token {
    type: TokenType;
    literal: string;
    line: number;
    column: number;
    
    constructor(type: TokenType, literal: string, line: number, column: number) {
      this.type = type;
      this.literal = literal;
      this.line = line;
      this.column = column;
    }
    
    toString(): string {
      return `Token(${this.type}, '${this.literal}', line: ${this.line}, col: ${this.column})`;
    }
  }
  
  // Lexer class
  class Lexer {
    private input: string;
    private position: number = 0;      // Current position in input (points to current char)
    private readPosition: number = 0;  // Current reading position (after current char)
    private ch: string = '';           // Current character under examination
    private line: number = 1;          // Current line number
    private column: number = 0;        // Current column number
    private indentStack: number[] = [0]; // Stack to track indentation levels
    private tokens: Token[] = [];      // Generated tokens
    private pendingTokens: Token[] = []; // Tokens waiting to be returned (for indentation handling)
    
    private keywords: Map<string, TokenType> = new Map([
      ['let', TokenType.LET],
      ['var', TokenType.VAR],
      ['func', TokenType.FUNC],
      ['class', TokenType.CLASS],
      ['init', TokenType.INIT],
      ['self', TokenType.SELF],
      ['if', TokenType.IF],
      ['elif', TokenType.ELIF],
      ['else', TokenType.ELSE],
      ['while', TokenType.WHILE],
      ['for', TokenType.FOR],
      ['in', TokenType.IN],
      ['return', TokenType.RETURN],
      ['true', TokenType.TRUE],
      ['false', TokenType.FALSE],
      ['and', TokenType.AND],
      ['or', TokenType.OR],
      ['not', TokenType.NOT]
    ]);
    
    constructor(input: string) {
      this.input = input;
      this.readChar(); // Initialize by reading the first character
    }
    
    // Get all tokens from the input
    tokenize(): Token[] {
      while (!this.isAtEnd()) {
        const token = this.nextToken();
        this.tokens.push(token);
        
        if (token.type === TokenType.EOF) {
          break;
        }
      }
      return this.tokens;
    }
    
    // Read the next character
    private readChar(): void {
      if (this.readPosition >= this.input.length) {
        this.ch = '';  // EOF
      } else {
        this.ch = this.input[this.readPosition];
      }
      
      this.position = this.readPosition;
      this.readPosition += 1;
      this.column += 1;
    }
    
    // Peek at the next character without advancing
    private peekChar(): string {
      if (this.readPosition >= this.input.length) {
        return '';
      } else {
        return this.input[this.readPosition];
      }
    }
    
    // Check if we've reached the end of input
    private isAtEnd(): boolean {
      return this.position >= this.input.length;
    }
    
    // Get the next token
    nextToken(): Token {
      // If we have pending tokens (from indentation handling), return those first
      if (this.pendingTokens.length > 0) {
        return this.pendingTokens.shift()!;
      }
      
      this.skipWhitespace();
      
      // After handling whitespace, we may have pending tokens
      if (this.pendingTokens.length > 0) {
        return this.pendingTokens.shift()!;
      }
      
      // If we're at EOF, generate any needed dedents
      if (this.ch === '' && this.indentStack.length > 1) {
        while (this.indentStack.length > 1) {
          this.indentStack.pop();
          const dedent = new Token(TokenType.DEDENT, '', this.line, this.column);
          this.pendingTokens.push(dedent);
        }
        // Add EOF after all dedents
        this.pendingTokens.push(new Token(TokenType.EOF, '', this.line, this.column));
        return this.pendingTokens.shift()!;
      }
      
      let token: Token;
      
      switch (this.ch) {
        case '=':
          if (this.peekChar() === '=') {
            const ch = this.ch;
            this.readChar();
            const literal = ch + this.ch;
            token = new Token(TokenType.EQUAL, literal, this.line, this.column - 1);
          } else {
            token = new Token(TokenType.ASSIGN, this.ch, this.line, this.column);
          }
          break;
        case '+':
          token = new Token(TokenType.PLUS, this.ch, this.line, this.column);
          break;
        case '-':
          if (this.peekChar() === '>') {
            const ch = this.ch;
            this.readChar();
            const literal = ch + this.ch;
            token = new Token(TokenType.ARROW, literal, this.line, this.column - 1);
          } else {
            token = new Token(TokenType.MINUS, this.ch, this.line, this.column);
          }
          break;
        case '*':
          token = new Token(TokenType.MULTIPLY, this.ch, this.line, this.column);
          break;
        case '/':
          token = new Token(TokenType.DIVIDE, this.ch, this.line, this.column);
          break;
        case '!':
          if (this.peekChar() === '=') {
            const ch = this.ch;
            this.readChar();
            const literal = ch + this.ch;
            token = new Token(TokenType.NOT_EQUAL, literal, this.line, this.column - 1);
          } else {
            token = new Token(TokenType.ILLEGAL, this.ch, this.line, this.column);
          }
          break;
        case '<':
          if (this.peekChar() === '=') {
            const ch = this.ch;
            this.readChar();
            const literal = ch + this.ch;
            token = new Token(TokenType.LESS_EQUAL, literal, this.line, this.column - 1);
          } else {
            token = new Token(TokenType.LESS, this.ch, this.line, this.column);
          }
          break;
        case '>':
          if (this.peekChar() === '=') {
            const ch = this.ch;
            this.readChar();
            const literal = ch + this.ch;
            token = new Token(TokenType.GREATER_EQUAL, literal, this.line, this.column - 1);
          } else {
            token = new Token(TokenType.GREATER, this.ch, this.line, this.column);
          }
          break;
        case '.':
          token = new Token(TokenType.DOT, this.ch, this.line, this.column);
          break;
        case ',':
          token = new Token(TokenType.COMMA, this.ch, this.line, this.column);
          break;
        case ':':
          token = new Token(TokenType.COLON, this.ch, this.line, this.column);
          break;
        case '(':
          token = new Token(TokenType.LEFT_PAREN, this.ch, this.line, this.column);
          break;
        case ')':
          token = new Token(TokenType.RIGHT_PAREN, this.ch, this.line, this.column);
          break;
        case '[':
          token = new Token(TokenType.LEFT_BRACKET, this.ch, this.line, this.column);
          break;
        case ']':
          token = new Token(TokenType.RIGHT_BRACKET, this.ch, this.line, this.column);
          break;
        case '{':
          token = new Token(TokenType.LEFT_BRACE, this.ch, this.line, this.column);
          break;
        case '}':
          token = new Token(TokenType.RIGHT_BRACE, this.ch, this.line, this.column);
          break;
        case '#':
          token = this.readComment();
          break;
        case '"':
          token = this.readString();
          break;
        case '':
          token = new Token(TokenType.EOF, '', this.line, this.column);
          break;
        default:
          if (this.isLetter(this.ch)) {
            const identifier = this.readIdentifier();
            const type = this.lookupIdentifier(identifier);
            token = new Token(type, identifier, this.line, this.column - identifier.length);
            return token; // Early return as readIdentifier() already advanced the position
          } else if (this.isDigit(this.ch)) {
            return this.readNumber(); // Early return as readNumber() already advanced the position
          } else {
            token = new Token(TokenType.ILLEGAL, this.ch, this.line, this.column);
          }
      }
      
      this.readChar();
      return token;
    }
    
    // Skip whitespace characters but handle indentation
    private skipWhitespace(): void {
      // Check for indentation at the beginning of a line
      if (this.column === 1) {
        let indent = 0;
        
        // Count spaces/tabs for indentation
        while (this.ch === ' ' || this.ch === '\t') {
          if (this.ch === ' ') {
            indent += 1;
          } else if (this.ch === '\t') {
            // Count each tab as 4 spaces for indentation (or whatever your tab width is)
            indent += 4;
          }
          this.readChar();
        }
        
        // Only process indentation if this is not an empty line or comment line
        if (this.ch !== '\n' && this.ch !== '\r' && this.ch !== '#' && this.ch !== '') {
          const currentIndent = this.indentStack[this.indentStack.length - 1];
          
          if (indent > currentIndent) {
            // Increased indentation
            this.indentStack.push(indent);
            this.pendingTokens.push(new Token(TokenType.INDENT, '', this.line, 0));
          } else if (indent < currentIndent) {
            // Decreased indentation - may need multiple dedents
            while (indent < this.indentStack[this.indentStack.length - 1]) {
              this.indentStack.pop();
              this.pendingTokens.push(new Token(TokenType.DEDENT, '', this.line, 0));
              
              // If we dedented too far, it's an error
              if (indent > this.indentStack[this.indentStack.length - 1]) {
                this.pendingTokens.push(new Token(TokenType.ILLEGAL, 'Invalid indentation', this.line, 0));
                break;
              }
            }
          }
        }
      }
      
      // Skip regular whitespace (not newlines)
      while (this.ch === ' ' || this.ch === '\t' || this.ch === '\r') {
        this.readChar();
      }
      
      // Handle newlines
      if (this.ch === '\n') {
        this.pendingTokens.push(new Token(TokenType.NEWLINE, '\\n', this.line, this.column));
        this.line += 1;
        this.column = 0;
        this.readChar();
      }
    }
    
    // Read an identifier (variable name, function name, etc.)
    private readIdentifier(): string {
      const startPosition = this.position;
      while (this.isLetter(this.ch) || (this.position > startPosition && this.isDigit(this.ch))) {
        this.readChar();
      }
      return this.input.slice(startPosition, this.position);
    }
    
    // Read a number (integer or float)
    private readNumber(): Token {
      const startPosition = this.position;
      const startColumn = this.column;
      let isFloat = false;
      
      // Read digits before decimal point
      while (this.isDigit(this.ch)) {
        this.readChar();
      }
      
      // Check for decimal point
      if (this.ch === '.' && this.isDigit(this.peekChar())) {
        isFloat = true;
        this.readChar(); // consume the '.'
        
        // Read digits after decimal point
        while (this.isDigit(this.ch)) {
          this.readChar();
        }
      }
      
      const number = this.input.slice(startPosition, this.position);
      if (isFloat) {
        return new Token(TokenType.FLOAT, number, this.line, startColumn);
      } else {
        return new Token(TokenType.INTEGER, number, this.line, startColumn);
      }
    }
    
    // Read a string literal
    private readString(): Token {
      const startPosition = this.position + 1; // Skip the opening quote
      const startColumn = this.column;
      let escaped = false;
      
      this.readChar(); // Skip the opening quote
      
      while ((this.ch !== '"' || escaped) && !this.isAtEnd()) {
        // Handle escape sequences
        if (this.ch === '\\' && !escaped) {
          escaped = true;
        } else {
          escaped = false;
        }
        
        // Handle newlines in strings
        if (this.ch === '\n') {
          this.line += 1;
          this.column = 0;
        }
        
        this.readChar();
      }
      
      // Check if string terminated properly
      if (this.ch !== '"') {
        return new Token(TokenType.ILLEGAL, 'Unterminated string', this.line, startColumn);
      }
      
      const str = this.input.slice(startPosition, this.position);
      return new Token(TokenType.STRING, str, this.line, startColumn);
    }
    
    // Read a comment
    private readComment(): Token {
      const startPosition = this.position;
      const startColumn = this.column;
      
      // Read until end of line or end of file
      while (this.ch !== '\n' && this.ch !== '') {
        this.readChar();
      }
      
      const comment = this.input.slice(startPosition, this.position);
      return new Token(TokenType.COMMENT, comment, this.line, startColumn);
    }
    
    // Check if a character is a letter or underscore
    private isLetter(ch: string): boolean {
      return /[a-zA-Z_]/i.test(ch);
    }
    
    // Check if a character is a digit
    private isDigit(ch: string): boolean {
      return /[0-9]/.test(ch);
    }
    
    // Look up if an identifier is a keyword
    private lookupIdentifier(identifier: string): TokenType {
      return this.keywords.get(identifier) || TokenType.IDENTIFIER;
    }
  }
  
  // Example usage
  function testLexer() {
    const source = `
  # Example Harmony program
  let x = 10
  let name: String = "Hello, World!"
  
  func add(a: Int, b: Int) -> Int:
      return a + b
  
  class Counter:
      var count: Int = 0
      
      func init(startValue: Int):
          self.count = startValue
      
      func increment(amount: Int = 1):
          self.count = self.count + amount
          
      func getValue() -> Int:
          return self.count
  
  if x > 5:
      let y = add(5, 10)
      print("y = (y)")
  elif x == 5:
      print("x is 5")
  else:
      print("x is less than 5")
  
  let myCounter = Counter(startValue: 100)
  myCounter.increment()
  myCounter.increment(amount: 5)
  
  for i in [1, 2, 3]:
      print("i = (i)")
  `;
  
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    // Print all tokens
    tokens.forEach(token => {
      console.log(token.toString());
    });
  }
  
  // Run the test
  //testLexer();
  
  // Export the lexer and token types
  export { Lexer, Token, TokenType };