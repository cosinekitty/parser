'use strict';

//  BNF grammar for the expression parser:
//
//      expr ::= mulexpr { addop mulexpr }
//   1  addop ::= "+" | "-"
//      mulexpr ::= powexpr { mulop powexpr }
//   2  mulop ::= "*" | "/"
//   3  powexpr ::= "-" powexpr | "+" powexpr | atom [ "^" powexpr ]
//   4  atom ::= ident [ "(" arglist ")" ] | numeric | "(" expr ")"
//      arglist ::= expr { "," expr }
//   5  numeric ::= /[0-9]+(\.[0-9]*)?([eE][\+\-]?[0-9]+)?/
//   5  ident ::= /[A-Za-z_][A-Za-z_0-9]*/


window.onload = function() {
    class Token {
        constructor(text, index) {
            this.text = text;
            this.index = index;

            // Classify the token.
            if (/^[A-Za-z_]/.test(text)) {
                this.kind = 'identifier';
            } else if (/^[0-9]/.test(text)) {
                this.kind = 'number';
            } else {
                this.kind = 'operator';
            }
        }
    }

    class Expression {
        constructor(optoken, arglist) {
            this.optoken = optoken;
            this.arglist = arglist;
        }
    }

    class Expression_Add extends Expression {
        constructor(optoken, left, right) {
            super(optoken, [left, right]);
        }
    }

    class Expression_Subtract extends Expression {
        constructor(optoken, left, right) {
            super(optoken, [left, right]);
        }
    }

    class Expression_Multiply extends Expression {
        constructor(optoken, left, right) {
            super(optoken, [left, right]);
        }
    }

    class Expression_Divide extends Expression {
        constructor(optoken, left, right) {
            super(optoken, [left, right]);
        }
    }

    class Expression_Power extends Expression {
        constructor(optoken, left, right) {
            super(optoken, [left, right]);
        }
    }

    class Expression_Negative extends Expression {
        constructor(optoken, arg) {
            super(optoken, [arg]);
        }
    }

    class Expression_Identifier extends Expression {
        constructor(token) {
            super(token, []);
        }
    }

    class Expression_Number extends Expression {
        constructor(token) {
            super(token, []);
        }
    }

    class Expression_Function extends Expression {
        constructor(token, arglist) {
            super(token, arglist);
        }
    }

    class Parser {
        constructor(text) {
            this.nextTokenIndex = 0;
            this.tokenList = [];
            const reToken = /[0-9]+(\.[0-9]*)?([eE][\+\-]?[0-9]+)?|[A-Za-z_][A-Za-z_0-9]*|\S/g;
            for(;;) {
                const match = reToken.exec(text);
                if (match === null) {
                    break;
                }
                this.tokenList.push(new Token(match[0], match.index));
            }
        }

        Parse() {
            const expr = this.ParseExpr();
            if (this.nextTokenIndex !== this.tokenList.length) {
                throw {name:'SyntaxError', message:'Syntax error'};
            }
            return expr;
        }

        ParseExpr() {
            // expr ::= mulexpr { addop mulexpr }
            let expr = this.ParseMulExpr();
            let optoken;
            while (optoken = this.NextTokenIs(['+', '-'])) {
                const right = this.ParseMulExpr();
                if (optoken.text === '+') {
                    expr = new Expression_Add(optoken, expr, right);
                } else {
                    expr = new Expression_Subtract(optoken, expr, right);
                }
            }
            return expr;
        }

        ParseMulExpr() {
            // mulexpr ::= powexpr { mulop powexpr }
            let expr = this.ParsePowExpr();
            let optoken;
            while (optoken = this.NextTokenIs(['*', '/'])) {
                const right = ParsePowExpr();
                if (optoken.text === '*') {
                    expr = new Expression_Multiply(optoken, expr, right);
                } else {
                    expr = new Expression_Divide(optoken, expr, right);
                }
            }
            return expr;
        }

        ParsePowExpr() {
            // powexpr ::= "-" powexpr | "+" powexpr | atom [ "^" powexpr ]

            // Eliminate any leading unary '+' operators, because they don't do anything.
            while (this.NextTokenIs(['+'])) {
                // do nothing
            }

            let optoken;
            if (optoken = this.NextTokenIs(['-'])) {
                const optoken = this.GetNextToken();
                const arg = this.ParsePowExpr();
                return new Expression_Negative(optoken, arg);
            }

            let expr = this.ParseAtom();
            if (optoken = this.NextTokenIs(['^'])) {
                const right = this.ParsePowExpr();      // use recursion for right-associative ^ operator
                return new Expression_Power(optoken, expr, right);
            }

            return expr;
        }

        ParseAtom() {
            // atom ::= ident [ "(" arglist ")" ] | numeric | "(" expr ")"
            const token = this.GetNextToken();
            if (token.kind === 'identifier') {
                if (this.NextTokenIs(['('])) {
                    // arglist ::= expr { "," expr }
                    const arglist = [];
                    arglist.push(this.ParseExpr());
                    while (this.NextTokenIs([','])) {
                        arglist.push(this.ParseExpr());
                    }
                    this.ExpectToken(')');
                    return new Expression_Function(token, arglist);
                }
                return new Expression_Identifier(token);
            }

            if (token.kind === 'number') {
                return new Expression_Number(token);
            }

            if (token.text === '(') {
                const expr = this.ParseExpr();
                this.ExpectToken(')');
                return expr;
            }

            throw {
                name:'SyntaxError',
                message:'Expected identifier, number, function, or parenthesized expression.'
            };
        }

        PeekNextToken() {
            if (this.nextTokenIndex < this.tokenList.length) {
                return this.tokenList[this.nextTokenIndex];
            }
            return null;
        }

        GetNextToken() {
            if (this.nextTokenIndex < this.tokenList.length) {
                return this.tokenList[this.nextTokenIndex++];
            }
            throw {name:'SyntaxError', message:'Unexpected end of expression'};
        }

        NextTokenIs(list) {
            if (this.nextTokenIndex < this.tokenList.length) {
                const text = this.tokenList[this.nextTokenIndex].text;
                if (list.indexOf(text) >= 0) {
                    return this.tokenList[this.nextTokenIndex++];
                }
            }
            return null;
        }

        ExpectToken(text) {
            const token = this.PeekNextToken();
            if (token === null || token.text !== text) {
                throw {name:'SyntaxError', message:'Expected "' + text + '"'};
            }
            return this.tokenList[this.nextTokenIndex++];
        }
    }

    const textInput = document.getElementById('ExpressionText');
    const processButton = this.document.getElementById('ProcessButton');
    processButton.addEventListener('click', function(){
        const parser = new Parser(textInput.value);
        const expr = parser.Parse();
        console.log(expr);
    });
}
