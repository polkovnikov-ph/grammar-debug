import { Prims, Grammar } from "./grammar-runtime";
import { toImproperCase } from "./lodash";
import * as g from './pegts-grammar';

const CharMap: Record<string, string> = {
    'r': '\r',
    'n': '\n',
    't': '\t',
    '\\': '\\',
    '"': '"',
    "'": "'",
};
const compilePrim = <T>(t: Prims<T>) => {
    const charCompiler = <K extends string>(k: K) => (node: {type: string, char: string}) => {
        if (node.type === k) {
            return node.char;
        } else {
            return CharMap[node.char];
        }
    };
    const compileClassChar = (node: g.ClassChar) => {
        if (node.type === 'ClassCharSimple') {
            return node.char;
        } else {
            return '\\' + node.char;
        }
    };
    const compileString1Char = charCompiler('String1CharSimple');
    const compileString2Char = charCompiler('String2CharSimple');
    
    const compileRef = (node: g.Ref) => {
        return t.call(toImproperCase(node.name.name));
    };
    
    const compileKlass = (node: g.Klass) => {
        const value = (node.inverted ? '^' : '') + node.parts.map(part => {
            if (part.type === 'Single') {
                return compileClassChar(part.char);
            } else {
                return `${compileClassChar(part.from)}-${compileClassChar(part.to)}`;
            }
        }).join('');
        return t.klass(value);
    };
    
    const compileString1 = (node: g.String1) => {
        const text = node.chars.map(compileString1Char).join('');
        return t.string(text);
    };
    
    const compileString2 = (node: g.String2) => {
        const text = node.chars.map(compileString2Char).join('');
        return t.string(text);
    };
    
    const compileTerm = (node: g.Term) => {
        switch (node.type) {
            case 'Ref': return compileRef(node);
            case 'Klass': return compileKlass(node);
            case 'String1': return compileString1(node);
            case 'String2': return compileString2(node);
        }
    };
    
    const compilePart = (node: g.Part) => {
        const name = node.field ? node.field.name.name : undefined;
        let result = compileTerm(node.term);
        if (node.term.type === 'Ref') {
            result = t.pos(node.$from, node.$to, result);
        }
        if (node.suffix) {
            switch (node.suffix.suffix) {
                case '+': result = t.many(result); break;
                case '*': result = t.some(result); break;
                case '?': result = t.maybe(result); break;
                default: throw new Error("Impossible");
            }
        }
        if (node.stringy) {
            result = t.stringy(result);
        }
        if (node.term.type !== 'Ref') {
            result = t.pos(node.$from, node.$to, result);
        }
        const r: [string | undefined, T] = [name, result];
        return r;
    };

    return compilePart;
};

export const compileTop = <T, G>(t: Prims<T> & Grammar<T, G>) => {
    const compileSequence = (node: g.Sequence) => {
        const prims1 = node.terms
            .map(term => compilePrim(t)(term))
        // const prims = prims1.reduce(
        //     (acc, [name, term]) => name
        //         ? t.seq1(acc, name, term)
        //         : t.seq0(acc, term),
        //     t.one,
        // );
        const prims = t.seqs(prims1);
        return t.tagged(node.name.name, prims);
    };

    const compileKase = (node: g.Kase) => {
        return t.pos(node.$from, node.$to, t.call(toImproperCase(node.kase.name)));
    };

    const compileUnion = (node: g.Union) => {
        const cs = t.sels(node.cases.map(compileKase));
            // .reduce((acc, term) => t.sel(acc, term), t.zero);
        return t.untagged(node.name.name, cs);
    };

    const compileRule = (node: g.Rule) => {
        switch (node.type) {
            case 'Sequence': return compileSequence(node);
            case 'Union': return compileUnion(node);
        }
    };

    const compileGrammar = (node: g.Grammar) => {
        return node.rules.map(compileRule);
    };

    return compileGrammar;
};