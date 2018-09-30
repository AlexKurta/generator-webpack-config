import { ArrayLiteralExpression, SourceFile, VariableStatementStructure, ObjectLiteralExpression } from "ts-simple-ast";

export interface Context {
    installModules: Set<string>;
    config: {
        rules: ArrayLiteralExpression;
        plugins: ArrayLiteralExpression;
    };
    configObject:ObjectLiteralExpression;
    sourceFile: SourceFile;
    isDev: string;
    insertVariableStatement(variableStatement: VariableStatementStructure): void;
}
