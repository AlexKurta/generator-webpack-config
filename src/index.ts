import * as Generator from 'yeoman-generator';
import Project, { FunctionDeclaration, FunctionExpression, ObjectLiteralExpression, PropertyAssignment, ArrayLiteralExpression, CodeBlockWriter, Expression, PropertyAssignmentStructure, VariableDeclarationStructure, VariableStatementStructure, SourceFile } from "ts-simple-ast";
import * as path from 'path';
import * as os from 'os';
import * as typescript from "typescript";
import * as fs from 'fs-extra';
import * as detectIndent from 'detect-indent';
import { getNestedPropertyValue } from './utils';
import { getReferencedModules } from './imports';
import { compile } from './compiler';
import { AugmentModule, Extension } from './common/augmentModule';
import { parseFile } from './common/sourceFile';

const WEBPACK_CONF_JS_NAME = 'webpack.config.js';
const PACKAGEJSON_FILENAME = 'package.json';

declare global {
    interface Options {
        disableStore?: boolean;
    }
}

function getModules(dir: string): Extension[] {
    const files = fs.readdirSync(dir).sort();
    const result = [];
    for (const file of files) {
        const stat = fs.statSync(file);
        const fullPath = path.join(dir, file);
        if (stat.isFile()) {
            const mod = require(fullPath) as Extension;
            result.push(mod);
        } else {
            const subModules = getModules(fullPath);
            result.push(...subModules);
        }
    }
    return result;
}

class GeneratorWebpack extends Generator {

    private conf?: Config;
    private mods?: Extension[];
    get opts() {
        return this.options as Options;
    }

    constructor(args: string | string[], opts: {}) {
        super(args, opts);

        this.sourceRoot(path.resolve(__dirname, '..', 'webpack-template'));

        this.option('stats', { type: String });
        this.option('cssfilename', { type: String });
        this.option('extractcss', { type: Boolean });
        this.option('urlloaderbytes', { type: Number });
        this.option('disableStore', { type: Boolean });
    }

    async prompting() {
        const config = {} as Partial<Config>;
        this.mods = getModules(path.join(__dirname, 'augmentModules'));
        for (const mod of this.mods) {
            if (!mod.executeIf || mod.executeIf(config)) {
                const prompts = mod.prompts && mod.prompts() || [];
                const storePrompts = prompts.map(p => ({ ...p, store: this.opts.disableStore ? false : true }));
                const answers = await this.prompt(storePrompts as any);
                Object.assign(config, answers);
            }
        }
        this.conf = config as Config;
    }

    async writing() {

        const config = this.conf!
        const parsed = parseFile(this.templatePath(WEBPACK_CONF_JS_NAME));

        for (const mod of this.mods!) {
            const augmentModule = new mod.AugmentModule(
                config,
                this.options,
                this,
                parsed
            );
            if (!mod.executeIf || mod.executeIf(config)) {
                augmentModule.augment();
            }
        }

        const { sourceFile } = parsed;

        const compiled = compile(sourceFile.getFullText());
        this.fs.write(this.destinationPath(WEBPACK_CONF_JS_NAME), compiled);

        const installModules = getReferencedModules(sourceFile);

        this.extendPackageJson(installModules);
    }

    async install() {
        await this.installDependencies({ bower: false })
    }
    
    private async extendPackageJson(installModules: Set<string>) {

        // see https://github.com/SharePoint/sp-dev-docs/issues/2155

        const pkgJsonPath = this.destinationPath(PACKAGEJSON_FILENAME);
        let indent: string | number = 4;
        if (this.fs.exists(pkgJsonPath)) {
            const json = this.fs.read(pkgJsonPath);
            indent = detectIndent(json).indent || 4;
        }

        const pkgJson = this.fs.readJSON(pkgJsonPath, {});
        const templatePkg = require(this.templatePath(PACKAGEJSON_FILENAME));
        pkgJson.devDependencies = pkgJson.devDependencies || {};
        const deps = templatePkg.devDependencies;
        for (const installModule of installModules) {
            if (installModule in deps) {
                pkgJson.devDependencies[installModule] = deps[installModule];
            }
        }
        await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, indent));
    }
}

module.exports = GeneratorWebpack;