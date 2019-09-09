module.exports = {
	'env': {
		'browser': true,
		'es6': true
	},
	'extends': [
		'eslint:recommended',
		'plugin:import/errors',
		'plugin:import/warnings',
	],
	'globals': {
		'Atomics': 'readonly',
		'SharedArrayBuffer': 'readonly'
	},
	'parserOptions': {
		'ecmaFeatures': {
			'jsx': true
		},
		'ecmaVersion': 2018,
		'sourceType': 'module'
	},
	'plugins': [
		'react',
	],
	'rules': {
		'indent': [
			'error',
			'tab',
			{ 'SwitchCase': 1 }
		],
		'linebreak-style': [
			'error',
			'unix'
		],
		'quotes': [
			'warn',
			'single'
		],
		'semi': [
			'error',
			'always'
		],
		'no-console': 'warn',
		'space-before-function-paren': [
			'warn',
			'always',
		],'no-trailing-spaces': 'error',
		'no-multi-spaces': 'warn',
		'comma-spacing': 'warn',
		'object-curly-spacing': [
			'warn',
			'always',
		],
		'keyword-spacing': 'warn',
		'func-call-spacing': [
			'warn',
			'never',
		],
		'block-spacing': 'warn',
		'space-infix-ops': 'warn',
		'eol-last': 'warn',
		'no-var': 'error',
		'require-jsdoc': [ 'warn', {
			'require': {
				FunctionDeclaration: true,
				MethodDefinition: true,
				ClassDeclaration: true,
				//ArrowFunctionExpression: true,
				//FunctionExpression: true, TODO
			},
		}],
		'dot-notation': 'warn',
		'space-in-parens': [ 'warn', 'never' ],
		'brace-style': 'warn',
		'array-bracket-spacing': [ 'warn', 'always' ],
		'no-unused-vars': 'warn',
		//'no-warning-comments': 'warn',
	},
};
