const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const TerserPlugin = require("terser-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

module.exports = merge(common, {
    mode: "production",

    // Source maps for production debugging
    devtool: "source-map",

    // Optimization configuration
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        // Drop console.log statements in production
                        drop_console: true,
                        drop_debugger: true,
                        pure_funcs: ["console.log", "console.debug"],
                    },
                    mangle: true,
                    output: {
                        comments: false,
                    },
                },
                extractComments: false,
            }),
        ],
        // Enable tree shaking
        usedExports: true,
        sideEffects: false,
        // Module concatenation
        concatenateModules: true,
    },

    // Performance hints
    performance: {
        hints: "warning",
        maxEntrypointSize: 512000, // 500 KB
        maxAssetSize: 512000, // 500 KB
    },

    plugins: [
        // Bundle analyzer - only run when ANALYZE=true
        ...(process.env.ANALYZE
            ? [
                  new BundleAnalyzerPlugin({
                      analyzerMode: "static",
                      reportFilename: "../../bundle-report.html",
                      openAnalyzer: true,
                  }),
              ]
            : []),
    ],
});
