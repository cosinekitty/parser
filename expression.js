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
        }
    }

    class Parser {
        constructor(text) {
            this.index = 0;
            this.tokenList = [];
            const reToken = /[0-9]+(\.[0-9]*)?([eE][\+\-]?[0-9]+)?|[A-Za-z_][A-Za-z_0-9]|\S/g;
            for(;;) {
                const match = reToken.exec(text);
                if (match === null) {
                    break;
                }
                this.tokenList.push(new Token(match[0], match.index));
            }
        }
    }

    const textInput = document.getElementById('ExpressionText');
    const processButton = this.document.getElementById('ProcessButton');
    processButton.addEventListener('click', function(){
        const parser = new Parser(textInput.value);
        console.log(parser.tokenList);
    });
}
