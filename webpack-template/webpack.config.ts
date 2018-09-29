import * as path from 'path';

const webpackConfigurationFn = async (
    env,
    argv
) => {

    const plugins = [];

    const config = {
        module: {
            rules: []
        },
        resolve: {
            extensions: [".js", ".jsx", ".css", ".json"]
        },
        context: __dirname,
        plugins: plugins.filter(Boolean)
    };

    return config;
};

export default webpackConfigurationFn;