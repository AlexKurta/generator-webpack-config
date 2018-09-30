import * as Generator from 'yeoman-generator';
import Project, { FunctionDeclaration, FunctionExpression, ObjectLiteralExpression, PropertyAssignment, ArrayLiteralExpression, CodeBlockWriter, Expression, PropertyAssignmentStructure, VariableDeclarationStructure, VariableStatementStructure } from "ts-simple-ast";
import * as path from 'path';
import * as os from 'os';
import * as typescript from "typescript";
import { Config } from './common/config';
import { Cmds } from './common/cmds';
import * as fs from 'fs-extra';
import * as detectIndent from 'detect-indent';
import { getQuestions } from './questions';
import { addCss } from './css';
import { getNestedPropertyValue } from './utils';
import { Context } from './context';
import { base } from './base';
import { addHtml } from './html';
import { addTs } from './ts';
import { addJs } from './js';
import { addNode } from './node';
import { addMedia } from './media';

class GeneratorWebpack extends Generator {
    private get opts() {
        return this.options as Cmds;
    }
    private props?: Config;
    private installModules = new Set(['webpack', "webpack-cli"]);

    constructor(args: string | string[], opts: {}) {
        super(args, opts);

        this.option('stats', { type: String });
        this.option('cssfilename', { type: String });
        this.option('extractcss', { type: Boolean });
        this.option('urlloaderbytes', { type: Number });
        this.option('disableStore', { type: Boolean });
    }

    async prompting() {
        let questions = await getQuestions({ cssModuleTypingFileName: this.cssdeclfilename });
        questions = questions.map((q: any) => Object.assign(q, this.opts.disableStore ? {} : { store: true }));
        this.props = await this.prompt(questions) as Config;
    }

    async writing() {
        const { type, entry, outSingle, outProd, outDev, outFileName, ts, tsConfig, cssModules, tsdecl, html, htmlTitle, htmlFilename, htmlTemplate } = this.props!;

        const project = new Project();
        const sourceFile = project.addExistingSourceFile(path.resolve(__dirname, '..', 'webpack-template', 'webpack.config.ts'));
        const mainFunc = sourceFile.getVariableDeclarationOrThrow('webpackConfigurationFn').getInitializer() as FunctionExpression;
        const isDev = 'isDev';
        const config = mainFunc.getVariableDeclarationOrThrow('config').getInitializer() as ObjectLiteralExpression;
        const rules = getNestedPropertyValue<ArrayLiteralExpression>(config, ['module', 'rules'])
        const plugins = mainFunc.getVariableDeclarationOrThrow('plugins').getInitializer() as ArrayLiteralExpression;
        const statements: VariableStatementStructure[] = [];
        const context: Context = {
            config: {
                rules,
                plugins
            },
            configObject: config,
            installModules: this.installModules,
            isDev,
            sourceFile,
            insertVariableStatement(s) {
                statements.push(s);
            }
        }
        base(context, {
            entry,
            outFileName,
            outDev,
            outProd,
            stats: this.opts.stats
        });
        if (type === 'web') {
            if (ts) {
                addTs(context, { tsConfig });
            } else {
                addJs(context);
            }
            addCss(context, {
                modules: cssModules ? { ts: ts ? { createTypings: !!tsdecl } : false } : false,
                cssFileName: this.opts.cssfilename,
                extractCss: this.opts.extractcss
            })
            if (html) {
                addHtml(context, {
                    title: htmlTitle!,
                    filename: htmlFilename!,
                    template: htmlTemplate
                })
            }
            addMedia(context, { urlloaderbytes: this.opts.urlloaderbytes })
        } else {
            addNode(context)
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