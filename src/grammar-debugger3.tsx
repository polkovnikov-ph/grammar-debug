import { combine, Emitter, Json, toImproperCase } from "./lodash";
import { Grammar, Prims } from "./grammar-runtime";

type Context<T> = {
    s: string;
    p: number;
    l: number;
    sp: [number, number],
    resolve: (name: string) => Debugger<T>,
}

interface Trace1<T> {
    step: T;

    pos: (from: number, to: number, child: T) => T;
    dig: (name: string, child: T) => T;

    consume: (pos: number, child: T) => T;
    rollback: (pos: number, child: T) => T;

    named: (name: string, child: T) => T;
    object: (names: (string | undefined)[], all: T[]) => T;
    sels: (all: T[]) => T;
    string: (value: string, child: T) => T;
    array: (good: T[], bad: T) => T;
    undefined: (child: T) => T;
}

interface Step { type: "step" }
interface SrcPos { type: "srcpos", from: number, to: number }
interface Consume { type: "consume", pos: number }
interface Rollback { type: "rollback", pos: number }
interface RuleIn { type: "ruleIn", name: string }
interface RuleOut { type: "ruleOut" }
export type TType = 'todo' | 'string' | 'undefined' | 'array' | 'object'
interface SetText { at: number, type: "setText", text: string }
interface SetType { at: number, type: "setType", ttype: TType }
interface SetPrefix { at: number, type: "setPrefix", text: string }
interface Push { at: number, type: "push", ix: number }
interface Pop { at: number, type: "pop" }
interface Reset { at: number, type: "reset" }
interface NodeIn { type: "nodeIn", at: number }
interface NodeOut { type: "nodeOut" }
type Res = SrcPos | Consume | Rollback | RuleIn | RuleOut | Step | SetText | SetType | SetPrefix | Push | Pop | Reset | NodeIn | NodeOut
type DebugI = (into: number) => Generator<Res, void, void>
let lastIndex = 1;
const getIndex = () => ++lastIndex;
export const trace2: Trace1<DebugI> = {
    step: function* () {
        yield {type: 'step'};
    },

    pos: (from, to, child) => function* (into) {
        yield {type: 'srcpos', from, to};
        return yield* child(into);
    },
    dig: (name, child) => function* (into) {
        yield {type: 'ruleIn', name};
        const res = yield* child(into);
        yield {type: 'ruleOut'};
        return res;
    },

    consume: (pos, child) => function* (into) {
        const res = yield* child(into);
        yield {type: 'consume', pos};
        return res;
    },
    rollback: (pos, child) => function* (into) {
        const res = yield* child(into);
        yield {type: 'rollback', pos};
        return res;
    },

    string: (v, child) => function* (into) {
        yield* child(getIndex());
        yield {at: into, type: 'setText', text: JSON.stringify(v)};
        yield {at: into, type: 'setType', ttype: 'string'};
    },
    undefined: (child) => function* (into) {
        yield* child(getIndex());
        yield {at: into, type: 'setText', text: 'null'};
        yield {at: into, type: 'setType', ttype: 'undefined'};
    },
    array: (good, bad) => function* (into) {
        yield {at: into, type: 'setText', text: '[]'};
        yield {at: into, type: 'setType', ttype: 'array'};
        for (const [i, g] of good.entries()) {
            const child = getIndex();
            yield {at: into, type: 'push', ix: child};
            yield {at: child, type: 'nodeIn'};
            yield* g(child);
            yield {type: 'nodeOut'};
        }
        const child = getIndex();
        yield {at: into, type: 'push', ix: child};
        yield {at: child, type: 'nodeIn'};
        yield* bad(child);
        yield {type: 'nodeOut'};
        yield {at: into, type: 'pop'};
    },
    named: (name, child) => function* (into) {
        yield {at: into, type: 'setText', text: name};
        yield {at: into, type: 'setType', ttype: 'object'};
        yield* child(into);
    },
    object: (names, all) => function* (into) {
        const children: (() => Generator<Res, void, void>)[] = [];
        for (const [i, child] of all.entries()) {
            const name = names[i];
            const ch = getIndex();
            if (name) {
                yield {at: into, type: 'push', ix: ch};
                yield {at: ch, type: 'setPrefix', text: name};
            }
            children.push(function* () {
                yield {at: ch, type: 'nodeIn'};
                const res = yield* child(ch);
                yield {type: 'nodeOut'};
                return res;
            });
        }
        for (const child of children) {
            yield* child();
        }
    },
    sels: (all) => function* (into) {
        for (const g of all) {
            yield {at: into, type: 'reset'};
            yield* g(into);
        }
    },
};

export type NodeType = 'todo' | 'string' | 'array' | 'object' | 'undefined'
type NodeValue = {
    text: string,
    prefix: string,
    children: NodeModel[],
    type: NodeType,
}
export class NodeModel {
    public value: NodeValue = {
        text: '...',
        prefix: '',
        children: [],
        type: 'todo',
    };
    private bus = new Emitter<{
        update: [],
    }>();
    private withUpdate = <T extends any[]>(f: (...t: T) => void) => (...t: T) => {
        f(...t);
        this.bus.emit('update');
    };
    public setText = this.withUpdate((value: string) => {
        this.value.text = value;
    });
    public setType = this.withUpdate((value: NodeType) => {
        this.value.type = value;
    });
    public setPrefix = this.withUpdate((value: string) => {
        this.value.prefix = value;
    });
    public push = this.withUpdate((child: NodeModel) => {
        this.value.children.push(child);
    });
    public pop = this.withUpdate(() => {
        this.value.children.pop();
    });
    public subscribe = (callback: () => void) => {
        return this.bus.on('update', callback);
    };
    public backup = (): NodeValue => ({
        text: this.value.text,
        prefix: this.value.prefix,
        children: [...this.value.children],
        type: this.value.type,
    });
    public restore = (value: NodeValue) => {
        this.value.text = value.text;
        this.value.prefix = value.prefix;
        this.value.children = [...value.children];
        this.value.type = value.type;
    };
};

export type PosEmitter = Emitter<{
    srcpos: [from: number, to: number],
    txtpos: [at: number],
    ruleIn: [],
    ruleOut: [],
}>

type DebugH = (node: NodeModel, p: PosEmitter) => Generator<void, void, void>
export const trace: Trace1<DebugH> = {
    step: function* () {
        yield;
    },

    pos: (from, to, child) => function* (node, p) {
        p.emit('srcpos', from, to);
        return yield* child(node, p);
    },
    dig: (name, child) => function* (node, p) {
        p.emit('ruleIn');
        const res = yield* child(node, p);
        p.emit('ruleOut');
        return res;
    },

    consume: (pos, child) => function* (node, p) {
        p.emit('txtpos', pos);
        return yield* child(node, p);
    },
    rollback: (pos, child) => function* (node, p) {
        p.emit('txtpos', pos);
        return yield* child(node, p);
    },

    string: (v, child) => function* (node, p) {
        const dummy = new NodeModel();
        yield* child(dummy, p);
        node.setText(JSON.stringify(v));
        node.setType('string');
    },
    undefined: (child) => function* (node, p) {
        const dummy = new NodeModel();
        yield* child(dummy, p);
        node.setText('null');
        node.setType('undefined');
    },
    array: (good, bad) => function* (node, p) {
        node.setText('[]');
        node.setType('array');
        for (const [i, g] of good.entries()) {
            const child = new NodeModel();
            node.push(child);
            yield* g(child, p);
        }
        const child = new NodeModel();
        node.push(child);
        yield* bad(child, p);
        node.pop();
    },
    named: (name, child) => function* (node, p) {
        node.setText(name);
        node.setType('object');
        // const type = new NodeModel();
        // type.setPrefix('type');
        // type.setType('string');
        // type.setText(JSON.stringify(name));
        // node.push(type);
        yield* child(node, p);
    },
    object: (names, all) => function* (node, p) {
        const children: (() => Generator<void, void, void>)[] = [];
        for (const [i, child] of all.entries()) {
            const name = names[i];
            const ch = new NodeModel();
            if (name) {
                node.push(ch);
                ch.setPrefix(name);
            }
            children.push(() => child(ch, p));
        }
        for (const child of children) {
            yield* child();
        }
    },
    sels: (all) => function* (node, p) {
        const b = node.backup();
        for (const g of all) {
            node.restore(b);
            yield* g(node, p);
        }
    },
};

type Debugger<T> = (ctx: Context<T>) => [boolean, T]

export const debugger3 = <T,>(t: Trace1<T>): Prims<Debugger<T>> & Grammar<Debugger<T>, [string, Debugger<T>]> => ({
    string: (value) => {
        const l = value.length;
        return c => {
            const v = c.s.substr(c.p, l);
            if (c.p < c.l && v === value) {
                c.p += l;
                return [true, t.string(value, t.consume(c.p, t.step))];
            } else {
                return [false, t.step];
            }
        };
    },
    klass: (value) => {
        const r = new RegExp(`[${value}]`);
        return c => {
            const x = c.s[c.p];
            if (c.p < c.l && x.match(r)) {
                ++c.p;
                return [true, t.string(x, t.consume(c.p, t.step))];
            } else {
                return [false, t.step];
            }
        };
    },
    stringy: (child) => c => {
        const pos = c.p;
        const [res, trace] = child(c);
        return res
            ? [true, t.string(c.s.substring(pos, c.p), trace)]
            : [false, trace];
    },
    maybe: (child) => c => {
        const pos = c.p;
        const [res, trace] = child(c);
        if (!res) {
            c.p = pos;
            return [true, t.undefined(t.rollback(c.p, trace))];
        }
        return [true, trace];
    },
    some: (child) => c => {
        const parts: T[] = [];
        for (;;) {
            const pos = c.p;
            const [res, trace] = child(c);
            if (!res) {
                c.p = pos;
                return [true, t.array(parts, t.rollback(c.p, trace))];
            }
            parts.push(trace);
        }
    },
    many: (child) => c => {
        const parts: T[] = [];
        for (;;) {
            const pos = c.p;
            const [res, trace] = child(c);
            if (!res) {
                c.p = pos;
                return [
                    parts.length !== 0, 
                    t.array(parts, t.rollback(c.p, trace)),
                ];
            }
            parts.push(trace);
        }
    },
    call: (name) => c => {
        return c.resolve(name)(c);
    },
    seqs: (children) => c => {
        const parts: T[] = [];
        const names = children.map(x => x[0]);
        for (const [, child] of children) {
            const [res, trace] = child(c);
            parts.push(trace);
            if (!res) return [false, t.object(names, parts)];
        }
        return [true, t.object(names, parts)];
    },
    sels: (children) => c => {
        const pos = c.p;
        const parts: T[] = [];
        for (const child of children) {
            const [r1, t1] = child(c);
            parts.push(t.rollback(c.p, t1));
            if (r1) return [true, t.sels(parts)];
            c.p = pos;
        }
        return [false, t.sels(parts)]
    },
    tagged: (name, child) => [name, c => {
        const [res, trace] = child(c);
        return [res, t.dig(name, t.named(name, trace))];
    }],
    untagged: (name, child) => [name, c => {
        const [res, trace] = child(c);
        return [res, t.dig(name, trace)];
    }],
    pos: (from, to, child) => c => {
        const [res, trace] = child(c);
        return [res, t.pos(from, to, trace)]
    },
});

export const debug3 = <T,>(inter: [string, Debugger<T>][]) => {
    const obj = Object.fromEntries(inter.map(([k, v]) => [toImproperCase(k), v]));
    const resolve = (name: string) => {
        if (!(name in obj)) {
            console.log(name);
            throw new Error('Unresolved dependency');
        }
        return obj[name];
    };
    const result: Record<string, (text: string) => [boolean, T]> = {};
    inter.forEach(([name, deb]) => result[name] = (text: string) => {
        const c: Context<T> = {
            s: text,
            p: 0,
            l: text.length,
            sp: [0, 0],
            resolve,
        };
        const [res, trace] = deb(c);
        return [res, trace]; //  && c.p !== c.l
    });
    return result;
};