import { readFileSync } from 'fs'
import * as t from '@babel/types';
import generate from '@babel/generator';
import {format} from 'prettier';
import { isTruthy, toImproperCase } from './lodash';
import * as g from './pegts-grammar';
import { Iface, Type, Union } from './type-runtime';
import { codegenType } from './type-codegen';
import { Grammar, Prims } from './grammar-runtime';
import { interpret, interpreter } from './grammar-interp';
import { debug, debuggr } from './grammar-debugger';
import { debug2, debugger2 } from './grammar-debugger2';
import { compileTop } from './grammar-compile';
// import { debug3, debugger3, trace } from './grammar-debugger3';

require("util").inspect.defaultOptions.depth = null;

// TODO:
//  - step in / step over
//  - редакторы (codemirror? monaco?)
//  - генерировать ft вместо adt в грамматиках, сделать compile*/type* алгебрами
//  - нормальные сообщения об ошибках, несколько сообщений об ошибке
//  - генерировать Prims/Grammar/Prims1/Grammar1, Type/Iface/Union/Type1/Iface1/Union1

// (тип) => (терм этого типа) => бабельный аст

const algebraName = "f";
const prim = (name: string, ...args: t.Expression[]): t.Expression => {
    const field = t.memberExpression(
        t.identifier(algebraName),
        t.identifier(name),
    );
    return args.length > 0
        ? t.callExpression(field, args)
        : field;
};
const def = (callName: string) => (name: string, prims: t.Expression): t.Declaration => {
    const typeParams = ["T", "G"];
    const ref = t.tsTypeReference(
        t.tsQualifiedName(t.identifier("m"), t.identifier("Grammar1"))
    );
    ref.typeParameters = t.tsTypeParameterInstantiation(
        typeParams.map(name => (
            t.tsTypeReference(t.identifier(name))
        )),
    );
    const param = t.identifier(algebraName);
    param.typeAnnotation = t.tsTypeAnnotation(ref);
    const func = t.arrowFunctionExpression(
        [param], 
        prim(callName, t.stringLiteral(toImproperCase(name)), prims),
    );
    func.typeParameters = t.tSTypeParameterDeclaration(
        typeParams.map(name => (
            t.tsTypeParameter(t.tsTypeReference(
                t.tsQualifiedName(
                    t.identifier('f'),
                    t.identifier('TypeTag'),
                )
            ), null, name)
        )),
    );
    func.returnType = t.tsTypeAnnotation(
        t.tsTypeReference(
            t.tsQualifiedName(
                t.identifier("f"),
                t.identifier("Apply"),
            ),
            t.tsTypeParameterInstantiation([
                t.tsTypeReference(t.identifier('G')),
                t.tsTypeReference(t.identifier(toImproperCase(name))),
            ])
        ),
    );
    return t.exportNamedDeclaration(t.variableDeclaration(
        'const',
        [t.variableDeclarator(
            t.identifier(toImproperCase(name)),
            t.callExpression(
                t.memberExpression(
                    t.identifier("l"),
                    t.identifier("memo")
                ),
                [func],
            ),
        )],
    ));
};
// const handler: Prims<t.Expression> & Grammar<t.Expression, t.Declaration> = {
//     tagged: def('tagged'),
//     untagged: def('untagged'),
//     call: (name) => prim(
//         'call', 
//         t.stringLiteral(name), 
//         t.arrowFunctionExpression([], t.callExpression(
//             t.identifier(name),
//             [t.identifier(algebraName)],
//         )),
//     ),
//     klass: (value) => prim('klass', t.stringLiteral(value)),
//     many: (child) => prim('many', child),
//     maybe: (child) => prim('maybe', child),
//     one: prim('one'),
//     sel: (prev, next) => prim('sel', prev, next),
//     seq0: (prev, next) => prim('seq0', prev, next),
//     seq1: (prev, name, next) => prim('seq1', prev, t.stringLiteral(name), next),
//     some: (child) => prim('some', child),
//     string: (value) => prim('string', t.stringLiteral(value)),
//     stringy: (child) => prim('stringy', child),
//     zero: prim('zero'),
//     pos: (from, to, child) => prim('pos', t.numericLiteral(from), t.numericLiteral(to), child),
// };

const importAllAs = (name: string, from: string) => {
    return t.importDeclaration(
        [t.importNamespaceSpecifier(t.identifier(name))],
        t.stringLiteral(from),
    );
};

// const code = readFileSync('./pegts-grammar.pegts', 'utf-8');
const code = `grammar = _ rules:rule+;
rule : union sequence;
union = name:ident ":" _ cases:kase+ ";" _;
kase = kase:ident;
sequence = name:ident "=" _ terms:part+ ";" _;
part = field:field? stringy:"$"? term:term suffix:suffix?;
field = name:ident ":";
suffix = suffix:[+*?] _;
term : ref klass string1 string2;
ref = name:ident;
klass = "[" inverted:inverted? parts:classPart* "]" _;
inverted = "^";
classPart : range single;
range = from:classChar "-" to:classChar;
single = char:classChar;
classChar : classCharEscape classCharSimple;
classCharSimple = char:[^\\\\\\[\\]];
classCharEscape = "\\\\" char:[\\\\\\[\\]rnt];
string1 = "'" chars:string1Char* "'" _;
string1Char : string1CharEscape string1CharSimple;
string1CharSimple = char:[^'\\\\\\r\\n\\t];
string1CharEscape = "\\\\" char:['\\\\rnt];
string2 = '"' chars:string2Char* '"' _;
string2Char : string2CharEscape string2CharSimple;
string2CharSimple = char:[^"\\\\\\r\\n\\t];
string2CharEscape = "\\\\" char:["\\\\rnt];
ident = name:$identName _;
identName = [a-zA-Z_] [a-zA-Z0-9_]*;
_ = [ \t\r\n]*;`;
// const poss = [...debug(g.Grammar(debuggr), code)];
// console.log(JSON.stringify(poss));
const ast = interpret(g.Grammar(interpreter), code);
// console.log(JSON.stringify(ast));
// const gen = debug2(compileTop(debugger2)(ast))['grammar'](code);
// console.log(JSON.stringify(
//     debug3(compileTop(debugger3(trace))(ast))['grammar'](code)[1],
// null, 2));
// let coll: any[] = [], result: any;
// for (;;) {
//     const res = gen.next();
//     if (res.done) {
//         result = res.value;
//         break;
//     } else {
//         coll.push(res);
//     }
// }
// console.log(JSON.stringify(coll, null, 4));
// console.log(JSON.stringify(result, null, 4));

// const defs: t.Declaration[] = [
//     importAllAs('m', './grammar-runtime'),
//     importAllAs('f', './ft'),
//     importAllAs('l', './lodash'),
//     ...typeTop(codegenType)(ast),
//     ...compileTop(handler)(ast),
// ];
// const pretty = generate(t.file(t.program(defs)), {}).code;
// // const pretty = format(ugly, {
// //     parser: "babel-ts",
// //     singleQuote: true,
// //     trailingComma: 'all',
// //     bracketSpacing: false,
// //     tabWidth: 4,
// // });
// console.log(pretty);