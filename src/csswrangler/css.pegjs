/*
 * CSS parser based on the grammar described at http://www.w3.org/TR/CSS2/grammar.html.
 *
 * The parser builds a tree representing the parsed CSS, composed of basic
 * JavaScript values, arrays and objects (basically JSON). It can be easily
 * used by various CSS processors, transformers, etc.
 *
 * Note that the parser does not handle errors in CSS according to the
 * specification -- many errors which it should recover from (e.g. malformed
 * declarations or unexpected end of stylesheet) are simply fatal. This is a
 * result of straightforward rewrite of the CSS grammar to PEG.js and it should
 * be fixed sometimes.
 */

/* ===== Syntactical Elements ===== */

start
  = stylesheet:stylesheet { return stylesheet; }

stylesheet
  = elements:((CHARSET_SYM STRING ";")? (S / CDO / CDC)*
    (import (CDO S* / CDC S*)*)*
    ((ruleset / media / page) (CDO S* / CDC S*)*)*) {

      return {
        type:    "stylesheet",
        elements: elements
      };
    }

import
  = elements:(IMPORT_SYM S* href:(STRING / URI) S* media:media_list? ";" S*) {
      return {
        type:  "import_rule",
        elements: elements,
        href:  href,
        media: media !== "" ? media : []
      };
    }

media
  = elements:(MEDIA_SYM S* media:media_list "{" S* rules:ruleset* "}" S*) {
      return {
        type:  "media_rule",
        elements: elements,
        media: media,
        rules: rules
      };
    }

media_list
  = head:medium tail:("," S* medium)* {
      var result = [head];
      for (var i = 0; i < tail.length; i++) {
        result.push(tail[i][2]);
      }
      return result;
    }

medium
  = ident:IDENT S* { return ident; }

page
  = elements:(PAGE_SYM S* qualifier:pseudo_page?
    "{" S*
    declarationsHead:declaration?
    declarationsTail:(";" S* declaration?)*
    "}" S*) {
      var declarations = declarationsHead !== "" ? [declarationsHead] : [];
      for (var i = 0; i < declarationsTail.length; i++) {
        if (declarationsTail[i][2] !== "") {
          declarations.push(declarationsTail[i][2]);
        }
      }

      return {
        type:         "page_rule",
        elements:     elements,
        qualifier:    qualifier !== "" ? qualifier : null,
        declarations: declarations
      };
    }

pseudo_page
  = ":" ident:IDENT S* { return ident; }

operator
  = S+
  / "/" S* { return "/"; }
  / "," S* { return ","; }
  / "=" S* { return "="; }
  

combinator
  = "+" S* { return "+"; }
  / ">" S* { return ">"; }

unary_operator
  = "+"
  / "-"

property
  = ident:IDENT other:(S / comment)* {
    return {
        type: 'property',
        elements: [ident, other]
    };
  }
  
whole_selector
 = selector:selector {
    return {
        type: 'whole_selector',
        elements: [selector]
    };
  }

ruleset
  = elements:(  whole_selector
                ("," S* whole_selector)*
                "{" S*
                declaration?
                (";" S* declaration?)*
                "}" S*
            )
    {
      return {
        type:         "ruleset",
        elements:     elements
      };
    }

selector
  = elements:(simple_selector S* combinator selector) {
      return {
        type:       "selector",
        elements:     elements
      };
    }
  / elements:(simple_selector S+ selector) {
      return {
        type:       "selector",
        elements:     elements
      };
    }
  / elements:(simple_selector S*) {
      return {
        type:       "selector",
        elements:     elements
      };
    }

simple_selector
  = element:element_name
    qualifiers:(
        id:HASH { return { type: "ID selector", elements: [id] }; }
      / class
      / attrib
      / pseudo
    )* {
      return {
        type:       "simple_selector",
        elements: [
            {
                type:'element_selector',
                elements:[element]
            },
            qualifiers
        ]
      };
    }
  / qualifiers:(
        id:HASH { return { type: "ID selector", elements: [id] }; }
      / class
      / attrib
      / pseudo
    )+ {
      return {
        type:       "simple_selector",
        elements: qualifiers
      };
    }

class
  = "." class_:IDENT {
        return {
            type: "class_selector",
            elements: ['.', class_]
        };
    }

element_name
  = IDENT / '*'

attrib
  = "[" S*
    attribute:IDENT S*
    operatorAndValue:(
      ('=' / INCLUDES / DASHMATCH) S*
      (IDENT / STRING) S*
    )?
    "]" {
      return {
        type:      "attribute_selector",
        attribute: attribute,
        operator:  operatorAndValue !== "" ? operatorAndValue[0] : null,
        value:     operatorAndValue !== "" ? operatorAndValue[2] : null
      };
    }

pseudo
  = ":"
    value:(
        name:FUNCTION S* params:(IDENT S*)? ")" {
          return {
            type:   "function",
            name:   name,
            params: params !== "" ? [params[0]] : []
          };
        }
      / IDENT
      / ':' IDENT
    ) {
      /*
       * The returned object has somewhat vague property names and values because
       * the rule matches both pseudo-classes and pseudo-elements (they look the
       * same at the syntactic level).
       */
      return {
        type:  "pseudo_selector",
        value: value,
        elements: [':', value]
      };
    }

declaration
  = elements:(property ":" S* expr prio? comment?) {
      return {
        type:       "declaration",
        elements:   elements
      };
    }

prio
  = S* IMPORTANT_SYM S*

expr
  = head:term tail:(operator? term)* {
      return {
          type:     "expression",
          elements: [head, tail]
      };
    }

term
  = 'progid:' space:S* term:term
  / operator:unary_operator?
    value:(
        EMS
      / EXS
      / LENGTH
      / ANGLE
      / TIME
      / FREQ
      / PERCENTAGE
      / NUMBER
    )               { return { type: "term", elements: [operator, value] }; }
  / value:URI    { return { type: "term", elements: [value] }; }
  / func:function { return { type: "term", elements: [func] }; }
  / col:hexcolor { return { type: "term", elements: [col] }; }
  / value:STRING { return { type: "term", elements: [value] }; }
  / value:IDENT { return { type: "term", elements: [value] }; }


function
  = name:FUNCTION space1:S* params:expr? ")" {
      return {
        type:   "term",
        elements: [name, space1, params, ')']
      };
    }

hexcolor
  = value:HASH { return { type: "hexcolor", elements: [value]}; }

/* ===== Lexical Elements ===== */

/* Macros */

h
  = [0-9a-fA-F]

nonascii
  = [\x80-\xFF]

unicode
  = "\\" h1:h h2:h? h3:h? h4:h? h5:h? h6:h? ("\r\n" / [ \t\r\n\f])? {
      return String.fromCharCode(parseInt("0x" + h1 + h2 + h3 + h4 + h5 + h6));
    }

escape
  = unicode
  / "\\" char_:[^\r\n\f0-9a-fA-F] { return char_; }

nmstart
  = [_a-zA-Z]
  / nonascii
  / escape

nmchar
  = [_a-zA-Z0-9-]
  / nonascii
  / escape

integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

float
  = before:[0-9]* "." after:[0-9]+ {
      return parseFloat(before.join("") + "." + after.join(""));
    }

string1
  = '"' chars:([^\n\r\f\\"] / "\\" nl:nl { return nl } / escape)* '"' {
      return '"' + chars.join("") + '"';
    }

string2
  = "'" chars:([^\n\r\f\\'] / "\\" nl:nl { return nl } / escape)* "'" {
      return "'" + chars.join("") + "'";
    }

comment
  = "/*" head:[^*]* middle:"*"+ tail:([^/*] [^*]* "*"+)* "/" {
        var str = head.concat(middle).join("");
        tail.forEach(function (e) {
            str += e[0] + e[1].join("") + e[2].join("");
        });
        str = str.slice(0, str.length - 1);
        
        if ((str[0] === '{') && (str[str.length-1] === '}')) {
            str = str.slice(1, str.length - 1);
            return {
                type: "comment", elements: ['/*{', {
                    type: "commentTag",
                    elements: str
                }, '}*/']
            };
        }
        else
        {
            return {
                type: "comment", elements: '/*' + str + '*/'
            };
        }
    }
    
ident
  = dash:"-"? nmstart:nmstart nmchars:nmchar* {
      return dash + nmstart + nmchars.join("");
    }

name
  = nmchars:nmchar+ { return nmchars.join(""); }

num
  = float
  / integer

string
  = string1
  / string2

url
  = chars:([!#$%&*-~] / nonascii / escape)* { return chars.join(""); }

s
  = [ \t\r\n\f]+

w
  = s?

nl
  = "\n"
  / "\r\n"
  / "\r"
  / "\f"

A
  = [aA]
  / "\\" "0"? "0"? "0"? "0"? "41" ("\r\n" / [ \t\r\n\f])? { return "A"; }
  / "\\" "0"? "0"? "0"? "0"? "61" ("\r\n" / [ \t\r\n\f])? { return "a"; }

C
  = [cC]
  / "\\" "0"? "0"? "0"? "0"? "43" ("\r\n" / [ \t\r\n\f])? { return "C"; }
  / "\\" "0"? "0"? "0"? "0"? "63" ("\r\n" / [ \t\r\n\f])? { return "c"; }

D
  = [dD]
  / "\\" "0"? "0"? "0"? "0"? "44" ("\r\n" / [ \t\r\n\f])? { return "D"; }
  / "\\" "0"? "0"? "0"? "0"? "64" ("\r\n" / [ \t\r\n\f])? { return "d"; }

E
  = [eE]
  / "\\" "0"? "0"? "0"? "0"? "45" ("\r\n" / [ \t\r\n\f])? { return "E"; }
  / "\\" "0"? "0"? "0"? "0"? "65" ("\r\n" / [ \t\r\n\f])? { return "e"; }

G
  = [gG]
  / "\\" "0"? "0"? "0"? "0"? "47" ("\r\n" / [ \t\r\n\f])? { return "G"; }
  / "\\" "0"? "0"? "0"? "0"? "67" ("\r\n" / [ \t\r\n\f])? { return "g"; }
  / "\\" char_:[gG] { return char_; }

H
  = h:[hH]
  / "\\" "0"? "0"? "0"? "0"? "48" ("\r\n" / [ \t\r\n\f])? { return "H"; }
  / "\\" "0"? "0"? "0"? "0"? "68" ("\r\n" / [ \t\r\n\f])? { return "h"; }
  / "\\" char_:[hH] { return char_; }

I
  = i:[iI]
  / "\\" "0"? "0"? "0"? "0"? "49" ("\r\n" / [ \t\r\n\f])? { return "I"; }
  / "\\" "0"? "0"? "0"? "0"? "69" ("\r\n" / [ \t\r\n\f])? { return "i"; }
  / "\\" char_:[iI] { return char_; }

K
  = [kK]
  / "\\" "0"? "0"? "0"? "0"? "4" [bB] ("\r\n" / [ \t\r\n\f])? { return "K"; }
  / "\\" "0"? "0"? "0"? "0"? "6" [bB] ("\r\n" / [ \t\r\n\f])? { return "k"; }
  / "\\" char_:[kK] { return char_; }

L
  = [lL]
  / "\\" "0"? "0"? "0"? "0"? "4" [cC] ("\r\n" / [ \t\r\n\f])? { return "L"; }
  / "\\" "0"? "0"? "0"? "0"? "6" [cC] ("\r\n" / [ \t\r\n\f])? { return "l"; }
  / "\\" char_:[lL] { return char_; }

M
  = [mM]
  / "\\" "0"? "0"? "0"? "0"? "4" [dD] ("\r\n" / [ \t\r\n\f])? { return "M"; }
  / "\\" "0"? "0"? "0"? "0"? "6" [dD] ("\r\n" / [ \t\r\n\f])? { return "m"; }
  / "\\" char_:[mM] { return char_; }

N
  = [nN]
  / "\\" "0"? "0"? "0"? "0"? "4" [eE] ("\r\n" / [ \t\r\n\f])? { return "N"; }
  / "\\" "0"? "0"? "0"? "0"? "6" [eE] ("\r\n" / [ \t\r\n\f])? { return "n"; }
  / "\\" char_:[nN] { return char_; }

O
  = [oO]
  / "\\" "0"? "0"? "0"? "0"? "4" [fF] ("\r\n" / [ \t\r\n\f])? { return "O"; }
  / "\\" "0"? "0"? "0"? "0"? "6" [fF] ("\r\n" / [ \t\r\n\f])? { return "o"; }
  / "\\" char_:[oO] { return char_; }

P
  = [pP]
  / "\\" "0"? "0"? "0"? "0"? "50" ("\r\n" / [ \t\r\n\f])? { return "P"; }
  / "\\" "0"? "0"? "0"? "0"? "70" ("\r\n" / [ \t\r\n\f])? { return "p"; }
  / "\\" char_:[pP] { return char_; }

R
  = [rR]
  / "\\" "0"? "0"? "0"? "0"? "52" ("\r\n" / [ \t\r\n\f])? { return "R"; }
  / "\\" "0"? "0"? "0"? "0"? "72" ("\r\n" / [ \t\r\n\f])? { return "r"; }
  / "\\" char_:[rR] { return char_; }

S_
  = [sS]
  / "\\" "0"? "0"? "0"? "0"? "53" ("\r\n" / [ \t\r\n\f])? { return "S"; }
  / "\\" "0"? "0"? "0"? "0"? "73" ("\r\n" / [ \t\r\n\f])? { return "s"; }
  / "\\" char_:[sS] { return char_; }

T
  = [tT]
  / "\\" "0"? "0"? "0"? "0"? "54" ("\r\n" / [ \t\r\n\f])? { return "T"; }
  / "\\" "0"? "0"? "0"? "0"? "74" ("\r\n" / [ \t\r\n\f])? { return "t"; }
  / "\\" char_:[tT] { return char_; }

U
  = [uU]
  / "\\" "0"? "0"? "0"? "0"? "55" ("\r\n" / [ \t\r\n\f])? { return "U"; }
  / "\\" "0"? "0"? "0"? "0"? "75" ("\r\n" / [ \t\r\n\f])? { return "u"; }
  / "\\" char_:[uU] { return char_; }

X
  = [xX]
  / "\\" "0"? "0"? "0"? "0"? "58" ("\r\n" / [ \t\r\n\f])? { return "X"; }
  / "\\" "0"? "0"? "0"? "0"? "78" ("\r\n" / [ \t\r\n\f])? { return "x"; }
  / "\\" char_:[xX] { return char_; }

Z
  = [zZ]
  / "\\" "0"? "0"? "0"? "0"? "5" [aA] ("\r\n" / [ \t\r\n\f])? { return "Z"; }
  / "\\" "0"? "0"? "0"? "0"? "7" [aA] ("\r\n" / [ \t\r\n\f])? { return "z"; }
  / "\\" char_:[zZ] { return char_; }

/* Tokens */

S "whitespace"
  = comment* s

CDO "<!--"
  = comment* "<!--"

CDC "-->"
  = comment* "-->"

INCLUDES "~="
  = comment* "~="

DASHMATCH "|="
  = comment* "|="

STRING "string"
  = comment* string:string { return string; }

IDENT "identifier"
  = comment* ident:ident { return {type:'ident', elements: ident}; }

HASH "hash"
  = comment* "#" name:name { return "#" + name; }

IMPORT_SYM "@import"
  = comment* "@" I M P O R T

PAGE_SYM "@page"
  = comment* "@" P A G E

MEDIA_SYM "@media"
  = comment* "@" M E D I A

CHARSET_SYM "@charset"
  = comment* "@charset "

/* Note: We replace "w" with "s" here to avoid infinite recursion. */
IMPORTANT_SYM "!important"
  = comment* "!" (s / comment)* I M P O R T A N T { return "!important"; }

EMS "length"
  = comment* num:num e:E m:M { return num + e + m; }

EXS "length"
  = comment* num:num e:E x:X { return num + e + x; }

LENGTH "length"
  = comment* num:num unit:(P X / C M / M M / I N / P T / P C) {
      return num + unit.join("");
    }

ANGLE "angle"
  = comment* num:num unit:(D E G / R A D / G R A D) {
      return num + unit.join("");
    }

TIME "time"
  = comment* num:num unit:(m:M s:S_ { return m + s; } / S_) {
      return num + unit;
    }

FREQ "frequency"
  = comment* num:num unit:(H Z / K H Z) { return num + unit.join(""); }

DIMENSION "dimension"
  = comment* num:num unit:ident { return num + unit; }

PERCENTAGE "percentage"
  = comment* num:num "%" { return num + "%"; }

NUMBER "number"
  = comment* num:num { return num; }

URI "uri"
  = elements:(comment* U R L "(" w (string / url) w ")") {
        return {
            type: 'uri',
            elements: elements
        }
    }
    
nmcharfunc
  = [_a-zA-Z0-9-.]
  / nonascii
  / escape
    
FUNCIDENT
  = dash:"-"? nmstart:nmstart nmchars:nmcharfunc* {
      return dash + nmstart + nmchars.join("");
    }

FUNCTION "function"
  = elements:(comment* FUNCIDENT "(") {
        return {
            type: 'functionName',
            elements: elements
        };
    }
