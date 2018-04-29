const path = require('path')

const resolve = (dir) => {
    return path.resolve(__dirname, dir)
}

const webpackConfig = {
    mode: 'development',
    target: 'web',
    entry: {
        analytics: './src/analytics.js',
    },
    output: {
        path: resolve('./dist'),
    }
}

module.exports = [
    {
        mode: 'development',
        target: 'web',
        entry: {
            analytics: './src/analytics.js',
        },
        output: {
            path: resolve('./dist'),
            filename: 'analytics.js',
        }
    },
    {
        mode: 'production',
        target: 'web',
        entry: {
            analytics: './src/analytics.js',
        },
        output: {
            path: resolve('./dist'),
            filename: 'analytics.min.js',
        }
    }
]
