import * as path from 'path';
import * as webpack from 'webpack';

/*return*/
export default (
    env,
    argv
) => {
/*return*/
    const config = {
        module: {
            rules: []
        },
        resolve: {
            extensions: [".js", ".jsx", ".css", ".json"]
        },
        context: __dirname,
        plugins: [].filter(Boolean)
    };
/*return*/
    return config;
};