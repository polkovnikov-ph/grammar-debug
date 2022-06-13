import { Iface, Type, Union } from "./type-runtime";
import { isTruthy, toImproperCase } from "./lodash";
import * as g from './pegts-grammar';

const typePrim = <T>(t: Type<T>) => {
    const typeTerm = (node: g.Term) => {
        switch (node.type) {
            case 'Ref':
                return t.ref(toImproperCase(node.name.name));
            case 'Klass': 
            case 'String1': 
            case 'String2':
                return t.string;
        }
    };
    
    const typePart = (node: g.Part) => {
        if (!node.field) {
            return undefined;
        }
        const name = node.field.name.name;
        let type = typeTerm(node.term);
        if (node.suffix) {
            switch (node.suffix.suffix) {
                case '+':
                case '*':
                    type = t.array(type);
                    break;
                case '?':
                    type = t.maybe(type);;
                    break;
                default:
                    throw new Error("Impossible");
            }
        }
        if (node.stringy) {
            type = t.string;
        }
        return [name, type] as const;
    };

    return typePart;
};

export const typeTop = <T, I>(t: Type<T> & Iface<T, I> & Union<T, I>) => {
    const typeSequence = (node: g.Sequence) => {
        const fields = node.terms.map(typePrim(t))
            .filter(isTruthy)
            .map(([name, type]) => [name, type] as const);
        fields.push(['$from', t.number]);
        fields.push(['$to', t.number]);
        return t.iface(
            toImproperCase(node.name.name),
            Object.fromEntries(fields),
        );
    };
    
    const typeUnion = (node: g.Union) => (
        t.union(
            toImproperCase(node.name.name),
            node.cases.map(c => t.ref(toImproperCase(c.kase.name))),
        )
    );
    
    const typeRule = (node: g.Rule) => {
        switch (node.type) {
            case 'Sequence': return typeSequence(node);
            case 'Union': return typeUnion(node);
        }
    };
    
    const typeGrammar = (node: g.Grammar) => {
        return node.rules.map(typeRule);
    };

    return typeGrammar;
};