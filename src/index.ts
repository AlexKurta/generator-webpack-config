import * as Generator from 'yeoman-generator';
import Project, { FunctionDeclaration, FunctionExpression, ObjectLiteralExpression, PropertyAssignment, ArrayLiteralExpression, CodeBlockWriter, Expression, PropertyAssignmentStructure } from "ts-simple-ast";
import * as path from 'path';
import * as os from 'os';
import * as typescript from "typescript";
import { Config } from './common/config';
import { Cmds } from './common/cmds';
import * as fs from 'fs-extra';
import * as detectIndent from 'detect-indent';

class GeneratorWebpack extends Generator {
    private get opts() {
        return this.options as Cmds;
    }
    private props?: Config;
    private installModules = new Set(['webpack', "webpack-cli"]);
    private cssdeclfilename = 'cssModules.d.ts';

    constructor(args: string | string[], opts: {}) {
        super(args, opts);

        this.option('stats', { type: String });
        this.option('cssfilename', { type: String });
        this.option('extractcss', { type: Boolean });
        this.option('urlloaderbytes', { type: Number });
        this.option('disableStore', { type: Boolean });
    }

    async prompting() {
        // do not use subobject property notation (e.g. css.modules), because store:true does not work correctly with that
        const questions: any = [
            {
                type: 'list',
                message: 'For what kind of project do you wish to create a webpack configuration?',
                name: 'type',
                choices: [
                    {
                        name: 'Web project',
                        value: 'web'
                    },
                    {
                        name: 'Node project',
                        value: 'node'
                    }
                ]
            },
            // ask input and output stuff:
            {
                type: 'input',
                name: 'entry',
                default: './src/index.js',
                message: 'Path to entry file'
            },
            {
                type: 'confirm',
                name: 'seperate_outdirs',
                default: true,
                message: 'Separate output directories for production and development mode?'
            },
            {
                when: (resp: Config) => {
                    return resp.seperate_outdirs;
                },
                type: 'input',
                name: 'outProd',
                default: path.join('build', 'release'),
                message: '(output) Production directory'
            },
            {
                when: (resp: Config) => {
                    return resp.seperate_outdirs;
                },
                type: 'input',
                name: 'outDev',
                default: path.join('build', 'debug'),
                message: '(output) Development directory'
            },
            {
                when: (resp: Config) => {
                    return !resp.seperate_outdirs;
                },
                type: 'input',
                name: 'outSingle',
                default: 'build',
                message: '(output) Directory'
            },
            {
                type: 'input',
                name: 'outFileName',
                default: '[chunkhash].bundle.js',
                message: '(output) File name'
            },
            // ask typescript stuff:
            {
                type: 'confirm',
                name: 'ts',
                default: false,
                message: 'Enable typescript transpilation?'
            },
            {
                when: (resp: Config) => {
                    return resp.ts;
                },
                filter: (input: string) => {
                    return input.trim() || undefined;
                },
                type: 'input',
                name: 'tsConfig',
                message: '(typescript) Location of tsconfig.json (leave empty for default)'
            },
            // ask css stuff
            {
                when: (resp: Config) => {
                    return resp.type === 'web';
                },
                type: 'confirm',
                name: 'cssModules',
                default: true,
                message: 'Use CSS modules?'
            },
            {
                when: (resp: Config) => {
                    return resp.ts && resp.cssModules;
                },
                type: 'confirm',
                name: 'tsdecl',
                default: true,
                message: `Create TypeScript declaration file for *.css, *.scss and *.sass imports? This is required for working css modules. You will have to make sure your tsconfig.json includes this file in its configuration. It will be named \'${this.cssdeclfilename}\'.`
            },
            // ask index.html stuff for web projects:
            {
                when: (resp: Config) => {
                    return resp.type === 'web';
                },
                type: 'confirm',
                name: 'html',
                default: true,
                message: 'Create html file? Scripts and style sheets will automatically be inserted into this file.'
            },
            {
                when: (resp: Config) => {
                    return resp.html;
                },
                type: 'input',
                name: 'htmlTitle',
                default: 'Webpack App',
                message: '(html) Title'
            },
            {
                when: (resp: Config) => {
                    return resp.html;
                },
                type: 'input',
                name: 'htmlFilename',
                default: 'index.html',
                message: '(html) Output file'
            },
            {
                when: (resp: Config) => {
                    return resp.html;
                },
                filter: (input: string) => {
                    return input.trim() || undefined;
                },
                type: 'input',
                name: 'htmlTemplate',
                message: '(html) Template file (will create a standard html file if not specified)'
            }
        ];
        const storeQuestions = questions.map((q: any) => Object.assign(q, this.opts.disableStore ? {} : { store: true }));
        this.props = <Config>await this.prompt(storeQuestions);
    }

    async writing() {
        const { type, entry, outSingle, outProd, outDev, outFileName, ts, tsConfig, cssModules, tsdecl, html, htmlTitle, htmlFilename, htmlTemplate } = this.props!;

        const project = new Project();

        const sourceFile = project.addExistingSourceFile(path.resolve(__dirname, '..', 'webpack-template', 'webpack.config.ts'));

        const mainFuncDecl = sourceFile.getVariableDeclarationOrThrow('webpackConfigurationFn');
        const mainFunc = mainFuncDecl.getInitializer() as FunctionExpression;
        let statementPos = 0;
        const plugins = mainFunc.getVariableDeclarationOrThrow('plugins').getInitializer() as ArrayLiteralExpression;
        const outDir = 'outDir';

        const isDev = 'isDev';

        sourceFile.addImportDeclaration({
            namespaceImport: 'CleanWebpackPlugin',
            moduleSpecifier: 'clean-webpack-plugin'
        })

        mainFunc.insertVariableStatement(statementPos++, {
            declarations: [
                {
                    name: isDev,
                    initializer: "argv.mode === 'development'"
                },
                {
                    name: outDir,
                    initializer: outSingle ? `'${outSingle}'` : ternary(isDev, outDev, outProd).text
                }]
        })
        const configDecl = mainFunc.getVariableDeclarationOrThrow('config');
        const config = configDecl.getInitializer() as ObjectLiteralExpression;
        insertToObject(0, config, {
            entry,
            output: {
                path: L(`path.resolve(__dirname, ${outDir})`),
                filename: outFileName
            },
            ...(this.opts.stats && { stats: this.opts.stats })
        });
        const contextIdx = config.getPropertyOrThrow('context').getChildIndex();

        insertToObject(0, config, {
            devtool: ternary(isDev, "eval-source-map", 'nosources-source-map')
        })
        function getNestedPropertyValue<T extends Expression>(obj: ObjectLiteralExpression, path: string[]): T {
            let curObj = obj as Expression;
            for (const part of path) {
                const prop = (curObj as ObjectLiteralExpression).getPropertyOrThrow(part) as PropertyAssignment;
                curObj = prop.getInitializer()!;
            }
            return curObj as T;
        }

        interface Literal {
            readonly isLiteral: true // todo use symbol instead
            readonly text: string;
        }
        function isLiteralExpr(literal: any): literal is Literal {
            return literal && (literal as Literal).isLiteral;
        }

        function objectToText(obj: any, writer: CodeBlockWriter) {
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

        function insertToArray(index: number, array: ArrayLiteralExpression, ...elements: any[]) {
            array.insertElements(index, writer => elements.forEach((e, i) => {
                objectToText(e, writer);
                if (i < elements.length - 1)
                    writer.write(',' + os.EOL)
            }))
        }
        function addToArray(array: ArrayLiteralExpression, ...elements: any[]) {
            insertToArray(array.compilerNode.elements.length, array, ...elements);
        }

        function write(...str: any[]): Literal {
            const writer = new CodeBlockWriter();
            for (const s of str) {
                objectToText(s, writer)
            }
            return L(writer.toString());
        }
        function insertToObject(index: number, obj: ObjectLiteralExpression, addObj: { [key: string]: any }) {
            obj.insertPropertyAssignments(index, Object.keys(addObj).map((key, i) => {
                return {
                    name: key,
                    initializer: writer => objectToText(addObj[key], writer)
                } as PropertyAssignmentStructure;
            }))
        }
        function addToObject(obj: ObjectLiteralExpression, addObj: { [key: string]: any }) {
            insertToObject(obj.compilerNode.properties.length, obj, addObj)
        }

        function L(str: string): Literal {
            return {
                isLiteral: true,
                text: str
            }
        }
        function and(varName: string, expr: any): Literal {
            const writer = new CodeBlockWriter();
            objectToText(expr, writer);

            return L(`${varName} && ${writer.toString()}`)
        }

        function ternary(varName: string, expr1: any, expr2: any): Literal {
            const writer = new CodeBlockWriter();
            objectToText(expr1, writer);

            const writer2 = new CodeBlockWriter();
            objectToText(expr2, writer2);

            return L(`${varName} ? ${writer.toString()} : ${writer2.toString()}`)
        }

        const rules = getNestedPropertyValue<ArrayLiteralExpression>(config, ['module', 'rules'])

        addToArray(
            plugins,
            write(L(`new CleanWebpackPlugin(${outDir}, { verbose: false })`))
        )

        if (ts) {
            const exts = getNestedPropertyValue<ArrayLiteralExpression>(config, ['resolve', 'extensions'])

            insertToArray(
                0,
                exts,
                '.ts',
                '.tsx'
            )

            addToArray(
                rules,
                {
                    test: /\.tsx?$/i,
                    loader: 'ts-loader',
                    ...(tsConfig && {
                        options: {
                            configFile: tsConfig
                        }
                    })
                }
            )
        } else {
            addToArray(
                rules,
                {
                    test: /\.m?js$/i,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                }
            )
        }
        if (type === 'web') {
            const useCssExtractPlugin = 'useCssExtractPlugin';

            const useTsModuleLoader = ts && cssModules;
            mainFunc.insertVariableStatement(statementPos++, {
                declarations: [{
                    name: useCssExtractPlugin,
                    initializer: typeof this.opts.extractcss === 'boolean' ? this.opts.extractcss.toString() : `!${isDev}`
                }]
            });

            const urlLoaderWithSizeLimit = {
                loader: 'url-loader',
                options: {
                    limit: typeof this.opts.urlloaderbytes === 'number' ? this.opts.urlloaderbytes : 8192, // will convert media < 8kb to base64 strings
                    name: 'media/[name]-[hash].[ext]' // <- for file-loader
                }
            }

            if (useTsModuleLoader && tsdecl) {
                this.fs.write(this.destinationPath(this.cssdeclfilename), this.fs.read(path.resolve(__dirname, '..', 'webpack-template', this.cssdeclfilename)));
            }

            this.installModules.add('postcss-import');
            this.installModules.add('postcss-preset-env');
            this.installModules.add('cssnano');

            const cssLoaderModuleOptions = {
                camelCase: true,
                modules: cssModules,
                localIdentName: '[local]--[hash:base64:5]' // todo indentname
            }

            addToArray(
                rules,
                {
                    test: /\.(sa|sc|c)ss$/i,
                    use: [
                        ternary(useCssExtractPlugin, L('MiniCssExtractPlugin.loader'), 'style-loader'),
                        useTsModuleLoader
                            ? {
                                loader: "typings-for-css-modules-loader",
                                options: {
                                    namedExport: true,
                                    ...cssLoaderModuleOptions
                                }
                            }
                            : cssModules ? {
                                loader: 'css-loader',
                                options: cssLoaderModuleOptions
                            } : 'css-loader',
                        {
                            loader: 'postcss-loader',
                            options: {
                                ident: 'postcss',
                                plugins: L(`(loader: any) => [
    require('postcss-import')({ root: loader.resourcePath }),
    require('postcss-preset-env')()
].concat(${isDev} ? [] : [require('cssnano')()])`)
                            }
                        },
                        'sass-loader'
                    ]
                },
                {
                    test: /\.(png|jpe?g|gif|svg)$/i,
                    use: [
                        urlLoaderWithSizeLimit,
                        {
                            loader: 'image-webpack-loader',
                            options: {
                                disable: L(isDev)
                            }
                        }
                    ]
                },
                {
                    test: /\.mp4$/i,
                    ...urlLoaderWithSizeLimit
                }
            )

            sourceFile.addImportDeclaration({
                namespaceImport: 'MiniCssExtractPlugin',
                moduleSpecifier: 'mini-css-extract-plugin'
            })
            addToArray(
                plugins,
                and(useCssExtractPlugin, write(L('new MiniCssExtractPlugin('), {
                    filename: this.opts.cssfilename || ternary(isDev, '[name].css', '[name].[hash].css'),
                    chunkFilename: ternary(isDev, '[id].css', '[id].[hash].css')
                }, L(')')))
            )

            if (useTsModuleLoader) {
                sourceFile.addImportDeclaration({
                    namespaceImport: 'webpack',
                    moduleSpecifier: 'webpack'
                })
                addToArray(
                    plugins,
                    write(L('new webpack.WatchIgnorePlugin('), [/\.(sa|sc|c)ss\.d\.ts$/i], L(')'))
                )
            }

            if (html) {
                sourceFile.addImportDeclaration({
                    namespaceImport: 'HtmlWebpackPlugin',
                    moduleSpecifier: 'html-webpack-plugin'
                })
                addToArray(
                    plugins,
                    write(L('new HtmlWebpackPlugin('), {
                        title: htmlTitle,
                        filename: htmlFilename,
                        ...(htmlTemplate && { template: htmlTemplate }),
                        minify: ternary(isDev, false, {
                            collapseWhitespace: true,
                            collapseInlineTagWhitespace: true,
                            removeComments: true,
                            removeRedundantAttributes: true
                        })
                    }, L(')'))
                )
            }

        } else {
            const idx = config.getPropertyOrThrow('plugins').getChildIndex();
            insertToObject(0, config, {
                target: type,
                ...(type === 'node' && {
                    node: {
                        __dirname: false
                    },
                    externals: [
                        L(`// instead of search for node_modules folders and excluding every found module individually, just do this:
                        function (context, request: string, callback: Function) {
    if (/^\\w/.test(request)) {
        return callback(null, 'commonjs ' + request);
    }
    callback();
}`)
                    ]
                }),
            });
        }

        const text = sourceFile.getFullText();

        const importDecl = sourceFile.getImportDeclarations();
        for (const decl of importDecl) {
            this.installModules.add(decl.getModuleSpecifier().getLiteralText());
        }

        let m: RegExpMatchArray | null;
        for (const re of [/"([\w-]+?-loader)"/g, /'([\w-]+?-loader)'/g]) {
            do {
                m = re.exec(text);
                if (m) {
                    this.installModules.add(m[1]);
                }
            } while (m);
        }

        // todo also install modules that have require() and read peer deps from package.json
        const npmdeps: { [key: string]: string[] } = {
            'babel-loader': ["@babel/core", "@babel/preset-env"],
            'sass-loader': ['node-sass'],
            'url-loader': ['file-loader'],
            'ts-loader': ['typescript'],
            'typings-for-css-modules-loader': ['css-loader']
        }

        for (const mod of this.installModules) {
            const deps = npmdeps[mod];
            deps && deps.forEach(d => this.installModules.add(d));
        }

        const result = typescript.transpileModule(text, {
            compilerOptions: {
                module: typescript.ModuleKind.CommonJS,
                target: typescript.ScriptTarget.ES2017
            }
        });
        this.fs.write(this.destinationPath('webpack.config.js'), result.outputText);

        // see https://github.com/SharePoint/sp-dev-docs/issues/2155

        const pkgjsonpath = this.destinationPath('package.json');
        let indent: string | number = 4;
        if (this.fs.exists(pkgjsonpath)) {
            const json = this.fs.read(pkgjsonpath);
            indent = detectIndent(json).indent || 4;
        }

        const pkg = this.fs.readJSON(pkgjsonpath, {});
        const templatePkg = require('../webpack-template/package.json');
        pkg.devDependencies = pkg.devDependencies || {};
        const deps = templatePkg.devDependencies;
        for (const mod of this.installModules) {
            if (mod in deps) {
                pkg.devDependencies[mod] = deps[mod];
            }
        }

        await fs.writeFile(pkgjsonpath, JSON.stringify(pkg, null, indent));
    }

    async install() {
        await this.installDependencies({ bower: false })
    }
}

module.exports = GeneratorWebpack;