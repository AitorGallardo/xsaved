const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    // Service worker (background script)
    'service-worker': './src/extension/service-worker.ts',
    // Content script
    'content': './src/extension/content.js',
    // We'll add popup later if needed
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true, // Skip type checking for faster builds
          }
        },
        exclude: /node_modules/,
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { 
          from: 'manifest.json', 
          to: 'manifest.json' 
        },
        { 
          from: 'src/ui/popup.html', 
          to: 'src/ui/popup.html'
        },
        { 
          from: 'src/ui/popup.js', 
          to: 'src/ui/popup.js'
        },
        { 
          from: 'src/ui/styles.css', 
          to: 'src/ui/styles.css'
        },
        {
          from: 'src/extension/utils',
          to: 'src/extension/utils',
          noErrorOnMissing: true
        }
      ],
    }),
  ],
  optimization: {
    // Don't minimize for easier debugging
    minimize: false,
  },
  devtool: 'cheap-source-map',
}; 