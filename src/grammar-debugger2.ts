import { singleton, toImproperCase, toProperCase } from "./lodash";
import { Grammar, Prims } from "./grammar-runtime";
// import { Grammar } from "./pegts-grammar";

type Context = {
    s: string;
    p: number;
    l: number;
    sp: [number, number],
    resolve: (name: string) => Debugger,
    pi: number,
}
interface PosStep { type: 'pos', from: number; to: number; }
interface MoveStep { type: 'move', pos: number }
interface InStep { type: 'in', name: string }
interface OutStep { type: 'out' }
// interface ValueStep { type: 'value', value: Value1, place: Place }
// interface StringValue1 {
//     type: 'string';
//     value: string;
// }
// interface UndefinedValue1 {
//     type: 'undefined';
// }
// interface ArrayValue1 {
//     type: 'array';
//     children: Place[];
// }
// interface ObjectValue1 {
//     type: 'object',
//     fields: Record<string, Place>;
// }
// type Value1 = StringValue1 | UndefinedValue1 | ArrayValue1 | ObjectValue1
type Step = PosStep | MoveStep | InStep | OutStep /*| ValueStep*/
declare const FailVT: unique symbol;
type Fail = typeof FailVT
const Fail: Fail = {fail: true} as unknown as Fail;
interface StringValue {
    type: 'string';
    value: string;
}
interface UndefinedValue {
    type: 'undefined';
}
interface ArrayValue {
    type: 'array';
    children: Value[];
}
interface ObjectValue {
    type: 'object',
    fields: Record<string, Value>;
}
type Value = StringValue | UndefinedValue | ArrayValue | ObjectValue
type Debugger = (ctx: Context) => Generator<Step, Value | Fail, void>
export const debugger2: Prims<Debugger> & Grammar<Debugger, [string, Debugger]> = {
    string: (value) => {
        const l = value.length;
        return function*(c) {
            const v = c.s.substr(c.p, l);
            if (c.p < c.l && v === value) {
                c.p += l;
                yield {type: 'move', pos: c.p};
                return {type: 'string', value};
            } else {
                return Fail;
            }
        };
    },
    klass: (value) => {
        const r = new RegExp(`[${value}]`);
        return function*(c) {
            const x = c.s[c.p];
            if (c.p < c.l && x.match(r)) {
                ++c.p;
                yield {type: 'move', pos: c.p};
                return {type: 'string', value: x};
            } else {
                return Fail;
            }
        };
    },
    stringy: (child) => function*(c) {
        const pos = c.p;
        const res = yield* child(c);
        return res === Fail ? Fail : {type: 'string', value: c.s.substring(pos, c.p)};
    },
    maybe: (child) => function*(c) {
        const pos = c.p;
        const res = yield* child(c);
        if (res === Fail) {
            c.p = pos;
            yield {type: 'move', pos: c.p};
            return {type: 'undefined'};
        }
        return res;
    },
    some: (child) => function*(c) {
        const parts: Value[] = [];
        for (;;) {
            const pos = c.p;
            const res = yield* child(c);
            if (res === Fail) {
                c.p = pos;
                yield {type: 'move', pos: c.p};
                return {type: 'array', children: parts};
            }
            parts.push(res);
        }
    },
    many: (child) => function*(c) {
        const parts: Value[] = [];
        const res = yield* child(c);
        if (res === Fail) {
            return Fail;
        }
        parts.push(res);
        for (;;) {
            const pos = c.p;
            const res = yield* child(c);
            if (res === Fail) {
                c.p = pos;
                yield {type: 'move', pos: c.p};
                return {type: 'array', children: parts};
            }
            parts.push(res);
        }
    },
    call: (name) => function*(c) {
        return yield* c.resolve(name)(c);
    },
    seqs: (children) => function*(c) {
        const parts: Record<string, Value> = {};
        for (const [name, child] of children) {
            const res = yield* child(c);
            if (res === Fail) {
                return Fail;
            }
            if (name !== undefined) {
                parts[name] = res;
            }
        }
        return {
            type: 'object',
            fields: parts,
        };
    },
    sels: (children) => function*(c) {
        const pos = c.p;
        for (const child of children) {
            const res = yield* child(c);
            if (res !== Fail) {
                return res;
            }
            c.p = pos;
            yield {type: 'move', pos: c.p};
        }
        return Fail;
    },
    tagged: (name, child) => [name, function*(c) {
        // const from = c.p;
        yield {type: 'in', name};
        const res = yield* child(c);
        yield {type: 'out'};
        if (res === Fail) {
            return Fail;
        }
        if (res.type !== 'object') {
            throw new Error('Impossible');
        }
        const fields: Record<string, Value> = {
            type: {type: 'string', value: name}, 
            ...res.fields, 
            // $from: from, 
            // $to: c.p,
        };
        return {
            type: 'object',
            fields,
        };
    }],
    untagged: (name, child) => [name, function* (c) {
        yield {type: 'in', name};
        const res = yield* child(c);
        yield {type: 'out'};
        return res;
    }],
    pos: (from, to, child) => function*(c) {
        // const psp = c.sp;
        // c.sp = [from, to];
        yield {type: 'pos', from, to};
        const res = yield* child(c);
        // c.sp = psp;
        return res;
    }
};

export const debug2 = (inter: [string, Debugger][]) => {
    const obj = Object.fromEntries(inter.map(([k, v]) => [toImproperCase(k), v]));
    const resolve = (name: string) => {
        if (!(name in obj)) {
            console.log(name);
            throw new Error('Unresolved dependency');
        }
        return obj[name];
    };
    const result: Record<string, (text: string) => Generator<Step, Value | Fail, void>> = {};
    inter.forEach(([name, deb]) => result[name] = function*(text: string) {
        const c: Context = {
            s: text,
            p: 0,
            l: text.length,
            sp: [0, 0],
            resolve,
            pi: 0,
        };
        const res = yield* deb(c);
        if (res === Fail || c.p !== c.l) {
            throw new Error("Parse failed");
        }
        return res;
    });
    return result;
};

export const collect = (gen: Generator<Step, Value | Fail, void>) => {
    let steps: Step[] = [], result: Value | Fail = Fail;
    for (;;) {
        const res = gen.next();
        if (res.done) {
            result = res.value;
            break;
        } else {
            steps.push(res.value);
        }
    }
    return {steps, result};
};