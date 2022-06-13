import * as t from '@babel/types';
import { Iface, Type, Union } from "./type-runtime";

const babelifyType: Type<t.TSType> = {
    ref: (name: string): t.TSType => {
        return t.tsTypeReference(t.identifier(name));
    },
    array: (child: t.TSType): t.TSType => {
        return t.tsArrayType(child);
    },
    maybe: (child: t.TSType): t.TSType => {
        const result = t.tsTypeReference(t.tsQualifiedName(
            t.identifier('l'),
            t.identifier('Maybe'),
        ));
        result.typeParameters = t.tsTypeParameterInstantiation([child]);
        return result;
    },
    string: t.tsStringKeyword(),
    number: t.tsNumberKeyword(),
};

const babelifyIface = (tagName: string): Iface<t.TSType, t.Declaration> => ({
    iface: (name, fields) => {
        const rows = [
            [tagName, t.tsLiteralType(t.stringLiteral(name))] as const,
            ...Object.entries(fields)
        ].map(([name, type]) => (
            t.tsPropertySignature(t.identifier(name), t.tsTypeAnnotation(type))
        ));
        return t.exportNamedDeclaration(t.tsInterfaceDeclaration(
            t.identifier(name),
            null,
            null,
            t.tsInterfaceBody(rows),
        ));
    },
});

const babelifyUnion: Union<t.TSType, t.Declaration> = {
    union: (name, options) => {
        return t.exportNamedDeclaration(t.tsTypeAliasDeclaration(
            t.identifier(name),
            null,
            t.tsUnionType(options),
        ))
    },
};

const tagName = 'type'; // 'kind'
export const codegenType = {...babelifyType, ...babelifyIface(tagName), ...babelifyUnion};