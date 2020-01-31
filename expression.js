'use strict';

//  BNF grammar for the expression parser:
//
//      expr ::= mulexpr { addop mulexpr }
//   1  addop ::= "+" | "-"
//      mulexpr ::= powexpr { mulop powexpr }
//   2  mulop ::= "*" | "/"
//   3  powexpr ::= "-" powexpr | "+" powexpr | atom [ "^" powexpr ]
//   4  atom ::= ident [ "(" expr ")" ] | numeric | "(" expr ")"
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

        PrettyMath() {
            throw {
                name: 'InternalError',
                message: 'Do not know how to convert expression to TeX.',
                token: this.optoken
            };
        }

        PrettyMath_Binary_LeftAssoc(opsymbol) {
            let left = this.arglist[0].PrettyMath();
            let right = this.arglist[1].PrettyMath();

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

            return left + (opsymbol || this.optoken.text) + right;
        }

        PrettyMath_Binary_RightAssoc() {
            // Similar to left associative, only we use
            // parentheses when the left child expression
            // has equal precedence, not the right.

            let left = this.arglist[0].PrettyMath();
            let right = this.arglist[1].PrettyMath();

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

        PrettyMath_SingleArg() {
            if (this.arglist.length !== 1) {
                throw {
                    name: 'FormatError',
                    message: `The function "${this.optoken.text}" requires exactly one argument.`,
                    token: this.optoken
                };
            }
            return this.arglist[0].PrettyMath();
        }
    }

    class Expression_Add extends Expression {
        constructor(optoken, left, right) {
            super(1, optoken, [left, right]);
        }

        PrettyMath() {
            return this.PrettyMath_Binary_LeftAssoc();
        }
    }

    class Expression_Subtract extends Expression {
        constructor(optoken, left, right) {
            super(1, optoken, [left, right]);
        }

        PrettyMath() {
            return this.PrettyMath_Binary_LeftAssoc();
        }
    }

    class Expression_Multiply extends Expression {
        constructor(optoken, left, right) {
            super(2, optoken, [left, right]);
        }

        PrettyMath() {
            return this.PrettyMath_Binary_LeftAssoc(' ');
        }
    }

    class Expression_Divide extends Expression {
        constructor(optoken, left, right) {
            super(2, optoken, [left, right]);
        }

        PrettyMath() {
            // Use fraction notation. Operator precedence is irrelevant.
            return '\\frac{' + this.arglist[0].PrettyMath() + '}{' + this.arglist[1].PrettyMath() + '}';
        }
    }

    class Expression_Power extends Expression {
        constructor(optoken, left, right) {
            super(4, optoken, [left, right]);
        }

        PrettyMath() {
            return this.PrettyMath_Binary_RightAssoc();
        }
    }

    class Expression_Negative extends Expression {
        constructor(optoken, arg) {
            super(3, optoken, [arg]);
        }

        PrettyMath() {
            // Unary prefix operator.
            let argtext = this.arglist[0].PrettyMath();
            if (this.arglist[0].precedence < this.precedence) {
                return '-\\left(' + argtext + '\\right)';
            }
            return '-' + argtext;
        }
    }

    const GreekLetters = {
        'alpha':true, 'beta':true, 'gamma':true, 'delta':true,
        'epsilon':true, 'zeta':true, 'eta':true, 'theta':true,
        'iota':true, 'kappa':true, 'lambda':true, 'mu':true,
        'nu':true, 'xi':true, 'omicron':true, 'pi':true,
        'rho':true, 'sigma':true, 'tau':true, 'upsilon':true,
        'phi':true, 'chi':true, 'psi':true, 'omega':true,
        'Alpha':true, 'Beta':true, 'Gamma':true, 'Delta':true,
        'Epsilon':true, 'Zeta':true, 'Eta':true, 'Theta':true,
        'Iota':true, 'Kappa':true, 'Lambda':true, 'Mu':true,
        'Nu':true, 'Xi':true, 'Omicron':true, 'Pi':true,
        'Rho':true, 'Sigma':true, 'Tau':true, 'Upsilon':true,
        'Phi':true, 'Chi':true, 'Psi':true, 'Omega':true
    };

    class Expression_Identifier extends Expression {
        constructor(token) {
            super(9, token, []);
        }

        PrettyMath() {
            // Any identifier that is a single Latin letter is already valid TeX.
            if (/^[a-zA-Z]$/.test(this.optoken.text))
                return this.optoken.text;

            // Multi-character identifiers must be a lowercase Greek
            // letter (e.g. alpha) or an uppercase Greek letter (e.g. Alpha).
            // In that case, the TeX string is \alpha or \Alpha.
            if (GreekLetters[this.optoken.text])
                return '\\' + this.optoken.text;

            // Anything other than Latin or Greek letters is an error.
            throw {
                name: 'FormatError',
                message: `The identifier ${this.optoken.text} is not valid. Must be a Latin letter or the name of a Greek letter.`,
                token: this.optoken
            };
        }
    }

    class Expression_Number extends Expression {
        constructor(token) {
            super(9, token, []);
        }

        PrettyMath() {
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

        PrettyMath() {
            switch (this.optoken.text) {
                case 'sqrt':
                    return '\\sqrt{' + this.PrettyMath_SingleArg() + '}';

                case 'abs':
                    return '\\left|' + this.PrettyMath_SingleArg() + '\\right|';

                case 'cos':
                case 'sin':
                    return '\\' + this.optoken.text + '\\left(' + this.PrettyMath_SingleArg() + '\\right)';

                default:
                    throw {
                        name: 'FormatError',
                        message: 'Unknown function "' + this.optoken.text + '"',
                        token: this.optoken
                    };
            }
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
            if (this.nextTokenIndex < this.tokenList.length) {
                throw {
                    name: 'SyntaxError',
                    message: 'Syntax error',
                    token: this.tokenList[this.nextTokenIndex]
                };
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
            // atom ::= ident [ "(" expr ")" ] | numeric | "(" expr ")"
            const token = this.GetNextToken();
            if (token.kind === 'identifier') {
                if (this.NextTokenIs(['('])) {
                    const arglist = [ this.ParseExpr() ];
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
                name: 'SyntaxError',
                message: 'Expected identifier, number, function, or parenthesized expression.',
                token: token
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
            throw {
                name: 'SyntaxError',
                message: 'Unexpected end of expression',
                token: null
            };
        }

        NextTokenIs(validOptionList) {
            if (this.nextTokenIndex < this.tokenList.length) {
                const text = this.tokenList[this.nextTokenIndex].text;
                if (validOptionList.indexOf(text) >= 0) {
                    return this.tokenList[this.nextTokenIndex++];
                }
            }
            return null;
        }

        ExpectToken(text) {
            const token = this.PeekNextToken();
            if (token === null || token.text !== text) {
                throw {
                    name: 'SyntaxError',
                    message: 'Expected "' + text + '"',
                    token: token
                };
            }
            return this.tokenList[this.nextTokenIndex++];
        }
    }

    const textInput = document.getElementById('ExpressionText');
    const parseButton = document.getElementById('ParseButton');
    const errorBox = document.getElementById('ParseError');
    const prettyPrintBox = document.getElementById('PrettyPrint');
    parseButton.addEventListener('click', function(){
        errorBox.innerText = '';
        prettyPrintBox.innerText = '';

        let pretty = null;
        const parser = new Parser(textInput.value);
        try {
            const expr = parser.Parse();
            pretty = expr.PrettyMath();
        } catch (ex) {
            if (ex.message) {
                errorBox.innerText = ex.message;
            } else {
                errorBox.innerText = 'UNKNOWN ERROR';
            }

            // Set focus on the text input box.
            textInput.focus();

            if (ex.token) {
                // The error is associated with a particular token.
                // Mark the token by selecting it in the edit box.
                textInput.setSelectionRange(ex.token.index, ex.token.index + ex.token.text.length);
            } else {
                // We aren't sure where the error is.
                // Put the cursor at the end of the expression, without marking anything.
                textInput.setSelectionRange(textInput.value.length, textInput.value.length);
            }
        }

        if (pretty) {
            prettyPrintBox.innerText = '$$' + pretty + '$$';
            // See: http://docs.mathjax.org/en/stable/typeset.html
            MathJax.Hub.Queue(['Typeset', MathJax.Hub, prettyPrintBox]);
        }
    });
}
