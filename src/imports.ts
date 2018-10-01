import { SourceFile } from "ts-simple-ast";

export function getReferencedModules(sourceFile: SourceFile) {
    const installModules = new Set(['webpack', "webpack-cli"]);
    const text = sourceFile.getFullText();

    const importDecl = sourceFile.getImportDeclarations();
    for (const decl of importDecl) {
        installModules.add(decl.getModuleSpecifier().getLiteralText());
    }

    let m: RegExpMatchArray | null;
    for (const re of [/['"]([\w-]+?-loader)['"]/g, /require\(['"]([\w-]+?)['"]\)/g]) {
        do {
            m = re.exec(text);
            if (m) {
                installModules.add(m[1]);
            }
        } while (m);
    }

    // todo read peer deps from package.json
    const npmdeps: { [key: string]: string[] } = {
        'babel-loader': ["@babel/core", "@babel/preset-env"],
        'sass-loader': ['node-sass'],
        'url-loader': ['file-loader'],
        'ts-loader': ['typescript'],
        'typings-for-css-modules-loader': ['css-loader']
    }

    for (const mod of installModules) {
        const deps = npmdeps[mod];
        deps && deps.forEach(d => installModules.add(d));
    }
    return installModules;
}