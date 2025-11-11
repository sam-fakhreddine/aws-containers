const path = require("path");

// Since webpack config is now in config/webpack/, go up 2 directories to project root
const projectRoot = path.resolve(__dirname, "../..");

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
                exclude: /node_modules/,
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
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        alias: {
            "@src": path.resolve(projectRoot, "src/"),
        },
    },
};
