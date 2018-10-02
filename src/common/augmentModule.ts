import { Prompt } from "./prompt";
import * as Generator from 'yeoman-generator';
import Project, { ImportDeclarationStructure, VariableStatementStructure, FunctionExpression, ObjectLiteralExpression, ArrayLiteralExpression, VariableDeclarationKind, VariableDeclarationStructure } from "ts-simple-ast";
import { getNestedPropertyValue, addToArray, addToObject } from "../utils";
import { Context } from "vm";
import { ParsedSource } from "./sourceFile";

export abstract class AugmentModule {
    protected readonly isDev = 'isDev';
    private static statements: VariableDeclarationStructure[] = [];

    constructor(protected readonly config: Config, protected readonly options: Options, protected readonly gen: Generator, private parsed: ParsedSource) {
    }

    abstract augment(): void;

    protected addToConfigObject(addObj: { [key: string]: any }) {
        addToObject(this.parsed.config, addObj);
    }

    protected addRules(...elements: any[]) {
        addToArray(this.parsed.rules, ...elements);
    }

    protected addPlugins(...elements: any[]) {
        addToArray(this.parsed.plugins, ...elements);
    }

    protected addResolveExtensions(...elements: any[]) {
        addToArray(this.parsed.resolveExtensions, ...elements);
    }

    protected insertVariableStatement(statements: VariableDeclarationStructure[]) {
        AugmentModule.statements.push(...statements);
    }

    protected addImportDeclaration(decl: ImportDeclarationStructure) {
        this.parsed.sourceFile.addImportDeclaration(decl);
    }

    static onGeneratorEnd(parsed: ParsedSource) {
        parsed.mainFunc.insertVariableStatement(
            0,
            {
                declarationKind: VariableDeclarationKind.Const,
                declarations: AugmentModule.statements
            }
        );

        // needed because yeoman-test reuses this program instance in tests
        AugmentModule.statements.length = 0;
    }
}

export interface AugmentModuleConstructor {
    new(config: Config, options: Options, gen: Generator, parsed: ParsedSource): AugmentModule;
}

export interface Extension {
    prompts?(): Prompt<keyof Config>[];
    AugmentModule: AugmentModuleConstructor;
}
