const path = require("path");
const webpack = require("webpack");
const fs = require("fs");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// Since webpack config is now in config/webpack/, go up 2 directories to project root
const projectRoot = path.resolve(__dirname, "../..");

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const { version } = packageJson;

// Generate build timestamp in ISO 8601 format: YYYY-MM-DDTHH:mm
// This is generated when webpack config loads (at build start time)
const now = new Date();
const buildTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

module.exports = {
    entry: {
        opener: path.join(projectRoot, "src/opener/index.ts"),
        backgroundPage: path.join(projectRoot, "src/backgroundPage.ts"),
        popup: path.join(projectRoot, "src/popup/index.tsx"),
    },
    output: {
        path: path.join(projectRoot, "dist/js"),
        filename: "[name].js",
    },
    module: {
        rules: [
            {
                exclude: [/node_modules/, /__tests__/, /\.test\.tsx?$/, /\.spec\.tsx?$/],
                test: /\.tsx?$/,
                use: "ts-loader",
            },
            {
                exclude: /node_modules/,
                test: /\.scss$/,
                use: [
                    {
                        loader: "style-loader", // Creates style nodes from JS strings
                    },
                    {
                        loader: "css-loader", // Translates CSS into CommonJS
                    },
                    {
                        loader: "sass-loader", // Compiles Sass to CSS
                    },
                ],
            },
            {
                // Handle CSS files from node_modules (for Cloudscape)
                test: /\.css$/,
                use: [
                    {
                        loader: "style-loader",
                    },
                    {
                        loader: "css-loader",
                    },
                ],
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        alias: {
            "@src": path.resolve(projectRoot, "src/"),
        },
    },
    plugins: [
        // Copy static files from public/ to dist/
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(projectRoot, "public"),
                    to: path.join(projectRoot, "dist"),
                    globOptions: {
                        ignore: ["**/.DS_Store"],
                    },
                },
            ],
        }),
        // Inject version and build timestamp constants
        new webpack.DefinePlugin({
            __VERSION__: JSON.stringify(version),
            __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
        }),
    ],
};
