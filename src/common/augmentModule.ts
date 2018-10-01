import { Prompt } from "./prompt";
import * as Generator from 'yeoman-generator';
import Project, { ImportDeclarationStructure, VariableStatementStructure, FunctionExpression, ObjectLiteralExpression, ArrayLiteralExpression } from "ts-simple-ast";
import { getNestedPropertyValue, addToArray, addToObject } from "../utils";
import { Context } from "vm";
import { ParsedSource } from "./sourceFile";

export abstract class AugmentModule {
    constructor(protected readonly config: Config, protected readonly options: Options, protected readonly gen: Generator, private parsed: ParsedSource) {
    }
    executeIf(config: Config): boolean { }
    prompts(): Prompt<keyof Config>[] { };
    abstract augment(): void;
    protected addToConfigObject(addObj: { [key: string]: any }) {
        addToObject(this.parsed.config, addObj);
    }// todo throw new Error() impl
    protected addRules(...elements: any[]) {
        addToArray(this.parsed.rules, ...elements);
    }
    protected addPlugins(...elements: any[]) {
        addToArray(this.parsed.plugins, ...elements);
    }
    protected addResolveExtensions(...elements: any[]) {
        addToArray(this.parsed.resolveExtensions, ...elements);
    }
    protected insertVariableStatement(variableStatement: VariableStatementStructure) {
        throw new Error();
    }
    protected addImportDeclaration(decl: ImportDeclarationStructure) {
        this.parsed.sourceFile.addImportDeclaration(decl);
    }
    protected readonly isDev = 'isDev';
}