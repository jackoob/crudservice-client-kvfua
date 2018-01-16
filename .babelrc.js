

// THIS IS NOT USED AND KEPT JUST TO LOOK FOR AND STOR SOME INTERESTING VALUES FOR BABEL HERE
//
// USE .babelrc file




module.exports = {
  presets: [
    "es2015"
    "stage-1",
    // spread doesn't currently work in babel-present-env
    // github ticket
    //  ["@babel/preset-env", {
			// "targets": {
			// 	"browsers": ["last 2 versions"]
			// }
    //    // for uglifyjs...
    //    forceAllTransforms: process.env.NODE_ENV === "production"
    //  }],
  ]
  // "plugins": [
    // "add-module-exports"
  //   "babel-plugin-transform-object-rest-spread"
  //   // "@babel/plugin-proposal-object-rest-spread"
  // ]
};


    // "@babel/cli": "7.0.0-beta.37",
    // "@babel/core": "7.0.0-beta.37",
    // "@babel/plugin-proposal-object-rest-spread": "7.0.0-beta.37",
    // "@babel/preset-env": "7.0.0-beta.37",
    // "@babel/preset-react": "^7.0.0-beta.37",
    // "@babel/preset-stage-1": "^7.0.0-beta.37",

    "babel-cli": "^6.26.0",
    "babel-core": "^6.26.0",
    "babel-plugin-add-module-exports": "^0.2.1",
    "babel-preset-es2015": "^6.24.1",
    "babel-preset-react": "^6.24.1",
    "babel-preset-stage-1": "^6.24.1",

{
  presets: [
    "es2015",
    "stage-1",
    "react"
  ],
  plugins: [
    "add-module-exports"
  ]
}