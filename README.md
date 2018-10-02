# generator-webpack-config

[Yeoman](http://yeoman.io/) generator generating a webpack configuration file

## Why?

Manually creating webpack configuration files ...

* is time consuming
* is error prone (no automated tests)
* requires knowledge of webpack
* has all the disadvantages of copy/paste in case of multiple configuration files

## Caveats

* limited configuration ability compared to webpack
* if you want to preserve the generated file to be able to update (overwrite) it with later versions of the generator, you may want to use [webpack-merge](https://www.npmjs.com/package/webpack-merge) to merge with another webpack configuration file

## Getting Started

Install [Yeoman](http://yeoman.io/)

```
npm install -g yo
```

Install the Yeoman generator

```
npm install -g generator-webpack-config
```

Run the Yeoman generator

```
yo webpack-config
```

The generator will create a webpack configuration file, prompting the user in case one already exists. It will add the necessary modules for webpack to the package.json file before doing `npm install`.

## Contributing

After cloning this repository, run

```
npm install
```

### Guidelines

* This project should not try to offer all that webpack can. It should provide sensible configuration options that cover common and/or sensible use cases.
* If you want the project to accommodate non-common use cases then try to abstract from that to provide a more general configuration ability.. without over complicating things => try to keep it logical and simple and non-error prone. Another possibility is adding some kind of plugin capability to the generator, so its code is not affected.
* Provide sensible defaults for user inquiries
* Always write tests
* Keep existing code style (indents, etc.)

### Tests

```
npm run test
```

It can take a bit of time before the tests show some results, but they will complete fairly fast.

Please also check that the project runs as a locally installed npm module.

```
npm run test-npm-local
```

Then run the installed package.

```
npm run test-npm-local-run
```

The above method is more accurate than the 'npm link' method because npm linked packages have the complete project folder as directory context, because it's just a symbolic link, so errors that may occur with the actual packed package (which npm publish also uses) may not occur when using the 'npm link' method.
In an attempt to avoid permission problems the above script installs into the os's temp directory and does not install anything globally.

## TODOs

Concrete TODOs can be found as comments in the code, this is just a general indication of what can or should be improved

* bugs
    * css modules currently does not seem to work with sass indention syntax (.sass files)
* generator
    * the generator also does an npm install for the webpack dependencies after generating the config file. This npm install currently reports some "moderate vulnerabilities" that originate from the image-webpack-plugin
    * some validation for generator inputs (although e.g. always checking for existence of a file beforehand can and should be debated)
    * ability to extend the generator
    * populate resolve.alias object in webpack.config when using typescript (replicate paths from tsconfig.json)
    * also try to remove no longer needed dependencies from package.json when generator configuration changes
* tests
    * don't run tests strictly once for production and once for development mode, but rather share more test code in this case to speed up test runs
    * some tests are still missing or incomplete
    * let webpack write from and to a memory fs
    * generally the test run is still extremely slow due to the nature of testing webpack even though parallelization, which has been added, has already shown extreme performance benefits

## License

MIT