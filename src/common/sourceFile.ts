import { Prompt } from "./prompt";
import * as Generator from 'yeoman-generator';
import Project, { ImportDeclarationStructure, VariableStatementStructure, FunctionExpression, ObjectLiteralExpression, ArrayLiteralExpression, SourceFile } from "ts-simple-ast";
import { getNestedPropertyValue } from "../utils";
import { Context } from "vm";

export interface ParsedSource {
    rules: ArrayLiteralExpression;
    plugins: ArrayLiteralExpression;
    resolveExtensions: ArrayLiteralExpression;
    config: ObjectLiteralExpression;
    sourceFile: SourceFile;
}

export function parseFile(file: string): ParsedSource {

    const project = new Project();
    const sourceFile = project.addExistingSourceFile(file);

    const mainFunc = sourceFile.getVariableDeclarationOrThrow('webpackConfigurationFn').getInitializer() as FunctionExpression;
    const config = mainFunc.getVariableDeclarationOrThrow('config').getInitializer() as ObjectLiteralExpression;
    const rules = getNestedPropertyValue<ArrayLiteralExpression>(config, ['module', 'rules'])
    const plugins = mainFunc.getVariableDeclarationOrThrow('plugins').getInitializer() as ArrayLiteralExpression;
    const resolveExtensions = getNestedPropertyValue<ArrayLiteralExpression>(config, ['resolve', 'extensions']);

    return {
        rules,
        plugins,
        resolveExtensions,
        config,
        sourceFile,
    }
}
