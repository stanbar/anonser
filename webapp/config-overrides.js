const webpack = require('webpack');

// create-react-app version >=5  does not include polifylls for nodejs core modules
// so we need to add them manually
// https://github.com/web3/web3.js#web3-and-create-react-app
// or use smart npm imports https://github.com/facebook/create-react-app/issues/11756#issuecomment-1320437816
module.exports = function override(config) {
    const fallback = config.resolve.fallback || {};
    Object.assign(fallback, {
        "buffer": require.resolve('buffer'),
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify"),
        "url": require.resolve("url"),
        "fs": require.resolve("file-system"),
        "path": require.resolve("path-browserify"),
    })
    config.resolve.fallback = fallback;
    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer']
        }),
    ])
    config.ignoreWarnings = [/Failed to parse source map/];
    return config;
}