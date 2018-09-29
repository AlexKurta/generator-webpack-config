# generator-webpack-config

## What is it?

[Yeoman](http://yeoman.io/) generator generating a webpack configuration file

## Getting started

- Install: `npm install -g generator-webpack-config`
- Run: `yo generator`

## But can't I just create my webpack configuration file(s) manually?

Yes, I did so too before a created this project, but:

* you need the knowhow and ..keep the knowhow. And update your knowhow with each webpack version and new webpack plugins or plugin versions
* time consuming
* you need have lots of project using webpack, so lots of copy and paste
* you want to optimize the config of your project => have to change each config. with this generator you just run it again and it updates the configuration to the newest version
* error prone, no automated tests (like with this project)

Personally, I was fed up with creating a new webconfig configuration for each of my projects or copy/pasting the hell out of my previous webpack configs, because, let's face it, every one knows why duplicating code is bad.

## Cons

* generates only limited configs for limited use cases
* if you want more you have to [merge](https://www.npmjs.com/package/webpack-merge) with your own config or modify the generated webpack config. or you'll have to contribute to this project :)
* you can also modify the generated config, but then you can't really let the generator update/overwrite your old configuration

## Contributing

I welcome any and all help and tips, because I want this to be the best it can be :)

Prerequisite:

```
npm i
```

Generelly there are some guidelines I want this project to honor:

* features
    * this project should not try to offer all that webpack can. It should provide sensible configuration options that cover common and/or sensible use cases.
    * if you want the project to accomodate non-common use cases then try to abstract from that to provide a more general configuration ability.. without overcomplicating things => try to keep it logical and simple and non-error prone. Another possibility is adding some kind of plugin capability to the generator, to its code is not affected.
    * provide sensible defaults for user inquiries

### Before sending pull request

Please write tests for every feature added. Writing tests is easy :)

Always run the tests to check no errors have been introduced:

```
npm run test
```

It can take a bit of time before the tests show some results, but they will complete fairly fast.

Please also check that the project runs as a locally installed npm module:

First run this command to compile project, run npm pack and npm install the tgz file into os's temp dir (so it's isolated)

```
npm run test-npm-local
```

The run it from the os's temp dir

```
npm run test-npm-local-run
```

The above commands are implemented in gulpfile.js, so you can review them there.

### npm link

The above method is more accurate than the 'npm link' method because npm linked packages have the complete project folder as directory context, because it's just a symlink, so errors that may occur with the actual packed package (which npm publish also uses) may not occur when using the 'npm link' method.

If you do (also) use the 'npm link' method be sure to also install yeoman globally. Also run this beforehand:

```
./node_modules/.bin/tsc --watch
```

## TODOs

Concrete TODOs can be found in the code (search for 'todo'), this is just a general indication of what can or should be improved

* bugs
    * css modules currently does not seem to work with sass indention syntax (.sass files)
* generator
    * the generator also does an npm install for the webpack deps after generating the config file. This npm install currently reports some "moderate vulnerabilities" that originate from the image-webpack-plugin
    * some validation for generator inputs (although e.g. always checking for existance of a file beforehand can and should be debated)
    * ability to extend the generator
    * populate resolve.alias object in webpack.config when using typescript (replicate paths from tsconfig.json)
* tests
    * don't run tests strictly once for production and once for development mode, but rather share more test code in this case to speed up test runs
    * some tests are still missing or incomplete
    * let webpack write from and to a memory fs
    * generally the test run is still extremely slow due to the nature of testing webpack even though parallelization, which has been added, has already shown extreme performance benefits
* code cleanup, e.g. organizing the generator code according to what code does what to the generated webpack config (split code into multiple files, separation of concerns)

## License

MIT