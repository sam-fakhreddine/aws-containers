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
    // NOTE: For browser extensions, we can be more lenient with bundle sizes because:
    // - Files are loaded locally from the extension directory (no network cost)
    // - Bundles are cached indefinitely by the browser
    // - The Cloudscape Design System provides excellent UX but is ~2MB
    // - Users don't pay for bandwidth like they would on a website
    performance: {
        hints: "warning",
        maxEntrypointSize: 2500000, // 2.5 MB (reasonable for extension with UI library)
        maxAssetSize: 2500000, // 2.5 MB
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
