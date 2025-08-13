// This module will extract functions/classes from JS/TS code using @babel/parser and generate JSDoc comments.
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generatorModule from '@babel/generator';
// @ts-expect-error Babel ESM interop
const traverse = traverseModule.default;
// @ts-expect-error Babel ESM interop
const generate = generatorModule.default;

export interface ParamInfo {
    name: string;
    type?: string;
    defaultValue?: string;
}

export interface ExtractedFunction {
    name: string;
    params: ParamInfo[];
    returnType?: string;
    start: number;
    end: number;
    isClassMethod?: boolean;
    isArrowFunction?: boolean;
    isAsync?: boolean;
    calls?: string[];
    summary?: string;
}

export function extractFunctionsAndClasses(code: string): ExtractedFunction[] {
    const ast = parse(code, {
        sourceType: 'unambiguous',
        plugins: ['typescript', 'jsx'],
    });
    const results: ExtractedFunction[] = [];
    
    function getParamInfo(p: any): ParamInfo {
        // Identifier
        if (p.type === 'Identifier') {
            const name = p.name;
            const type = p.typeAnnotation ? generate(p.typeAnnotation.typeAnnotation).code : undefined;
            return { name, type };
        }
        // AssignmentPattern (param with default)
        if (p.type === 'AssignmentPattern') {
            const left = p.left;
            const right = p.right;
            if (left.type === 'Identifier') {
                const name = left.name;
                const type = left.typeAnnotation ? generate(left.typeAnnotation.typeAnnotation).code : undefined;
                const defaultValue = generate(right).code;
                return { name, type, defaultValue };
            }
        }
        // Object / Array patterns
        if (p.type === 'ObjectPattern') {
            return { name: '{...}', type: undefined };
        }
        if (p.type === 'ArrayPattern') {
            return { name: '[...]', type: undefined };
        }
        // Rest element
        if (p.type === 'RestElement') {
            if (p.argument.type === 'Identifier') {
                return { name: '...' + p.argument.name, type: undefined };
            }
            return { name: '...args', type: undefined };
        }
        // Fallback to generated code
        return { name: generate(p).code };
    }

    function inferReturnType(node: any): string | undefined {
        if (node.returnType) {
            try {
                return generate(node.returnType.typeAnnotation).code;
            } catch {}
        }
        return undefined;
    }

    function collectCalls(fnPath: any): string[] {
        const calls = new Set<string>();
        fnPath.traverse({
            CallExpression(inner: any) {
                const callee = inner.node.callee;
                if (callee.type === 'Identifier') {
                    calls.add(callee.name);
                } else if (callee.type === 'MemberExpression') {
                    // e.g., console.log -> console.log
                    const object = callee.object;
                    const property = callee.property;
                    let name = '';
                    if (object.type === 'Identifier') name += object.name;
                    else if (object.type === 'ThisExpression') name += 'this';
                    else name += 'obj';
                    name += '.';
                    if (property.type === 'Identifier') name += property.name;
                    else name += 'call';
                    calls.add(name);
                }
            },
        });
        return Array.from(calls).slice(0, 8);
    }

    function wordsFromCamel(name: string): string[] {
        return name
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .split(' ')
            .filter(Boolean);
    }

    function deriveSummary(name: string, isAsync: boolean | undefined, calls: string[]): string {
        const words = wordsFromCamel(name);
        const lower = words.map(w => w.toLowerCase());
        const startsWith = lower[0] || '';
        const isNetwork = calls.some(c => c.startsWith('fetch') || c.startsWith('axios') || c.includes('http'));
        const asyncPrefix = isAsync || isNetwork ? 'Asynchronously ' : '';
        const verbMap: Record<string, string> = {
            get: 'gets',
            set: 'sets',
            compute: 'computes',
            calculate: 'calculates',
            fetch: 'fetches',
            load: 'loads',
            render: 'renders',
            handle: 'handles',
            parse: 'parses',
            format: 'formats',
            validate: 'validates',
            transform: 'transforms',
            build: 'builds',
            update: 'updates',
            create: 'creates',
        };
        let rest = words.slice(1).join(' ');
        if (!rest) rest = words.join(' ');
        const verb = verbMap[startsWith] || 'performs';
        return `${asyncPrefix}${verb} ${rest}`.trim();
    }

    traverse(ast, {
        FunctionDeclaration(path: any) {
            const name = path.node.id?.name || 'anonymous';
            const params = path.node.params.map((p: any) => getParamInfo(p));
            const returnType = inferReturnType(path.node);
            const isAsync = !!path.node.async;
            const calls = collectCalls(path);
            const summary = deriveSummary(name, isAsync, calls);
            results.push({
                name,
                params,
                returnType,
                start: path.node.start || 0,
                end: path.node.end || 0,
                isAsync,
                calls,
                summary,
            });
        },
        ClassMethod(path: any) {
            const name = path.node.key.type === 'Identifier' ? path.node.key.name : 'anonymous';
            const params = path.node.params.map((p: any) => getParamInfo(p));
            const returnType = inferReturnType(path.node);
            const isAsync = !!path.node.async;
            const calls = collectCalls(path);
            const summary = deriveSummary(name, isAsync, calls);
            results.push({
                name,
                params,
                returnType,
                start: path.node.start || 0,
                end: path.node.end || 0,
                isClassMethod: true,
                isAsync,
                calls,
                summary,
            });
        },
        ArrowFunctionExpression(path: any) {
            // Only top-level assignments (not inline)
            if (path.parent.type === 'VariableDeclarator' && path.parent.id.type === 'Identifier') {
                const name = path.parent.id.name;
                const params = path.node.params.map((p: any) => getParamInfo(p));
                const returnType = inferReturnType(path.node);
                const isAsync = !!path.node.async;
                const calls = collectCalls(path);
                const summary = deriveSummary(name, isAsync, calls);
                results.push({
                    name,
                    params,
                    returnType,
                    start: path.node.start || 0,
                    end: path.node.end || 0,
                    isArrowFunction: true,
                    isAsync,
                    calls,
                    summary,
                });
            }
        },
    });
    return results;
}

export function generateJSDocComment(fn: ExtractedFunction, fallbackSummary = 'TODO: Add description'): string {
    const summary = fn.summary || fallbackSummary;
    const lines: string[] = [];
    lines.push('/**');
    lines.push(` * ${summary}`);
    if (fn.isAsync) {
        lines.push(' * @async');
    }
    for (const p of fn.params) {
        const name = p.name || 'param';
        const type = p.type ? `{${p.type}} ` : '';
        lines.push(` * @param ${type}${name} - ${name === 'options' || name === 'config' ? 'Configuration options.' : 'TODO: describe.'}`);
    }
    if (fn.returnType) {
        lines.push(` * @returns {${fn.returnType}}`);
    }
    lines.push(' */');
    return lines.join('\n');
}
