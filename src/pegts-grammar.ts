import * as m from "./grammar-runtime";
import * as f from "./ft";
import * as l from "./lodash";
export interface Grammar {
  type: "Grammar";
  rules: Rule[];
  $from: number;
  $to: number;
}
export type Rule = Union | Sequence;
export interface Union {
  type: "Union";
  name: Ident;
  cases: Kase[];
  $from: number;
  $to: number;
}
export interface Kase {
  type: "Kase";
  kase: Ident;
  $from: number;
  $to: number;
}
export interface Sequence {
  type: "Sequence";
  name: Ident;
  terms: Part[];
  $from: number;
  $to: number;
}
export interface Part {
  type: "Part";
  field: l.Maybe<Field>;
  stringy: l.Maybe<string>;
  term: Term;
  suffix: l.Maybe<Suffix>;
  $from: number;
  $to: number;
}
export interface Field {
  type: "Field";
  name: Ident;
  $from: number;
  $to: number;
}
export interface Suffix {
  type: "Suffix";
  suffix: string;
  $from: number;
  $to: number;
}
export type Term = Ref | Klass | String1 | String2;
export interface Ref {
  type: "Ref";
  name: Ident;
  $from: number;
  $to: number;
}
export interface Klass {
  type: "Klass";
  inverted: l.Maybe<Inverted>;
  parts: ClassPart[];
  $from: number;
  $to: number;
}
export interface Inverted {
  type: "Inverted";
  $from: number;
  $to: number;
}
export type ClassPart = Range | Single;
export interface Range {
  type: "Range";
  from: ClassChar;
  to: ClassChar;
  $from: number;
  $to: number;
}
export interface Single {
  type: "Single";
  char: ClassChar;
  $from: number;
  $to: number;
}
export type ClassChar = ClassCharEscape | ClassCharSimple;
export interface ClassCharSimple {
  type: "ClassCharSimple";
  char: string;
  $from: number;
  $to: number;
}
export interface ClassCharEscape {
  type: "ClassCharEscape";
  char: string;
  $from: number;
  $to: number;
}
export interface String1 {
  type: "String1";
  chars: String1Char[];
  $from: number;
  $to: number;
}
export type String1Char = String1CharEscape | String1CharSimple;
export interface String1CharSimple {
  type: "String1CharSimple";
  char: string;
  $from: number;
  $to: number;
}
export interface String1CharEscape {
  type: "String1CharEscape";
  char: string;
  $from: number;
  $to: number;
}
export interface String2 {
  type: "String2";
  chars: String2Char[];
  $from: number;
  $to: number;
}
export type String2Char = String2CharEscape | String2CharSimple;
export interface String2CharSimple {
  type: "String2CharSimple";
  char: string;
  $from: number;
  $to: number;
}
export interface String2CharEscape {
  type: "String2CharEscape";
  char: string;
  $from: number;
  $to: number;
}
export interface Ident {
  type: "Ident";
  name: string;
  $from: number;
  $to: number;
}
export interface IdentName {
  type: "IdentName";
  $from: number;
  $to: number;
}
export interface _ {
  type: "_";
  $from: number;
  $to: number;
}
export const Grammar = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Grammar> => f.tagged("Grammar", f.seq1(f.seq0(f.one, f.pos(10, 12, f.call("_", () => _(f)))), "rules", f.many(f.pos(12, 23, f.call("Rule", () => Rule(f)))))));
export const Rule = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Rule> => f.untagged("Rule", f.sel(f.sel(f.zero, f.pos(32, 38, f.call("Union", () => Union(f)))), f.pos(38, 46, f.call("Sequence", () => Sequence(f))))));
export const Union = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Union> => f.tagged("Union", f.seq0(f.seq0(f.seq1(f.seq0(f.seq0(f.seq1(f.one, "name", f.pos(56, 67, f.call("Ident", () => Ident(f)))), f.pos(67, 71, f.string(":"))), f.pos(71, 73, f.call("_", () => _(f)))), "cases", f.many(f.pos(73, 85, f.call("Kase", () => Kase(f))))), f.pos(85, 89, f.string(";"))), f.pos(89, 90, f.call("_", () => _(f))))));
export const Kase = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Kase> => f.tagged("Kase", f.seq1(f.one, "kase", f.pos(99, 109, f.call("Ident", () => Ident(f))))));
export const Sequence = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Sequence> => f.tagged("Sequence", f.seq0(f.seq0(f.seq1(f.seq0(f.seq0(f.seq1(f.one, "name", f.pos(122, 133, f.call("Ident", () => Ident(f)))), f.pos(133, 137, f.string("="))), f.pos(137, 139, f.call("_", () => _(f)))), "terms", f.many(f.pos(139, 151, f.call("Part", () => Part(f))))), f.pos(151, 155, f.string(";"))), f.pos(155, 156, f.call("_", () => _(f))))));
export const Part = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Part> => f.tagged("Part", f.seq1(f.seq1(f.seq1(f.seq1(f.one, "field", f.maybe(f.pos(165, 178, f.call("Field", () => Field(f))))), "stringy", f.pos(178, 191, f.maybe(f.string("$")))), "term", f.pos(191, 201, f.call("Term", () => Term(f)))), "suffix", f.maybe(f.pos(201, 215, f.call("Suffix", () => Suffix(f)))))));
export const Field = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Field> => f.tagged("Field", f.seq0(f.seq1(f.one, "name", f.pos(225, 236, f.call("Ident", () => Ident(f)))), f.pos(236, 239, f.string(":")))));
export const Suffix = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Suffix> => f.tagged("Suffix", f.seq0(f.seq1(f.one, "suffix", f.pos(250, 263, f.klass("+*?"))), f.pos(263, 264, f.call("_", () => _(f))))));
export const Term = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Term> => f.untagged("Term", f.sel(f.sel(f.sel(f.sel(f.zero, f.pos(273, 277, f.call("Ref", () => Ref(f)))), f.pos(277, 283, f.call("Klass", () => Klass(f)))), f.pos(283, 291, f.call("String1", () => String1(f)))), f.pos(291, 298, f.call("String2", () => String2(f))))));
export const Ref = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Ref> => f.tagged("Ref", f.seq1(f.one, "name", f.pos(306, 316, f.call("Ident", () => Ident(f))))));
export const Klass = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Klass> => f.tagged("Klass", f.seq0(f.seq0(f.seq1(f.seq1(f.seq0(f.one, f.pos(326, 330, f.string("["))), "inverted", f.maybe(f.pos(330, 349, f.call("Inverted", () => Inverted(f))))), "parts", f.some(f.pos(349, 366, f.call("ClassPart", () => ClassPart(f))))), f.pos(366, 370, f.string("]"))), f.pos(370, 371, f.call("_", () => _(f))))));
export const Inverted = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Inverted> => f.tagged("Inverted", f.seq0(f.one, f.pos(384, 387, f.string("^")))));
export const ClassPart = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, ClassPart> => f.untagged("ClassPart", f.sel(f.sel(f.zero, f.pos(401, 407, f.call("Range", () => Range(f)))), f.pos(407, 413, f.call("Single", () => Single(f))))));
export const Range = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Range> => f.tagged("Range", f.seq1(f.seq0(f.seq1(f.one, "from", f.pos(423, 438, f.call("ClassChar", () => ClassChar(f)))), f.pos(438, 442, f.string("-"))), "to", f.pos(442, 454, f.call("ClassChar", () => ClassChar(f))))));
export const Single = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Single> => f.tagged("Single", f.seq1(f.one, "char", f.pos(465, 479, f.call("ClassChar", () => ClassChar(f))))));
export const ClassChar = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, ClassChar> => f.untagged("ClassChar", f.sel(f.sel(f.zero, f.pos(493, 509, f.call("ClassCharEscape", () => ClassCharEscape(f)))), f.pos(509, 524, f.call("ClassCharSimple", () => ClassCharSimple(f))))));
export const ClassCharSimple = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, ClassCharSimple> => f.tagged("ClassCharSimple", f.seq1(f.one, "char", f.pos(544, 558, f.klass("^\\\\\\[\\]")))));
export const ClassCharEscape = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, ClassCharEscape> => f.tagged("ClassCharEscape", f.seq1(f.seq0(f.one, f.pos(578, 583, f.string("\\"))), "char", f.pos(583, 599, f.klass("\\\\\\[\\]rnt")))));
export const String1 = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, String1> => f.tagged("String1", f.seq0(f.seq0(f.seq1(f.seq0(f.one, f.pos(611, 615, f.string("'"))), "chars", f.some(f.pos(615, 634, f.call("String1Char", () => String1Char(f))))), f.pos(634, 638, f.string("'"))), f.pos(638, 639, f.call("_", () => _(f))))));
export const String1Char = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, String1Char> => f.untagged("String1Char", f.sel(f.sel(f.zero, f.pos(655, 673, f.call("String1CharEscape", () => String1CharEscape(f)))), f.pos(673, 690, f.call("String1CharSimple", () => String1CharSimple(f))))));
export const String1CharSimple = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, String1CharSimple> => f.tagged("String1CharSimple", f.seq1(f.one, "char", f.pos(712, 729, f.klass("^'\\\\\\r\\n\\t")))));
export const String1CharEscape = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, String1CharEscape> => f.tagged("String1CharEscape", f.seq1(f.seq0(f.one, f.pos(751, 756, f.string("\\"))), "char", f.pos(756, 769, f.klass("'\\\\rnt")))));
export const String2 = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, String2> => f.tagged("String2", f.seq0(f.seq0(f.seq1(f.seq0(f.one, f.pos(781, 785, f.string("\""))), "chars", f.some(f.pos(785, 804, f.call("String2Char", () => String2Char(f))))), f.pos(804, 808, f.string("\""))), f.pos(808, 809, f.call("_", () => _(f))))));
export const String2Char = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, String2Char> => f.untagged("String2Char", f.sel(f.sel(f.zero, f.pos(825, 843, f.call("String2CharEscape", () => String2CharEscape(f)))), f.pos(843, 860, f.call("String2CharSimple", () => String2CharSimple(f))))));
export const String2CharSimple = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, String2CharSimple> => f.tagged("String2CharSimple", f.seq1(f.one, "char", f.pos(882, 899, f.klass("^\"\\\\\\r\\n\\t")))));
export const String2CharEscape = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, String2CharEscape> => f.tagged("String2CharEscape", f.seq1(f.seq0(f.one, f.pos(921, 926, f.string("\\"))), "char", f.pos(926, 939, f.klass("\"\\\\rnt")))));
export const Ident = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, Ident> => f.tagged("Ident", f.seq0(f.seq1(f.one, "name", f.stringy(f.pos(949, 965, f.call("IdentName", () => IdentName(f))))), f.pos(965, 966, f.call("_", () => _(f))))));
export const IdentName = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, IdentName> => f.tagged("IdentName", f.seq0(f.seq0(f.one, f.pos(980, 990, f.klass("a-zA-Z_"))), f.pos(990, 1003, f.some(f.klass("a-zA-Z0-9_"))))));
export const _ = l.memo(<T extends f.TypeTag, G extends f.TypeTag>(f: m.Grammar1<T, G>): f.Apply<G, _> => f.tagged("_", f.seq0(f.one, f.pos(1009, 1019, f.some(f.klass(" \\t\\r\\n"))))));
