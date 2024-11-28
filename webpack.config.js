const path = require('path')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	mode: 'development',
	entry: './src/demo/index.ts',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'bundle.js'
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
		plugins: [new TsconfigPathsPlugin()]
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: './src/index.html',
			filename: 'index.html', 
		}),
	],
	module: {
		rules: [
			{
				test: /\.(ts|tsx)$/,
				exclude: /node_modules/,
				use: 'babel-loader'
			}
		]
	},
	devtool: 'inline-source-map',
	devServer: {
		static: './dist',
		hot: true,
		port: 4060
	}
}
