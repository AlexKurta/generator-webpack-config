const chai = require('chai');
chai.use(require('chai-fs'));
const { expect } = chai;
import 'mocha';
import * as helpers from 'yeoman-test';
import * as path from 'path';
import * as fs from 'fs-extra';
const rmfr = require('rmfr');
import * as execa from 'execa';
import { v4 as uuid } from 'uuid';
import * as phantom from 'phantom';
import * as os from 'os';
const which = require('npm-which');
import { isEqual } from 'lodash';
import { Config } from '../src/common/config';
import { Cmds } from '../src/common/cmds';
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

// run tests in os tmp dir to achieve max isolation (e.g. if we create the tests dirs in project dir, then node_modules is still accessible because of node resolution logic)
const testtmp = path.resolve(os.tmpdir(), 'test_temp');
const testinstall = path.join(testtmp, 'test_installs');
const testdirs = path.join(testtmp, 'testdirs');
const testdata = path.join(__dirname, 'test_data');

const execKeys = null as any;
// const execKeys = new Set(['node.should still be dependant on node_modules folder (externals)']) 

const timeout = 300000;
// todo make sure standard js and css output names are ok
// todo test sourcemaps
const jsonsfile = path.join(testinstall, 'data.json');
const pkgjsons: { deps: any, promise: any, idir: string, finished?: boolean }[] = fs.pathExistsSync(jsonsfile) ? JSON.parse(fs.readFileSync(jsonsfile).toString()).filter((o: any) => !!o.finished) : [];
function saveJsons() {
    fs.writeFileSync(jsonsfile, JSON.stringify(pkgjsons, null, 4));
}

interface ConfigAndCmds extends Config {
    cmds?: Cmds;
}

describe('Generator', function () {
    this.timeout(timeout);
    [true, false].forEach(isDev => {

        const mode = isDev ? 'development' : 'production';

        async function runTest(customAnswersAndCmds: Partial<ConfigAndCmds>, prepareFunc: (dir: Dir) => void, testFn?: (dir: Dir) => void) {
            const baseAnswers: Partial<Config> = {
                type: 'web',
                entry: !customAnswersAndCmds.ts ? './src/index.js' : './src/index.ts',
                seperate_outdirs: false,
                outProd: path.join('build', 'release'),
                outDev: path.join('build', 'debug'),
                outSingle: 'build',
                outFileName: 'index.js',
                html: false
            };
            const { cmds: _customCmds, ...customAnswers } = customAnswersAndCmds;
            const customCmds = _customCmds || {};
            const answers = Object.assign({}, baseAnswers, customAnswers as Partial<Config>);
            const randomFolderName = uuid();
            const testdir = path.resolve(testdirs, randomFolderName);
            const opts: Cmds = {
                stats: 'errors-only',
                disableStore: true, // needed else yeoman could read from .yo-rc-global.json
                ...customCmds
            };
            await helpers.run(path.join(__dirname, '../src'))
                .inDir(testdir, dir => {
                })
                .withPrompts(answers)
                .withOptions(opts)
                .toPromise();
            const jsonloc = path.resolve(testdir, 'package.json');
            const pkgJson = JSON.parse((await fs.readFile(jsonloc)).toString());
            pkgJson.devDependencies = Object.assign(pkgJson.devDependencies || {}, { "uuid": "^3.3.2" }); // needed for tests
            await fs.writeFile(jsonloc, JSON.stringify(pkgJson, null, 4));

            const deps = { d: pkgJson.devDependencies, dd: pkgJson.dependencies };
            const compareObj = JSON.parse(JSON.stringify(deps)); // because we also loaded objs from storage and we compare them with isEqual now
            let task = pkgjsons.find(o => isEqual(o.deps, compareObj));
            if (!task) {
                const idir = path.resolve(testinstall, uuid());
                task = {
                    deps: compareObj,
                    promise: (async () => {
                        await fs.mkdirp(idir);
                        await fs.copy(jsonloc, path.join(idir, 'package.json'));
                        await execa('npm', ['i'], { cwd: idir, stdio: 'inherit' });
                        (task as any).finished = true;
                        saveJsons();
                    })(),
                    idir
                };
                pkgjsons.push(task);
                saveJsons();
            }
            await task.promise;
            if (os.platform() === 'win32') {
                // ONLY works on newer windows 10 builds without being admin!
                await execa('cmd', ['/c', 'mklink', '/D', path.resolve(testdir, 'node_modules'), path.resolve(task.idir, 'node_modules')]);
            } else {
                await execa('ln', ['-s', path.resolve(task.idir, 'node_modules'), path.resolve(testdir, 'node_modules')]);
            }

            const srcdir = path.resolve(testdir, path.dirname(answers.entry!));
            const builddir = path.resolve(testdir, answers.seperate_outdirs ? isDev ? answers.outDev! : answers.outProd! : answers.outSingle!);
            const dir = new Dir(testdir, srcdir, builddir);
            await dir.addSrcFile2('index.js', '');
            await prepareFunc(dir);
            const wbpath = await new Promise<string>((r, rj) => {
                which(testdir)('webpack', (err: any, pathToWebpack: any) => {
                    if (err) {
                        return rj(err);
                    }
                    return r(pathToWebpack);
                });
            })

            await execa(wbpath, ['--mode', mode], { cwd: testdir, stdio: 'inherit' });
            if (answers.type === 'node') {
                const result = await execa('node', ['index.js'], { cwd: builddir, stdio: 'inherit' });
                if (result.stdout) {
                    const filelines = result.stdout.indexOf('fail') !== -1;
                    if (filelines) {
                        throw result.stdout;
                    }
                }
            } else {
                let theerr: any;
                let themsg: any;
                const instance = await phantom.create();
                const page = await instance.createPage();
                page.on('onError', (msg, trace) => {
                    console.log('PHANTOM onError', msg);
                    var msgStack = ['ERROR: ' + msg];

                    if (trace && trace.length) {
                        msgStack.push('TRACE:');
                        trace.forEach(function (t: any) {
                            msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
                        });
                    }
                    theerr = msgStack.join('\n');
                })
                page.on('onConsoleMessage', (msg) => {
                    console.log('PHANTOM onConsoleMessage', msg);
                    const filelines = msg.indexOf('fail') !== -1;
                    if (filelines) {
                        themsg = msg;
                    }
                });
                await page.injectJs(path.resolve(builddir, 'index.js'));
                instance.exit();
                if (theerr) {
                    throw theerr;
                }
                if (themsg) {
                    throw themsg;
                }
            }
            testFn && await testFn(dir);
        }

        class Dir {
            constructor(public readonly rootdir: string, public readonly srcdir: string, public readonly builddir: string) {
            }

            async addRootFile2(file: string, content: string | Buffer) {
                const rootfile = path.resolve(this.rootdir, file);
                await fs.mkdirp(path.dirname(rootfile));
                await fs.writeFile(rootfile, content);
            }

            async addSrcFile2(file: string, content: string | Buffer) {
                const srcfile = this.srcfile(file);
                await fs.mkdirp(path.dirname(srcfile));
                await fs.writeFile(srcfile, content);
            }

            srcfile(file: string): string {
                return path.resolve(this.srcdir, file);
            }

            buildfile(file: string): string {
                return path.resolve(this.builddir, file);
            }
        }

        async function addCssFiles2(dir: Dir) {
            await dir.addSrcFile2('styles.css', `.test-style0{color:red;}`);
            await dir.addSrcFile2('styles.scss', `.test-style1{color:red;}`);
            await dir.addSrcFile2('styles.sass', `.test-style2\n\tcolor:red`)
        }

        async function setModuleTest2(dir: Dir, ending: string) {
            await addCssFiles2(dir);
            if (ending === '.ts') {
                await dir.addRootFile2('tsconfig.json', `{"include":["src/**/*"],"files":["cssModules.d.ts"]}`)
            }
            await dir.addSrcFile2('index' + ending, `import * as s from './styles.css';
                import * as s2 from './styles.scss';
               // import * as s3 from './styles.sass';
                [s,s2].forEach((st,i) => !st['testStyle'+i]&&console.log('fail: style ' + i + ' is not available'))`)
        }

        // our tests are heavily io bound but mocha says nono to parallel tests, so we build our "describe"/"it" functions programmatically by defining the meta data for building them first. the tests are then started all at once and mocha just deplays the results of the resolved promises
        const testCases = {
            'should use separate production and development directories': function () {
                return runTest({ seperate_outdirs: true }, dir => {
                }, dir => {
                    expect(dir.builddir).to.be.a.directory().and.not.empty;
                })
            },
            node: {
                'should still be dependant on node_modules folder (externals)': () => {
                    return runTest({ type: 'node' }, async dir => {
                        await dir.addSrcFile2('index.js', `import {v4 as uuid} from 'uuid';\nuuid()`);
                    }, async dir => {
                        const bdir = path.resolve(os.tmpdir(), uuid());
                        await fs.copy(dir.builddir, bdir);
                        const output = await execa('node', ['index.js'], { cwd: bdir, reject: false });
                        expect(output.code).to.not.equal(0);
                        expect(output.stdout + output.stderr).to.match(/\buuid\b/); // module not found msg
                    })
                }
            },
            web: {
                'should be independant of node_modules folder (no externals)': () => {
                    return runTest({}, async  dir => {
                        await dir.addSrcFile2('index.js', `import {v4 as uuid} from 'uuid';\nuuid()`);
                    }, async dir => {
                        const bdir = path.resolve(os.tmpdir(), uuid());
                        await fs.copy(dir.builddir, bdir);

                        // todo copy dir to os tmp dir and then assert that it does not throw
                    })
                },
                css: {
                    'should use typescript modules if typescript is chosen': () => {
                        return runTest({ cssModules: true, ts: true }, async dir => {
                            await setModuleTest2(dir, '.ts');
                        }, dir => {
                            for (const ext of ['css', 'scss']) { // , 'sass'
                                expect(dir.srcfile('styles.' + ext + '.d.ts')).to.be.a.file().and.not.empty;
                            }
                        });
                    },
                    'should use modules if css modules are used': () => {
                        return runTest({ cssModules: true }, async dir => {
                            await setModuleTest2(dir, '.js');
                        });
                    },
                    'should be global if css modules are not used': () => {
                        return runTest({ cssModules: false, cmds: { cssfilename: 'index.css' } }, async dir => {
                            await addCssFiles2(dir);
                            await dir.addSrcFile2('index.js', `import './styles.css'
                                import './styles.scss'
                                //import './styles.sass'`);
                        }, dir => {
                            const cssfilename = dir.buildfile(isDev ? 'index.js' : 'index.css');
                            for (const num of [0, 1]) {
                                expect(cssfilename).to.be.a.file().with.contents.that.match(new RegExp('\\.test-style' + num));
                            }
                        });
                    },
                    'should minify only in production mode': () => {
                        return runTest({ cmds: { cssfilename: 'index.css', extractcss: true }, }, async dir => {
                            await dir.addSrcFile2('styles.scss', '.example-style\n{\ncolor: red;\n}');
                            await dir.addSrcFile2('index.js', `import './styles.scss'`);
                        }, dir => {
                            const cssfilename = dir.buildfile('index.css');
                            if (!isDev) {
                                expect(cssfilename).to.be.a.file().with.contents.that.match(/\{color/);
                            } else {
                                expect(cssfilename).to.be.a.file().with.contents.that.match(/\{\n.*color/);
                            }
                        })
                    },
                    'should create seperate css file when in production mode': () => {
                        return runTest({ cmds: { cssfilename: 'index.css' } }, async dir => {
                            await dir.addSrcFile2('styles.css', '.example-style { color: red; }');
                            await dir.addSrcFile2('index.js', `import './styles.css'`);
                        }, dir => {
                            const cssfilename = dir.buildfile('index.css');
                            if (!isDev) {
                                expect(cssfilename).to.be.a.file().and.not.empty;
                            } else {
                                expect(cssfilename).to.not.be.a.path();
                            }
                        })
                    }
                },
                images: {
                    'should embed small images': () => {
                        return runTest({}, async dir => {
                            await dir.addSrcFile2('index.js', `import img from './img.png'\n!img&&console.log('fail: image is not available')`);
                            await dir.addSrcFile2('img.png', await fs.readFile(path.resolve(testdata, 'img.png')));
                        }, dir => {
                            expect(dir.buildfile('media')).to.not.be.a.path();
                        })
                    },
                    'should not embed larger images': () => {
                        return runTest({ cmds: { urlloaderbytes: 1 } }, async dir => {
                            await dir.addSrcFile2('index.js', `import img from './img.png'\n!img&&console.log('fail: image is not available')`);
                            await dir.addSrcFile2('img.png', await fs.readFile(path.resolve(testdata, 'img.png')));
                        }, dir => {
                            expect(dir.buildfile('media')).to.be.a.directory().and.not.empty;
                        })
                    }
                },
                html: {
                    'should respect html create choice': function () {
                        return runTest({ html: true }, dir => {
                        }, async dir => {
                            expect(dir.buildfile('index.html')).to.be.a.file().and.not.empty;
                        })
                    },
                    'should contains css file': () => {
                        if (!isDev) {
                            return runTest({ html: true, cmds: { cssfilename: 'index.css' } }, async dir => {
                                await dir.addSrcFile2('styles.css', '.example-style { color: red; }');
                                await dir.addSrcFile2('index.js', `import './styles.css'`);
                            }, async dir => {
                                expect(dir.buildfile('index.html')).to.be.a.file().with.contents.that.match(/index\.css/);
                            })
                        }
                    },
                    'should contains js file': () => {
                        return runTest({ html: true }, dir => {
                        }, async dir => {
                            expect(dir.buildfile('index.html')).to.be.a.file().with.contents.that.match(/index\.js/);
                        })
                    },
                    'should have correct title': () => {
                        return runTest({ html: true, htmlTitle: 'testTitle' }, dir => {
                        }, async dir => {
                            expect(dir.buildfile('index.html')).to.be.a.file().with.contents.that.match(/testTitle/);
                        })
                    },
                    'should have correct filename': () => {
                        return runTest({ html: true, htmlFilename: 'myIndex.html' }, dir => {
                        }, async dir => {
                            expect(dir.buildfile('myIndex.html')).to.be.a.file()
                        })
                    },
                    'should be based on template': () => {
                        return runTest({ html: true, htmlTemplate: 'src/index_template.html' }, async dir => {
                            await dir.addSrcFile2('index_template.html', (await fs.readFile(path.resolve(testdata, 'index_template.html'))).toString())
                        }, async dir => {
                            expect(dir.buildfile('index.html')).to.be.a.file().with.contents.that.match(/myTemplate/);
                        })
                    },
                }
            }
        }

        function runTests(obj: any, results: any, globalKey: any = null) {
            for (const key of Object.keys(obj)) {
                const globalKeyKey = globalKey ? `${globalKey}.${key}` : key;
                const value = obj[key];
                if (typeof value === 'function') {
                    if (!execKeys || execKeys.has(globalKeyKey))
                        results[globalKeyKey] = value();
                } else {
                    runTests(value, results, globalKeyKey);
                }
            }
        }

        const results: any = {};
        runTests(testCases, results);

        function createTests(obj: any, globalKey: any = null) {
            for (const key of Object.keys(obj)) {
                const globalKeyKey = globalKey ? `${globalKey}.${key}` : key;
                const value = obj[key];
                if (typeof value === 'function') {
                    if (!execKeys || execKeys.has(globalKeyKey))
                        it(key, () => results[globalKeyKey]);
                } else {
                    describe(key, () => {
                        createTests(value, globalKeyKey);
                    })
                }
            }
        }

        describe(`mode ${mode}`, () => {
            createTests(testCases);
        })
    })
})