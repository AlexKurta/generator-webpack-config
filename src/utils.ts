import Project, { FunctionDeclaration, FunctionExpression, ObjectLiteralExpression, PropertyAssignment, ArrayLiteralExpression, CodeBlockWriter, Expression, PropertyAssignmentStructure } from "ts-simple-ast";
import * as os from 'os';

export function getNestedPropertyValue<T extends Expression>(obj: ObjectLiteralExpression, path: string[]): T {
    let curObj = obj as Expression;
    for (const part of path) {
        const prop = (curObj as ObjectLiteralExpression).getPropertyOrThrow(part) as PropertyAssignment;
        curObj = prop.getInitializer()!;
    }
    return curObj as T;
}

const isLiteralSymbol = Symbol();

export interface Literal {
    readonly [isLiteralSymbol]: true
    readonly text: string;
}

export function isLiteralExpr(literal: any): literal is Literal {
    return literal && literal[isLiteralSymbol];
}

export function objectToText(obj: any, writer: CodeBlockWriter) {
    try {
        if (isLiteralExpr(obj)) {
            writer.write(obj.text);
        } else if (obj instanceof RegExp) {
            writer.write(`/${obj.source}/${obj.flags}`);
        } else if (obj === null) {
            writer.write('null')
        } else if (typeof obj === 'object') {
            if (Array.isArray(obj)) {

                writer.write('[' + os.EOL);
                const lvl = writer.getIndentationLevel();
                writer.setIndentationLevel(lvl + 1);
                obj.forEach((el, i) => {
                    objectToText(el, writer);
                    if (i < obj.length - 1)
                        writer.write(',' + os.EOL);
                    else
                        writer.newLine();
                });
                writer.setIndentationLevel(lvl);
                writer.write(']')

            } else {

                writer.write(`{` + os.EOL);
                const lvl = writer.getIndentationLevel();
                writer.setIndentationLevel(lvl + 1);
                const keys = Object.keys(obj);

                keys.forEach((key, i) => {
                    writer.write(`${key}: `);
                    objectToText(obj[key], writer);
                    if (i < keys.length - 1)
                        writer.write(',' + os.EOL);
                    else
                        writer.newLine();

                });
                writer.setIndentationLevel(lvl);
                writer.write(`}`);
            }
        } else if (typeof obj === 'undefined') {
            writer.write('undefined')
        } else
            writer.write(JSON.stringify(obj));
    } catch (e) {
        console.error('objectToText error', obj);
        throw e;
    }
}

interface InsertArrayOptions {
    noReturns?: boolean;
}

export function insertToArray(index: number, array: ArrayLiteralExpression, elements: any[], options: InsertArrayOptions = {}) {
    array.insertElements(index, writer => {
        !options.noReturns && writer.write(os.EOL);
        elements.forEach((e, i) => {
            objectToText(e, writer);
            if (i < elements.length - 1) {
                writer.write(',');
                !options.noReturns && writer.write(os.EOL);
            }
        })
    })
}

export function addToArray(array: ArrayLiteralExpression, elements: any[], options: InsertArrayOptions = {}) {
    insertToArray(array.compilerNode.elements.length, array, elements, options);
}

export function write(...str: any[]): Literal {
    const writer = new CodeBlockWriter();
    for (const s of str) {
        objectToText(s, writer)
    }
    return L(writer.toString());
}

export function insertToObject(index: number, obj: ObjectLiteralExpression, addObj: { [key: string]: any }) {
    obj.insertPropertyAssignments(index, Object.keys(addObj).map((key, i) => {
        return {
            name: key,
            initializer: writer => objectToText(addObj[key], writer)
        } as PropertyAssignmentStructure;
    }))
}

export function addToObject(obj: ObjectLiteralExpression, addObj: { [key: string]: any }) {
    insertToObject(obj.compilerNode.properties.length, obj, addObj)
}

export function L(str: string): Literal {
    return {
        [isLiteralSymbol]: true,
        text: str
    }
}

export function and(varName: string, expr: any): Literal {
    const writer = new CodeBlockWriter();
    objectToText(expr, writer);

    return L(`${varName} && ${writer.toString()}`)
}

export function ternary(varName: string, expr1: any, expr2: any): Literal {
    const writer = new CodeBlockWriter();
    objectToText(expr1, writer);

    const writer2 = new CodeBlockWriter();
    objectToText(expr2, writer2);

    return L(`${varName} ? ${writer.toString()} : ${writer2.toString()}`)
}