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
        constructor(precedence, optoken, arglist) {
            this.precedence = precedence;
            this.optoken = optoken;
            this.arglist = arglist;
        }

        Latex() {
            throw {name:'InternalError', message:'Do not know how to convert expression to Latex.'};
        }

        Latex_Binary_LeftAssoc() {
            let left = this.arglist[0].Latex();
            let right = this.arglist[1].Latex();

            // Use parentheses around the left child expression
            // if its operator precedence is less than this node's precedence.
            // If it is equal, assume left-associativity means parentheses are not needed.
            if (this.arglist[0].precedence < this.precedence) {
                left = '\\left(' + left + '\\right)';
            }

            // Use parentheses around the right child expression
            // if operator precedence is lower or equal.
            // Even if equal, parentheses are needed because we are
            // overriding left-associativity.
            if (this.arglist[1].precedence <= this.precedence) {
                right = '\\left(' + right + '\\right)';
            }

            return left + this.optoken.text + right;
        }

        Latex_Binary_RightAssoc() {
            // Similar to left associative, only we use
            // parentheses when the left child expression
            // has equal precedence, not the right.

            let left = this.arglist[0].Latex();
            let right = this.arglist[1].Latex();

            if (this.arglist[0].precedence <= this.precedence) {
                left = '\\left(' + left + '\\right)';
            }

            if (this.arglist[1].precedence < this.precedence) {
                right = '\\left(' + right + '\\right)';
            } else {
                right = '{' + right + '}';  // for exponentiation
            }

            return left + this.optoken.text + right;
        }
    }

    class Expression_Add extends Expression {
        constructor(optoken, left, right) {
            super(1, optoken, [left, right]);
        }

        Latex() {
            return this.Latex_Binary_LeftAssoc();
        }
    }

    class Expression_Subtract extends Expression {
        constructor(optoken, left, right) {
            super(1, optoken, [left, right]);
        }

        Latex() {
            return this.Latex_Binary_LeftAssoc();
        }
    }

    class Expression_Multiply extends Expression {
        constructor(optoken, left, right) {
            super(2, optoken, [left, right]);
        }

        Latex() {
            return this.Latex_Binary_LeftAssoc();
        }
    }

    class Expression_Divide extends Expression {
        constructor(optoken, left, right) {
            super(2, optoken, [left, right]);
        }

        Latex() {
            // Use fraction notation. Operator precedence is irrelevant.
            return '\\frac{' + this.arglist[0].Latex() + '}{' + this.arglist[1].Latex() + '}';
        }
    }

    class Expression_Power extends Expression {
        constructor(optoken, left, right) {
            super(4, optoken, [left, right]);
        }

        Latex() {
            return this.Latex_Binary_RightAssoc();
        }
    }

    class Expression_Negative extends Expression {
        constructor(optoken, arg) {
            super(3, optoken, [arg]);
        }

        Latex() {
            // Unary prefix operator.
            let argtext = this.arglist[0].Latex();
            if (this.arglist[0].precedence < this.precedence) {
                return '-\\left(' + argtext + '\\right)';
            }
            return '-' + argtext;
        }
    }

    class Expression_Identifier extends Expression {
        constructor(token) {
            super(9, token, []);
        }

        Latex() {
            return this.optoken.text;
        }
    }

    class Expression_Number extends Expression {
        constructor(token) {
            super(9, token, []);
        }

        Latex() {
            const m = this.optoken.text.match(/^([^eE]+)[eE](.*)$/);
            if (m) {
                // Convert scientific notation:  1.23e-4 ==> 1.23 \times 10^{-4}
                return m[1] + ' \\times 10^{' + m[2] + '}';
            }
            return this.optoken.text;
        }
    }

    class Expression_Function extends Expression {
        constructor(token, arglist) {
            super(9, token, arglist);
        }

        Latex() {
            return '\\' + this.optoken.text + '\\left(' + this.arglist.map(child => child.Latex()).join(', ') + '\\right)';
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
                const right = this.ParsePowExpr();
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
        console.log(expr.Latex());
    });
}
