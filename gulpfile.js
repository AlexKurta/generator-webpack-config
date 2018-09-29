const gulp = require('gulp');
const fs = require('fs-extra');
const execa = require('execa');
const which = require('npm-which');
const path = require('path');
const os = require('os');
const rmfr = require('rmfr');

function getDir(id) {
    return path.join(os.tmpdir(), id);
}

async function packToTmp(id) {
    const whichCwd = which(process.cwd());
    console.log('Compiling and packing project');
    await execa(whichCwd.sync('tsc'), { stdio: 'inherit' });
    await execa('npm', ['pack']);
    const pkgJson = JSON.parse((await fs.readFile('package.json')).toString());
    const pkgName = pkgJson.name;
    const pkgVersion = pkgJson.version;
    const tarballName = `${pkgName}-${pkgVersion}.tgz`;
    const installDir = getDir(id);
    console.log(`Installing ${tarballName} into os temp dir (${installDir})`);
    await rmfr(installDir);
    await fs.mkdirp(installDir);
    await execa('npm', ['init', '-y'], { cwd: installDir });
    await fs.move(tarballName, path.join(installDir, tarballName));
    await execa('npm', ['i', 'yo', tarballName], { cwd: installDir, stdio: 'inherit' });
    await fs.unlink(path.join(installDir, tarballName));
    console.log(`Now run 'npm run test-npm-local-run' to test the package!`);
}

async function runPacked(id) {
    const installDir = getDir(id);
    console.log(`Running generator from temp dir (${installDir})`);
    const pkgJson = JSON.parse((await fs.readFile('package.json')).toString());
    const pkgName = pkgJson.name;
    const genName = pkgName.substr(pkgName.indexOf('-') + 1);
    const cmd = which(installDir).sync('yo');
    await execa(cmd, [genName], { stdio: 'inherit' });
}

const id = 'generator-webpack-config-pack-test';

/**
 * Will locally install packed npm file in os temp dir and test from there, allowing the user to test the npm package as though it was installed from npm. npm link testing method is not a accurate as this.
 */
gulp.task('test-npm-local', () => {
    return packToTmp(id);
});

gulp.task('test-npm-local-run', () => {
    return runPacked(id);
});