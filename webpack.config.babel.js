// external
import webpack from 'webpack'
import path    from 'path'

const { NODE_ENV } = process.env

const plugins = [
  // new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.DefinePlugin({
    'process.env': {
      'NODE_ENV': JSON.stringify( NODE_ENV )
    }
  })
]

const filename = `redux-shapeshifter-middleware` +
                 `${ NODE_ENV === 'production' ? '.min' : '' }.js`

NODE_ENV === 'production' && plugins.push(
  new webpack.optimize.UglifyJsPlugin({
    compressor: {
      pure_getters: true,
      unsafe: true,
      unsafe_comps: true,
      screw_ie8: true,
      warnings: false
    }
  })
)

export default {
  module: {
    rules: [
      { test: /\.js$/, loaders: [ 'babel-loader' ], exclude: /node_modules/ }
    ]
  },

  entry: [ './src/middleware.js' ],

  output: {
    path: path.join( __dirname, 'build' ),
    filename,
    library: 'ReduxShapeshifterMiddleware',
    libraryTarget: 'umd'
  },

  plugins
}
