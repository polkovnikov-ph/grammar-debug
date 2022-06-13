import './app.css';
import React, { createContext, FC, ReactElement, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Editor from "@monaco-editor/react";
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { interpret, interpreter } from './grammar-interp';
import { collect, debug2, debugger2 } from './grammar-debugger2';
import { compileTop } from './grammar-compile';
import * as g from './pegts-grammar';
import { combine, Emitter, flatten } from './lodash';
import { unstable_batchedUpdates } from 'react-dom';
import { debug3, debugger3, NodeModel, PosEmitter, trace, trace2, TType } from './grammar-debugger3';

const initCode = `grammar = _ rules:rule+;
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
_ = [ \\t\\r\\n]*;`;

type NodeValue2 = {
    text: string,
    prefix: string,
    children: NodeModel2[],
    type: TType,
    lit: boolean,
}
export class NodeModel2 {
    public value: NodeValue2 = {
        text: '...',
        prefix: '',
        children: [],
        type: 'todo',
        lit: false,
    };
    private bus = new Emitter<{
        update: [],
    }>();
    private destroy: undefined | (() => void);
    constructor(id: number, em: TreeEmitter) {
        this.destroy = combine(
            em.on('setText', (at, text) => {
                if (at !== id) return;
                this.value.text = text;
                this.bus.emit('update');
            }),
            em.on('setPrefix', (at, text) => {
                if (at !== id) return;
                this.value.prefix = text;
                this.bus.emit('update');
            }),
            em.on('setType', (at, type) => {
                if (at !== id) return;
                this.value.type = type;
                this.bus.emit('update');
            }),
            em.on('push', (at, ix) => {
                if (at !== id) return;
                this.value.children.push(new NodeModel2(ix, em));
                this.bus.emit('update');
            }),
            em.on('pop', (at) => {
                if (at !== id) return;
                this.value.children.pop()?.destroy?.();
                this.bus.emit('update');
            }),
            em.on('reset', (at) => {
                if (at !== id) return;
                unstable_batchedUpdates(() => {
                    this.value.text = '...';
                    this.value.type = 'todo';
                    this.value.children.map(child => child.destroy?.());
                    this.value.children = [];
                });
                this.bus.emit('update');
            }),
            em.on('hover', (at) => {
                const prev = this.value.lit;
                const next = at.includes(id);
                this.value.lit = next;
                if (prev !== next) {
                    this.bus.emit('update');
                }
            }),
        );
    }
    public subscribe = (callback: () => void) => {
        return this.bus.on('update', callback);
    };
};

const DepthContext = createContext(0);
type NodeProps = {
    node: NodeModel2;
}
const Node: FC<NodeProps> = ({node}) => {
    const depth = useContext(DepthContext);
    const [, update] = useReducer(c => c + 1, 0);
    useEffect(() => node.subscribe(update), [node]);
    const {prefix, text, children, type, lit} = node.value;
    const [isClosed, setClosed] = useState(false);
    const toggleClosed = useCallback(() => setClosed((prev) => !prev), []);
    return (
        <DepthContext.Provider value={depth + 1}>
            <div className={"node" + (lit ? " _lit" : '')}>
                <div className={"node__toggle" + (isClosed ? ' _is-closed' : '')} onClick={toggleClosed}>
                    {children.length > 0 ? '▼' : '·'}
                </div>
                <span className="node__prefix">{prefix ? `${prefix}: ` : ''}</span>
                <span className={"node__text _type_" + type}>{text}</span>
                <div className={"node__children" + (isClosed ? ' _is-closed' : '')}>
                    {children.map((child, i) => (
                        <Node key={i} node={child} />
                    ))}
                </div>
            </div>
        </DepthContext.Provider>
    );
};
type TreeEmitter = Emitter<{
    setText: [at: number, text: string],
    setType: [at: number, ttype: TType],
    setPrefix: [at: number, text: string],
    push: [at: number, ix: number],
    pop: [at: number],
    reset: [at: number],
    hover: [at: number[]],
}>

export const App: FC = () => {
    /*
    TODO:
    - добавить скролл на 3 колонку
    - скрывать пункты 3 колонки при добавлении новых
    - подскролл к текущему меняемому месту в 3 колонке
    - подсветить текущее ... в 3 колонке
    - показывать во 2 колонке, окно будущей проверки, цвет рамки окна -- удачность проверки
    - colorer для 1 колонки руками
    - расширить грамматику на описания цветов, colorer 1 колонки честно и 2 колонки из грамматики
    - добавить остальные фичи из PEG.js
    - добавить параметрические парсеры (string1/string2??)
    - ховер на 3 колонке
    - 1 колонка: step in/step out
    - 2 колонка: until here
    - 3 колонка: step to next ast change
    - ховер по 1 колонке показывает совпавшие места во 2 колонке и ноды в 3
    - ховер по 2 колонке показывает стеки в 1 колонке и ноды в 3
    */
    const [grammar, setGrammar] = useState(initCode);
    const [text, setText] = useState(initCode);

    // https://www.npmjs.com/package/@monaco-editor/react
    const monacoRef = useRef<typeof monaco>();

    const grammarEditorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
    const prevTextDecor = useRef<string[]>([]);
    const handleGrammarMouse = useCallback((offset: number) => {
        const geditor = textEditorRef.current;
        if (!geditor || !monaco) return;
        const gmodel = geditor.getModel();
        if (!gmodel) return;
        const ranges = parsesWhat[offset];
        if (!ranges) return;
        const tranges: monaco.editor.IModelDeltaDecoration[] = [];
        for (const at of ranges.values()) {
            const {lineNumber: lineNumberFrom, column: columnFrom} = gmodel.getPositionAt(at);
            const {lineNumber: lineNumberTo, column: columnTo} = gmodel.getPositionAt(at + 1);
            tranges.push({
                range: new monaco.Range(lineNumberFrom, columnFrom, lineNumberTo, columnTo),
                options: {
                    inlineClassName: 'selection',
                },
            })
        }
        prevTextDecor.current = geditor.deltaDecorations(prevTextDecor.current, tranges);
        // treeEmitter.emit('hover', resultsIn[offset] || []);
    }, []);
    const handleGrammarMouseLeave = useCallback((event: monaco.editor.IPartialEditorMouseEvent) => {
        handleGrammarMouse(-1);
    }, []);
    const handleGrammarMouseMove = useCallback((event: monaco.editor.IEditorMouseEvent) => {
        const {position} = event.target;
        if (!position) return;
        const editor = grammarEditorRef.current;
        if (!editor || !monaco) return;
        const model = editor.getModel();
        if (!model) return;
        const offset = model.getOffsetAt(position);
        handleGrammarMouse(offset);
    }, []);
    const handleGrammarEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, m: typeof monaco) => {
        grammarEditorRef.current = editor;
        monacoRef.current = m;
        editor.onMouseMove(handleGrammarMouseMove);
        editor.onMouseLeave(handleGrammarMouseLeave);
    }, []);
    const handleGrammarChange = useCallback((
        value: string | undefined, 
        _event: monaco.editor.IModelContentChangedEvent,
    ) => setGrammar(value || ''), []);

    const prevGrammarDecor = useRef<string[]>([]);
    const textEditorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
    const handleTextMouse = useCallback((offset: number) => {
        const geditor = grammarEditorRef.current;
        if (!geditor || !monaco) return;
        const gmodel = geditor.getModel();
        if (!gmodel) return;
        const granges: monaco.Range[] = [];
        for (const [from, to] of parsedBy[offset] || []) {
            const {lineNumber: lineNumberFrom, column: columnFrom} = gmodel.getPositionAt(from);
            const {lineNumber: lineNumberTo, column: columnTo} = gmodel.getPositionAt(
                grammar.substring(from, to).trim().length + from,
            );
            granges.push(new monaco.Range(lineNumberFrom, columnFrom, lineNumberTo, columnTo));
        }
        prevGrammarDecor.current = geditor.deltaDecorations(prevGrammarDecor.current, granges.map((range, i) => ({
            range,
            options: {
                inlineClassName: i === granges.length - 1 ? 'selection' : 'selection-weak',
            },
        })));
        treeEmitter.emit('hover', resultsIn[offset] || []);
    }, []);
    const handleTextMouseLeave = useCallback((event: monaco.editor.IPartialEditorMouseEvent) => {
        handleTextMouse(-1);
    }, []);
    const handleTextMouseMove = useCallback((event: monaco.editor.IEditorMouseEvent) => {
        const {position} = event.target;
        if (!position) return;
        const editor = textEditorRef.current;
        if (!editor || !monaco) return;
        const model = editor.getModel();
        if (!model) return;
        const offset = model.getOffsetAt(position);
        handleTextMouse(offset);
    }, []);
    const handleTextEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, m: typeof monaco) => {
        textEditorRef.current = editor;
        monacoRef.current = m;
        editor.onMouseMove(handleTextMouseMove);
        editor.onMouseLeave(handleTextMouseLeave);
    }, []);
    const handleTextChange = useCallback((
        value: string | undefined, 
        _event: monaco.editor.IModelContentChangedEvent,
    ) => setText(value || ''), []);

    // const [node, handleStep, posEmitter] = useMemo(() => {
    //     const ast = interpret(g.Grammar(interpreter), grammar);
    //     const [, v] = debug3(compileTop(debugger3(trace))(ast))['grammar'](text);
    //     const node = new NodeModel();
    //     const p: PosEmitter = new Emitter;
    //     const steps = v(node, p);
    //     return [node, () => steps.next(), p] as const;
    // }, [grammar, text]);

    const [parsedBy] = useState<([number, number][] | null)[]>(() => new Array(text.length).fill(null));
    const [resultsIn] = useState<(number[] | null)[]>(() => new Array(text.length).fill(null));
    const [parsesWhat] = useState<Set<number>[]>(() => new Array(grammar.length).fill(null).map(() => new Set));
    const [node, handleStep, treeEmitter] = useMemo(() => {
        const ast = interpret(g.Grammar(interpreter), grammar);
        let currTxtPos = 0;
        let currSrcPos: [number, number] = [0, 0];
        let currNode: number[] = [];
        const srcPosStack: [number, number][] = [];
        const em: TreeEmitter = new Emitter();
        const steps = (function* () {
            const vv = [...debug3(compileTop(debugger3(trace2))(ast))['grammar'](text)[1](0)];
            // console.log(vv);
            for (const v of vv) {
                switch (v.type) {
                    case 'step':
                        // yield;
                        break;
                    case 'srcpos':
                        currSrcPos = [v.from, v.to];
                        break;
                    case 'ruleIn':
                        srcPosStack.push(currSrcPos);
                        break;
                    case 'ruleOut':
                        srcPosStack.pop();
                        break;
                    case 'consume': {
                        const fullSrcStack: [number, number][] = [...srcPosStack, currSrcPos];
                        fullSrcStack.forEach(([from, to]) => {
                            for (let i = from; i < to; ++i) {
                                for (let j = currTxtPos; j < v.pos; ++j) {
                                    parsesWhat[i].add(j);
                                }
                            }
                        });
                        for (let i = currTxtPos; i < v.pos; ++i) {
                            parsedBy[i] = fullSrcStack;
                            resultsIn[i] = [...currNode];
                        }
                        currTxtPos = v.pos;
                        break;
                    }
                    case 'rollback': {
                        const fullSrcStack: [number, number][] = [...srcPosStack, currSrcPos];
                        fullSrcStack.forEach(([from, to]) => {
                            for (let i = from; i < to; ++i) {
                                for (let j = v.pos; j < currTxtPos; ++j) {
                                    parsesWhat[i].delete(j);
                                }
                            }
                        });
                        for (let i = v.pos; i < currTxtPos; ++i) {
                            parsedBy[i] = null;
                            resultsIn[i] = null;
                        }
                        currTxtPos = v.pos;
                        break;
                    }
                    case 'nodeIn':
                        currNode.push(v.at);
                        break;
                    case 'nodeOut':
                        currNode.pop();
                        break;
                    case "setText":
                        em.emit('setText', v.at, v.text);
                        break;
                    case "setType":
                        em.emit('setType', v.at, v.ttype);
                        break;
                    case "setPrefix":
                        em.emit('setPrefix', v.at, v.text);
                        break;
                    case "push":
                        em.emit('push', v.at, v.ix);
                        break;
                    case "pop":
                        em.emit('pop', v.at);
                        break;
                    case "reset":
                        em.emit('reset', v.at);
                        break;
                }
            }
            console.log(parsesWhat);
        })();
        const node = new NodeModel2(0, em);
        return [node, () => steps.next(), em] as const;
    }, [grammar, text]);

    return (
        <div className="app">
            <div className="header">
                {/* <button onClick={handleDebug}>{isDebugging ? 'Stop' : 'Debug'}</button>
                <pre id="path" style={{ margin: 0 }}>{path}</pre> */}
                <button onClick={handleStep}>Next</button>
            </div>
            <div className="container">
                <div className="column">
                    <Editor
                        defaultLanguage="text"
                        defaultValue={grammar}
                        options={{
                            minimap: {enabled: false},
                        }}
                        theme="vs-dark"
                        onMount={handleGrammarEditorDidMount}
                        onChange={handleGrammarChange}
                    />
                </div>
                <div className="column">
                <Editor
                        defaultLanguage="text"
                        defaultValue={text}
                        options={{
                            minimap: {enabled: false},
                        }}
                        theme="vs-dark"
                        onMount={handleTextEditorDidMount}
                        onChange={handleTextChange}
                    />
                </div>
                <div className="column">
                    <div className="tree">
                        <Node node={node} />
                    </div>
                </div>
            </div>
            <div className="header">
                Test
            </div>
        </div>
    );
}

// .monaco-editor .view-overlays .debug-top-stack-frame-line {
//     background: rgba(255, 255, 0, 0.2);
// }
