export type Token = {
  value: string;
  start: number;
  end: number;
  quoted: boolean;
};
class Lexer {
  private position = 0;
  private readonly tokens: Token[] = [];
  constructor(private readonly source: string) {}
  read() {
    while (this.position < this.source.length) {
      if (this.skipTrivia()) continue;
      this.readToken();
      if (this.tokens.length > 200000)
        throw new Error("Schema token limit exceeded");
    }
    return this.tokens;
  }
  private skipTrivia() {
    const current = this.source[this.position];
    if (/\s/.test(current)) {
      this.position++;
      return true;
    }
    if (
      this.source.startsWith("--", this.position) ||
      this.source.startsWith("//", this.position)
    ) {
      const end = this.source.indexOf("\n", this.position);
      this.position = end < 0 ? this.source.length : end;
      return true;
    }
    if (this.source.startsWith("/*", this.position)) {
      this.skipComment();
      return true;
    }
    return false;
  }
  private skipComment() {
    this.position += 2;
    let depth = 1;
    while (this.position < this.source.length && depth > 0) {
      if (this.source.startsWith("/*", this.position)) {
        depth++;
        this.position += 2;
      } else if (this.source.startsWith("*/", this.position)) {
        depth--;
        this.position += 2;
      } else this.position++;
      if (depth > 64) throw new Error("Comment nesting limit exceeded");
    }
    if (depth) throw new Error("Unterminated comment");
  }
  private readToken() {
    const start = this.position;
    const quote = this.source[start];
    const dollar = /^\$[a-zA-Z_0-9]*\$/.exec(this.source.slice(start));
    if (dollar) {
      this.readDollar(start, dollar[0]);
      return;
    }
    if (["'", '"', "`"].includes(quote)) {
      this.readQuoted(start, quote);
      return;
    }
    if (/[\w$]/.test(quote)) {
      while (
        this.position < this.source.length &&
        /[\w$]/.test(this.source[this.position])
      )
        this.position++;
    } else this.position++;
    this.tokens.push({
      value: this.source.slice(start, this.position),
      start,
      end: this.position,
      quoted: false,
    });
  }
  private readDollar(start: number, marker: string) {
    const end = this.source.indexOf(marker, start + marker.length);
    if (end < 0) throw new Error("Unterminated dollar quote");
    this.position = end + marker.length;
    this.tokens.push({
      value: this.source.slice(start + marker.length, end),
      start,
      end: this.position,
      quoted: true,
    });
  }
  private readQuoted(start: number, quote: string) {
    this.position++;
    let value = "";
    while (this.position < this.source.length) {
      const char = this.source[this.position++];
      if (char === quote) {
        if (this.source[this.position] !== quote) {
          this.tokens.push({ value, start, end: this.position, quoted: true });
          return;
        }
        value += quote;
        this.position++;
      } else if (char === "\\" && this.position < this.source.length)
        value += this.source[this.position++];
      else value += char;
    }
    throw new Error("Unterminated quoted token");
  }
}
export const tokenize = (source: string) => new Lexer(source).read();
export const is = (token: Token | undefined, value: string) =>
  !token?.quoted && token?.value.toUpperCase() === value.toUpperCase();
export function matching(
  tokens: Token[],
  start: number,
  open = "(",
  close = ")",
) {
  let depth = 0;
  for (let i = start; i < tokens.length; i++) {
    if (!tokens[i].quoted && tokens[i].value === open) depth++;
    if (!tokens[i].quoted && tokens[i].value === close && --depth === 0)
      return i;
  }
  throw new Error("Unbalanced schema declaration");
}
export function split(tokens: Token[], separator = ","): Token[][] {
  const output: Token[][] = [];
  let current: Token[] = [];
  let depth = 0;
  for (const token of tokens) {
    if (!token.quoted && ["(", "[", "{"].includes(token.value)) depth++;
    if (!token.quoted && [")", "]", "}"].includes(token.value)) depth--;
    if (!token.quoted && token.value === separator && depth === 0) {
      if (current.length) output.push(current);
      current = [];
    } else current.push(token);
  }
  if (current.length) output.push(current);
  return output;
}
export function qualified(tokens: Token[], start: number) {
  if (!tokens[start]) throw new Error("Missing schema identifier");
  if (tokens[start + 1]?.value === ".")
    return {
      namespace: tokens[start].value,
      name: tokens[start + 2]?.value ?? "",
      next: start + 3,
    };
  return { namespace: "public", name: tokens[start].value, next: start + 1 };
}
export const names = (tokens: Token[]) =>
  split(tokens)
    .map((part) => part[0]?.value ?? "")
    .filter(Boolean);
