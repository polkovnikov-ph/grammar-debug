import * as t from '@babel/types';
import generate from '@babel/generator';
import { format } from 'prettier';
import { flatten, isTruthy } from './lodash';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { Iface, Type, Union } from './type-runtime';
import { codegenType } from './type-codegen';

require("util").inspect.defaultOptions.depth = null;

type FT = <T>(alg: Type<T>) => T;
type FI = <T, I>(alg: Type<T> & Iface<T, I> & Union<T, I>) => I;

const numberType: FT = (alg) => alg.number;
const stringType: FT = (alg) => alg.string;
const compileArrayType = (node: t.TSArrayType): FT => {
    return (alg) => alg.array(compileType(node.elementType)(alg));
};
const compileRefType = (node: t.TSTypeReference): FT => {
    const {typeName} = node;
    if (!t.isIdentifier(typeName)) {
        throw 42;
    }
    const {name} = typeName;
    if (node.typeParameters) {
        const {params} = node.typeParameters;
        if (name !== 'Maybe' || params.length !== 1) {
            throw 42;
        }
        return (alg) => alg.maybe(compileType(params[0])(alg));
    } else {
        return (alg) => alg.ref(name);
    }
};

const compileType = (node: t.TSType) => {
    switch (node.type) {
        case 'TSNumberKeyword': return numberType;
        case 'TSStringKeyword': return stringType;
        case 'TSArrayType': return compileArrayType(node);
        case 'TSTypeReference': return compileRefType(node);
        default: throw 42;
    }
};

const compileField = (node: t.TSTypeElement) => {
    if (!t.isTSPropertySignature(node)) {
        throw 42;
    }
    const {key} = node;
    if (!t.isIdentifier(key)) {
        throw 42;
    }
    const {name} = key;
    if (!node.typeAnnotation) {
        throw 42;
    }
    if (t.isTSLiteralType(node.typeAnnotation.typeAnnotation)) {
        return undefined;
    }
    const type = compileType(node.typeAnnotation.typeAnnotation);
    return [name, type] as const;
};
const compileInterface = (node: t.TSInterfaceDeclaration): FI => {
    const {name} = node.id;
    const fieldPairs = node.body.body.map(compileField);
    return (alg) => alg.iface(name, Object.fromEntries(
        fieldPairs.filter(isTruthy)
            .map(([name, field]) => [name, field(alg)] as const)
    ));
};
const compileTypeAlias = (node: t.TSTypeAliasDeclaration): FI => {
    const {name} = node.id;
    const {typeAnnotation} = node;
    if (!t.isTSUnionType(typeAnnotation)) {
        throw 42;
    }
    const types = typeAnnotation.types.map(compileType);
    return (alg) => alg.union(name, types.map(type => type(alg)));
};

const compileStatement = (node: t.Statement) => {
    if (!t.isExportNamedDeclaration(node)) {
        throw 42;
    }
    const {declaration} = node;
    if (t.isTSInterfaceDeclaration(declaration)) {
        return compileInterface(declaration);
    } else if (t.isTSTypeAliasDeclaration(declaration)) {
        return compileTypeAlias(declaration);
    } else {
        throw 42;
    }
};

const compileFile = (node: t.File) => {
    return node.program.body.map(compileStatement);
};



// const algebraName = "f";
// const prim = (name: string, ...args: t.Expression[]): t.Expression => {
//     const field = t.memberExpression(
//         t.identifier(algebraName),
//         t.identifier(name),
//     );
//     return args.length > 0
//         ? t.callExpression(field, args)
//         : field;
// };

// const toMeta: Type<t.Expression> & Iface<t.Expression, t.Declaration> = {
//     ref: (name: string): t.Expression => {
//         return prim(
//             "ref", 
//             t.stringLiteral(name), 
//             t.callExpression(
//                 t.identifier(name),
//                 [t.identifier(algebraName)],
//             ),
//         );
//     },
//     array: (child: t.Expression): t.Expression => {
//         return prim("array", child);
//     },
//     string: prim("string"),
//     number: prim("number"),
//     maybe: (child: t.Expression): t.Expression => {
//         return prim("maybe", child);
//     },
//     iface: (name, fields) => {
//         const typeParams = ["T", "C", "D"];
//         const ref = t.tsTypeReference(
//             t.tsQualifiedName(t.identifier("m"), t.identifier("TypeMeta"))
//         );
//         ref.typeParameters = t.tsTypeParameterInstantiation(
//             typeParams.map(name => (
//                 t.tsTypeReference(t.identifier(name))
//             )),
//         );
//         const param = t.identifier(algebraName);
//         param.typeAnnotation = t.tsTypeAnnotation(ref);
//         const fields1 = t.objectExpression(Object.entries(options).map(([k, v]) => (
//             t.objectProperty(t.identifier(k), v)
//         )));
//         const func = t.arrowFunctionExpression(
//             [param],
//             prim(
//                 "typeDef",
//                 t.stringLiteral(name),
//                 fields1,
//             ),
//         );
//         func.typeParameters = t.tSTypeParameterDeclaration(
//             typeParams.map(name => (
//                 t.tsTypeParameter(t.tsTypeReference(
//                     t.tsQualifiedName(
//                         t.identifier('m'),
//                         t.identifier('TypeTag'),
//                     )
//                 ), null, name)
//             )),
//         );
//         func.returnType = t.tsTypeAnnotation(
//             t.tsTypeReference(
//                 t.tsQualifiedName(
//                     t.identifier("m"),
//                     t.identifier("Apply"),
//                 ),
//                 t.tsTypeParameterInstantiation([
//                     t.tsTypeReference(t.identifier('D')),
//                     t.tsTypeReference(t.identifier(name)),
//                 ])
//             ),
//         );
//         return t.exportNamedDeclaration(t.variableDeclaration(
//             'const',
//             [t.variableDeclarator(
//                 t.identifier(name),
//                 t.callExpression(
//                     t.memberExpression(
//                         t.identifier("m"),
//                         t.identifier("memo")
//                     ),
//                     [func],
//                 ),
//             )],
//         ));
//     },
//     field: (left, name, right) => prim("field", left, t.stringLiteral(name), right),
//     typeDef: (name, options): t.Declaration => {
        
//     },
// };

// const toTypes = (tagName: string)
//     : m.TypeDef<t.TSPropertySignature[], t.Declaration[]>
//     & m.Cons<t.TSType, t.TSPropertySignature[]> => ({
//     nil: [],
//     field: (left, name, right) => [...left, t.tsPropertySignature(
//         t.identifier(name),
//         t.tsTypeAnnotation(right),
//     )],
//     typeDef: (name: string, options: Record<string, t.TSPropertySignature[]>): t.Declaration[] => {
//         const names = Object.keys(options);
//         const consDecls = Object.entries(options).map(([name, fields]) => (
//             t.exportNamedDeclaration(t.tsInterfaceDeclaration(
//                 t.identifier(name),
//                 null,
//                 null,
//                 t.tsInterfaceBody([
//                     t.tsPropertySignature(
//                         t.identifier(tagName),
//                         t.tsTypeAnnotation(t.tsLiteralType(
//                             t.stringLiteral(name),
//                         )),
//                     ),
//                     ...fields,
//                 ]),
//             ))
//         ));
//         if (names.length !== 1 || names[0] !== name) {
//             consDecls.push(t.exportNamedDeclaration(t.tsTypeAliasDeclaration(
//                 t.identifier(name),
//                 null,
//                 t.tsUnionType(names.map(name => (
//                     t.tsTypeReference(t.identifier(name))
//                 ))),
//             )));
//         }
//         return consDecls;
//     },
// });

// const toConstr = (tagName: string)
//     : m.TypeDef<t.Identifier[], t.Declaration[]>
//     & m.Cons<t.TSType, t.Identifier[]> /* m.Field<t.TSType, t.Identifier>*/ => ({
//     nil: [],
//     field: (rest, name, type) => {
//         const result = t.identifier(name);
//         result.typeAnnotation = t.tsTypeAnnotation(type);
//         return [...rest, result];
//     },
//     typeDef: (name: string, options: Record<string, t.Identifier[]>): t.Declaration[] => {
//         return Object.entries(options).map(([name, fields]) => {
//             const func = t.arrowFunctionExpression(
//                 fields,
//                 t.objectExpression([
//                     t.objectProperty(
//                         t.identifier(tagName), 
//                         t.stringLiteral(name),
//                     ),
//                     ...fields.map(field => {
//                         const same = t.identifier(field.name);
//                         return t.objectProperty(same, same, undefined, true);
//                     }),
//                 ]),
//             );
//             func.returnType = t.tsTypeAnnotation(
//                 t.tsTypeReference(t.identifier(name)),
//             );
//             return t.exportNamedDeclaration(t.variableDeclaration('const', [
//                 t.variableDeclarator(t.identifier(toProperCase(name)), func),
//             ]));
//         })
//     },
// });

// 1.
// grammar = _ rules:rule+;
// 2.

// export interface Grammar { type: 'Grammar', rules: Rule[] }
// export const Grammar = <T>(g: m.Grammar<T>): Apply<T, Grammar> => g.seq1(
//     g.seq0(
//         g.nil,
//         g.call("_", () => _(g)),
//     ),
//     "rules",
//     g.many(g.call("rule", () => Rule(alg)))
// );

const code = readFileSync('grammar-ast.ts', 'utf-8');
const ast = parse(code, {
    plugins: ['typescript'],
    sourceType: 'module',
});
const types = compileFile(ast);

const defs = flatten([
    // [t.importDeclaration(
    //     [t.importNamespaceSpecifier(t.identifier("m"))],
    //     t.stringLiteral('./meta'),
    // )],
    types.map(type => type(codegenType)),
    // ...types({...toConstr(tagName), ...toBabelAst}).filter(isTruthy),
    // types(toMeta),
]);
const ugly = generate(t.file(t.program(defs)), {}).code;
const pretty = format(ugly, {
    parser: "babel-ts",
    singleQuote: true,
    trailingComma: 'all',
    bracketSpacing: false,
    tabWidth: 4,
});
console.log(pretty);
// console.log(types(dependencies));

// this <-> ts types (babel)
// this -> generate functions that return objects: field(), ref(), ...
// this -> isField(), isRef(), ...
// this -> generate final tagless: field(), ref(), ... 
// this <-> json

// data Json
//     Null
//     Boolean boolean
//     Number number
//     String string
//     Array Array<Json>
//     Object Record<string, Json>

// export interface Visitor<Type, Field, Def, DefSet> {
//     ref: (name: string) => Type;
//     apply: (target: Type, args: Type[]) => Type;
//     field: (name: string, type: Type) => Field;
//     term: (name: string, polys: string[], fields: Field[]) => Def;
//     typeDef: (name: string, polys: string[], options: Type[]) => Def;
//     defSet: (defs: Def[]) => DefSet;
// }

// func.typeParameters = polys.length > 0
// ? t.tsTypeParameterDeclaration(
//     polys.map(name => t.tSTypeParameter(null, null, name)),
// )
// : undefined;
// poly: (name: string): t.TSType => {
//     return t.tsTypeReference(t.identifier(name));
// },

// term('DefSet', [
//     field('defs', apply('Array', [ref('Def')])),
// ]),
// term('Param', [
//     field('name', ref('String')),
//     field('type', ref('Type')),
// ]),
// term('Method', [
//     field('name', ref('String')),
//     field('params', apply('Array', [ref('Param')])),
//     field('resultType', ref('Type')),
// ]),
// term('Api', [
//     field('methods', apply('Array', [ref('Method')])),
// ]),


// interface name = !(reserved | strict | types)
// field name (in interface, in a.b, in a = {b: c}) = literally any
// function argument name = !(reserved | strict)
// variable declaration = !(reserved | strict | 'undefined')

// const dependencies: Def<string[], [string, string[]], string[]> & Field<string[], string[]> & Type<string[]> = ({
//     ref: (name: string) => [name],
//     apply: (name: string, args: string[][]) => [name, ...flatten(args)],
//     field: (name: string, type: string[]) => type,
//     term: (name: string, fields: string[][]) => [name, flatten(fields)],
//     typeDef: (name: string, options: string[][]) => [name, flatten(options)],
// });

// const types = <T, C, D>(f: m.TypeMeta<T, C, D>): D[] => [
//     f.typeDef('Foo', {
//         Bar: f.field(f.nil, 'bar', f.string),
//         Baz: f.field(f.nil, 'baz', f.number),
//     }),
// ];

// const serialize: Type<any> & Iface<any, any> = {
//     string: {type: 'string'},
//     number: {type: 'number'},
//     array: (child) => ({type: 'array', child}),
//     maybe: (child) => ({type: 'maybe', child}),
//     ref: (name) => ({type: 'ref', name}),
//     iface: (name, fields) => ({type: 'iface', name, fields}),
//     union: (name, options) => ({type: 'union', name, options}),
// };
// console.log(compileFile(ast).map(decl => decl(serialize)))

// https://github.com/Microsoft/TypeScript/blob/master/src/compiler/types.ts#L112

const reserved = [
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 
    'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 
    'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 
    'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with',
];

const strict = [
    'implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield',
];

const typeNames = [
    'any', 'boolean', 'number', 'object', 'string', 'symbol', 'undefined', 'unknown', 'bigint',
];

const context = [
    'abstract', 'as', 'asserts', 'async', 'await', 'constructor', 'declare', 'get', 'infer',
    'intrinsic', 'is', 'keyof', 'module', 'namespace', 'never', 'readonly', 'require', 'set',
    'type', 'unique', 'from', 'global', 'of',
];