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
import { AugmentModule } from './common/augmentModule';

declare global {
    interface Options {
        disableStore?: boolean;
    }
}

function getModules(): AugmentModule[] {
    throw new Error();
}

class GeneratorWebpack extends Generator {

    constructor(args: string | string[], opts: {}) {
        super(args, opts);

        this.option('stats', { type: String });
        this.option('cssfilename', { type: String });
        this.option('extractcss', { type: Boolean });
        this.option('urlloaderbytes', { type: Number });
        this.option('disableStore', { type: Boolean });
    }

    async prompting() {
        // todo prompt user with store:true added if not disableStore
        const augmentModulesDir = path.join(__dirname, 'augmentModules');
        const dirs = fs.readdirSync(augmentModulesDir);
        const config = {} as Partial<Config>;
        for (const mod of getModules()) {
            if (mod.executeIf(config)) {
                const prompts = mod.prompts();
                const answers = await this.prompt(prompts as any);
                Object.assign(config, answers);
            }
        }
    }

    async writing() {
        const sourceFile = null as any as SourceFile; // todo

        for (const mod of getModules()) {
            if (mod.executeIf(config)) {
                mod.augment();
            }
        }

        const compiled = compile(sourceFile.getFullText());
        this.fs.write(this.destinationPath('webpack.config.js'), compiled);

        const installModules = getReferencedModules(sourceFile);

        this.extendPackageJson(installModules);
    }

    async install() {
        await this.installDependencies({ bower: false })
    }
    // todo set template root
    private async extendPackageJson(installModules: Set<string>) {

        // see https://github.com/SharePoint/sp-dev-docs/issues/2155

        const pkgJsonPath = this.destinationPath('package.json');
        let indent: string | number = 4;
        if (this.fs.exists(pkgJsonPath)) {
            const json = this.fs.read(pkgJsonPath);
            indent = detectIndent(json).indent || 4;
        }

        const pkgJson = this.fs.readJSON(pkgJsonPath, {});
        const templatePkg = require('../webpack-template/package.json');
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