const path = require('path')
const webpack = require('webpack')
const HtmlWebPackPlugin = require("html-webpack-plugin")


module.exports = {
    mode: 'development',
    entry: {
        app: './assets/js/app.js',
    },
    output: {
        path: path.join(__dirname, 'public'),
        publicPath: '/',
        filename: '[name].js'
    },
    target: 'web',
    devtool: 'source-map',
    module: {
        rules: [{
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader",
            },
            {
                // Loads the javacript into html template provided.
                // Entry point is set below in HtmlWebPackPlugin in Plugins 
                test: /\.html$/,
                use: [{
                    loader: "html-loader",
                    //options: { minimize: true }
                }]
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: ['file-loader']
            }
        ]
    },
    plugins: [
        new webpack.NoEmitOnErrorsPlugin()
    ]
}