import { Prompt } from "./prompt";
import * as Generator from 'yeoman-generator';
import Project, { ImportDeclarationStructure, VariableStatementStructure, FunctionExpression, ObjectLiteralExpression, ArrayLiteralExpression, SourceFile, PropertyAccessExpression, ArrowFunction } from "ts-simple-ast";
import { getNestedPropertyValue } from "../utils";

export interface ParsedSource {
    mainFunc: FunctionExpression;
    rules: ArrayLiteralExpression;
    plugins: ArrayLiteralExpression;
    resolveExtensions: ArrayLiteralExpression;
    config: ObjectLiteralExpression;
    sourceFile: SourceFile;
}

export function parseFile(file: string): ParsedSource {

    const project = new Project();
    const sourceFile = project.addExistingSourceFile(file);

    const exportDecl = sourceFile.getExportAssignments()[0];
    const mainFunc = exportDecl.getExpression() as FunctionExpression;

    const config = mainFunc.getVariableDeclarationOrThrow('config').getInitializer() as ObjectLiteralExpression;
    const rules = getNestedPropertyValue<ArrayLiteralExpression>(config, ['module', 'rules']);

    const plugins = getNestedPropertyValue<PropertyAccessExpression>(config, ['plugins']).getExpression().getChildren()[0] as ArrayLiteralExpression;
    const resolveExtensions = getNestedPropertyValue<ArrayLiteralExpression>(config, ['resolve', 'extensions']);
// todo adding to resolve extension array should add not returns
    return {
        mainFunc,
        rules,
        plugins,
        resolveExtensions,
        config,
        sourceFile,
    }
}
