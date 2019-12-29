const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader",
                ],
            },
        ],
    },
    plugins: [
        new CopyPlugin([
            {
                from: "./src/models",
                to: "./models",
            },
        ]),
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
            title: "Emojime",
        }),
    ],
    node: {
        fs: "empty",
    },
};
