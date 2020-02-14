import { fromJS, Map as ImmuMap } from 'immutable';
import { actions, CrudoState, AuthState } from './constants';
import produce from 'immer';

//import { LOGOUT } from '../session/constants';
//TODO: import LOGOUT from auth-session
export const PREFIX = 'app/Login/';
export const LOGOUT = `${PREFIX}LOGOUT`;

/**
 * @typedef {Object} CrudoAction
 * @property {string} type
 */

const getRawObjectState = () => ({
	data: {},
	error: null,
	crudoState:CrudoState.INITIAL,
	//storeBy: 'id',
	//storeBy:'id',
	storeBy: '_id',
});

const getCustomRawObjectState = ({data, crudoState, storeBy}) => ({
	data: data ? data : {},
	error: null,
	crudoState: crudoState ? crudoState : CrudoState.INITIAL,
	storeBy: storeBy ? storeBy : '_id',
	//storeBy:'id',
});

const debug = require('debug')('http');

const initObjectSate = (sourceObject) => {
	let result = fromJS(getRawObjectState())
	if (sourceObject) {
		result = result.set("storeBy",sourceObject.get("storeBy"));
	}
	return result;
};

const reassignProp = (item, oldName, newName) => {
	// Do nothing if the names are the same
	if (oldName === newName) {
		return item;
	}
	// Check for the old property name to avoid a ReferenceError in strict mode.
	if (item && Object.prototype.hasOwnProperty.call(item, oldName)) {
		// eslint-disable-next-line  no-param-reassign
		item[newName] = item[oldName];
	}
	return item;
};

/**
 * @typedef {Object} CrudoAuthState
 * @property {string} state
 * @property {Object} [user]
 */
/** @type {CrudoAuthState} */const initialAuthState = {
	state: AuthState.NONE,
};

function prepareInitialState(objects){
	let result = {};
	objects.forEach(objectInit => {
		if (typeof objectInit === "string")
			result[objectInit] = getRawObjectState()
		else  if (typeof objectInit === "object"){
			if (!objectInit.key) {
				console.warn("Object is ignored, because it's key is missing: "+JSON.stringify(objectInit));
			} else {
				result[objectInit.key] = getCustomRawObjectState(objectInit);
			}
		}

	});

	return fromJS(result);
}

let initialState = {};

const actionHandlers = {
	//----------------------------------------------------------------------------
	// get
	//----------------------------------------------------------------------------
	[actions.GET_DATA](state, { objectName, id }) {
		let gettingData;
		if (!state.hasIn([ objectName, 'data', id ])) {
			gettingData = initObjectSate(state.getIn([ objectName ]));
		}else{
			gettingData = state.getIn([ objectName, 'data', id ])
		}
		gettingData= gettingData.set('crudoState', CrudoState.LOADING);
		return state.setIn([ objectName, 'data', id ], gettingData);
	},

	[actions.GET_DATA_SUCCESS](state, { objectName, id, data, args }) {

		const imData = fromJS(Object.assign({}, data, { crudoState: CrudoState.OK }));
		let lastVersion = state.getIn([ objectName, 'data', id, 'version' ]);

		let itemData = initObjectSate(state.getIn([ objectName ]));
		itemData = itemData.merge(imData);
		itemData = itemData.set('version',  lastVersion ? lastVersion+1:1);
		if (args && args.success) {
			setTimeout(() => {
				args.success(data);
			}, 1);
		}
		return state.setIn([ objectName, 'data', id ], itemData);
	},

	[actions.GET_DATA_FAIL](state, { objectName, id, error, args }) {
		let itemData = state.getIn([ objectName, 'data', id ]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([ objectName ]));
		}
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		if (args && args.fail) {
			setTimeout(() => {
				args.fail(itemData);
			}, 1);
		}
		return state.setIn([ objectName, 'data', id ], itemData);
	},

	//----------------------------------------------------------------------------
	// invalidate data
	//----------------------------------------------------------------------------
	[actions.INVALIDATE_DATA](state, { objectName, ids }) {
		if (!objectName || !ids || ids.length === 0) return state;
		let result = state;
		ids.forEach(id => {
			result = result.setIn([ objectName, 'data', id, 'crudoState' ], CrudoState.INITIAL);
		})
		return result;
	},
	//----------------------------------------------------------------------------
	// singleton
	//----------------------------------------------------------------------------
	[actions.GET_SINGLETON](state, { objectName }) {
		const gettingData = initObjectSate(state.getIn([ objectName ]));
		gettingData.setIn('crudoState', CrudoState.LOADING);
		return state.setIn([ objectName,'data' ], gettingData);
	},

	[actions.GET_SINGLETON_SUCCESS](state, { objectName, data }) {
		const imData = fromJS(data);
		let itemData = state.getIn([ objectName ]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([ objectName ]));
		}
		itemData = itemData.set('crudoState', CrudoState.OK).set('data', imData);

		return state.setIn([ objectName ], itemData);
	},

	[actions.GET_SINGLETON_FAIL](state, { objectName, error }) {
		let itemData = state.getIn([ objectName ]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([ objectName ]));
		}
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		return state.setIn([ objectName ], itemData);
	},
	//----------------------------------------------------------------------------
	// list
	//----------------------------------------------------------------------------
	[actions.LIST_DATA](state, { objectName, listName }) {
		/*let gettingData = initObjectSate(state.getIn([ objectName ]));
		gettingData = gettingData.set('crudoState', CrudoState.LOADING);
		if (listName) {
			return state.setIn([listName], gettingData);
		}
		return state.setIn([ objectName ], gettingData);
		// leaving this here because the below might not be compatible*/
		if (listName)
			return state.setIn([ listName, 'crudoState' ], CrudoState.LOADING);
		return state.setIn([ objectName, 'crudoState' ], CrudoState.LOADING);
	},


	/**
	 * @typedef {CrudoAction} CrudoAction_ListDataSuccess
	 * @property {actions.LIST_DATA_SUCCESS} type
	 * @property {string} objectName
	 * @property {*} data
	 */
	/**
	 * Process an array of documents
	 * @param state
	 * @param {CrudoAction_ListDataSuccess} action
	 * @returns {*}
	 */
	[actions.LIST_DATA_SUCCESS](state, action) {
		const { objectName, listName, data } = action;
		let target = objectName;
		let newState = state;
		if (listName) {
			target = listName;
			const updatedIds = data.map((item) => {
				// eslint-disable-next-line no-underscore-dangle
				//if (!item.id && item._id) { return reassignProp(item, '_id', 'id'); }
				return item;
			});
			newState = newState.setIn([listName, 'list'], fromJS(updatedIds)); // FIXME: don't put listName onto the state root
		} else {
			const storeBy = state.getIn([ objectName, 'storeBy' ], '_id');
			/**
			 * FIXME: _id in the line above only suppresses a symptom of a larger issue: store.crudx.storeBy
			 * might not yet be defined at this point, which it definitely should, or at least get defined at the
			 * time we try to access it here.
			 * Hopefully fixed in loadModelDefinition saga, leaving this here just to be sure.
			 */
			data.forEach((item) => {
				if (!item) return;
				let inputItem = item;
				let itemId = inputItem[storeBy];
				/*if (!itemId) { // TODO: remove this
					// eslint-disable-next-line no-underscore-dangle
					if (item._id) inputItem = reassignProp(item, '_id', 'id');
					itemId = inputItem.id;
				}*/
				//if (itemId) {
					newState = newState.setIn([ objectName, 'data', itemId ], fromJS(Object.assign(
						{crudoState: CrudoState.OK},
						inputItem
					)));
				//}
			});
		}
		return newState.setIn([ target, 'crudoState' ], CrudoState.OK); // FIXME: this breaks with listName; see other FIXMEs
	},

	/**
	 * @typedef {CrudoAction} CrudoAction_ListDataFail
	 * @property {actions.LIST_DATA_FAIL} type
	 * @property {string} [objectName]
	 * @property {string} [listName]
	 * @property error
	 */
	/**
	 * Handle data listing error
	 * @param state
	 * @param {CrudoAction_ListDataFail} action
	 */
	[actions.LIST_DATA_FAIL] (state, action) {
		const { objectName, listName, error } = action;
		let itemData = state.getIn([ objectName ]);
		if (!itemData) itemData = initObjectSate(state.getIn([ objectName ])); // FIXME: why pass this argument?
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		if (listName) {
			return state.setIn([listName], itemData); // FIXME: don't put listName onto the state root
		}
		return state.setIn([ objectName ], itemData);
	},

	//----------------------------------------------------------------------------
	// CREATE
	//----------------------------------------------------------------------------
	[actions.CREATE_DATA](state) {
		return state; // TODO: add something, like an empty object initializer
	},
	[actions.CREATE_DATA_SUCCESS](state, {
		objectName, newId, data, args,
	}) {
		let newState = state;
		const newData = {
			crudoState: CrudoState.OK,
			data,
		};
		//newData.id = newId;
		if (newId) {
			newState = newState.setIn([ objectName, 'data', newId ], fromJS(newData));
		}
		if (args && args.success) {
			setTimeout(() => {
				args.success(newData);
			}, 1);
		}
		return newState.setIn([ objectName, 'crudoState' ], CrudoState.OK);
	},

	[actions.CREATE_DATA_FAIL](state, { error, args }) {
		if (args && args.fail) {
			setTimeout(() => {
				args.fail(error);
			}, 1);
		}
		return state;
	},

	//----------------------------------------------------------------------------
	// UPDATE
	//----------------------------------------------------------------------------
	[actions.UPDATE_DATA](state) {
		return state;
	},

	/**
	 * @typedef {CrudoAction} CrudoAction_UpdateDataSuccess
	 * @property {actions.UPDATE_DATA_SUCCESS} type
	 * @property {string} [objectName]
	 * @property {string} [listName]
	 * @property data
	 * @property args
	 * @property response
	 */
	/**
	 * @param state
	 * @param {CrudoAction_UpdateDataSuccess} action
	 */
	[actions.UPDATE_DATA_SUCCESS](state, action) {
		const { objectName, data, listName, args, response } = action;
		// TODO: call success handler + update data
		let newState = state;
		let newData = response ? response.newData : undefined;
		// const { id } = data;
		const storeBy = state.getIn([ objectName, 'storeBy' ]);
		const id = data[storeBy]
		if (objectName && id) {
			if (listName) {
				let list = state.getIn([ objectName, 'list' ]);
				const idx = list.findIndex((value) => {
					if (value.get(storeBy) === id) {
						return true;
					}
					return false;
				});
				if (idx >= 0) {
					let mergeData = list.get(idx).toJS();
					mergeData = Object.assign(mergeData, data, newData);
					list = list.set(idx, fromJS(mergeData));
					newState = state.setIn([ objectName, 'list' ], list); // TODO what is this?
				} else {
					newState = state;
					debug(`Object ${objectName} with id "${id}" not found in list ${listName}.`);
				}
			} else {
				if (!state.getIn([ objectName, 'data', id ])) {
					debug(`No object ${objectName} with id ${id} was found.`);
					if (args && args.success) {
						setTimeout(() => {
							args.success(data, response);
						}, 1);
					}
					return state;
				}
				let mergeDataUpd = state.getIn([ objectName, 'data', id ]).toJS();
				mergeDataUpd = Object.assign(mergeDataUpd, data, newData);
				mergeDataUpd.version = mergeDataUpd.version ? (mergeDataUpd.version+1):1;
				newState = state.setIn([ objectName, 'data', id ], fromJS(mergeDataUpd));
			}
		} else if (!objectName) {
			debug('Respone of updating is missing  objectName. ');
		} else {
			debug(`Respone of updating object ${objectName} is missing id`);
		}
		if (args && args.success) {
			setTimeout(() => {
				args.success(data, response);
			}, 1);
		}
		return newState;
	},

	[actions.UPDATE_DATA_FAIL](state, { error, args, response, data }) {
		if (args && args.fail) {
			setTimeout(() => {
				args.fail(error, response, data);
			}, 1);
		}
		return state;
	},

	//----------------------------------------------------------------------------
	// DELETE
	//----------------------------------------------------------------------------
	[actions.DELETE_DATA](state) {
		return state; // TODO: remove me
	},
	[actions.DELETE_DATA_SUCCESS](state, { objectName, id, args }) {
		if (objectName && id) {
			return state.deleteIn([ objectName, 'data', id ]);
		}
		if (args && args.success) {
			setTimeout(() => {
				args.success(id);
			}, 1);
		}
		return state;
	},

	[actions.DELETE_DATA_FAIL](state, { error, args }) {
		if (args && args.fail) {
			setTimeout(() => {
				args.fail(error);
			}, 1);
		}
		return state;
	},
	//----------------------------------------------------------------------------
	// LOGOUT
	//----------------------------------------------------------------------------
	[actions.CLEAR_ALL_DATA]() {
		return initialState;
	},

	// AUTHENTICATION: Unused code below.

	/*/!**
	 * Mark authentication as in progress
	 * (currently unused)
	 * @param state
	 * @returns {*}
	 *!/
	[actions.AUTHENTICATE] (state) {
		return state.update('auth', produce(auth => {
			auth.state = AuthState.IN_PROGRESS;
		}));
	},

	/!**
	 * @typedef {CrudoAction} CrudoAction_AuthenticateSuccess
	 * @property {actions.AUTHENTICATE_SUCCESS} type
	 * @property {Object} userObject
	 *!/
	/!**
	 * Mark the authentication as successful (and store the user object)
	 * (currently unused)
	 * @param state
	 * @param {CrudoAction_AuthenticateSuccess} action
	 * @returns {*}
	 *!/
	[actions.AUTHENTICATE_SUCCESS] (state, action) {
		return state.update('auth', produce(auth => {
			auth.state = AuthState.AUTHED;
			auth.user = action.userObject;
		}));
		//return state.setIn([ 'userState', 'authenticated' ], true);
	},

	/!**
	 * @typedef {CrudoAction} CrudoAction_AuthenticateFailure
	 * @property {actions.AUTHENTICATE_FAILURE} type
	 * @todo prop error ...
	 *!/
	/!**
	 * Mark the authentication as failed
	 * @todo
	 * @param state
	 * @param {CrudoAction_AuthenticateFailure} action
	 * @returns {*}
	 *!/
	[actions.AUTHENTICATE_FAILURE] (state, action) {
		return state.update('auth', produce(auth => {
			auth.state = AuthState.FAILED;
		}));
		//return state;
	},

	// TODO logout
	/!*[actions.LOGOUT] (state) {
		return state.setIn([ 'auth', 'state' ], AuthState.NONE).deleteIn([ 'auth', 'user' ]);
	},*!/

	// TODO logout failure (or maybe leave that to a saga?)*/



	/**
	 * @typedef {CrudoAction} CrudoAction_GetServerConfig
	 * @property {actions.GET_SERVER_CONFIG} type
	 */
	/**
	 * Prepare loading state for server-provided config.
	 * @param state
	 * @param {CrudoAction_GetServerConfig} action
	 * @returns {*}
	 */
	[actions.GET_SERVER_CONFIG] (state, action) {
		return state
			.set('_crudoConfig', initObjectSate())
			.setIn([ '_crudoConfig', 'crudoState' ], CrudoState.LOADING);
	},

	/**
	 * @typedef {CrudoAction} CrudoAction_GetServerConfigSuccess
	 * @property {actions.GET_SERVER_CONFIG_SUCCESS} type
	 * @property {string[]} [languages]
	 * @property {string[]} modelList
	 * @property {Object.<string, *>} models
	 */
	/**
	 * Store server-provided config
	 * @param state
	 * @param {CrudoAction_GetServerConfigSuccess} action
	 * @returns {*}
	 */
	[actions.GET_SERVER_CONFIG_SUCCESS] (state, action) {
		let newState = state
			.setIn([ '_crudoConfig', 'data' ], fromJS({
				...action,
				type: undefined,
				models: undefined,
				modelList: undefined,
			}))
			.setIn([ '_crudoConfig', 'crudoState' ], CrudoState.OK);

		for (const modelName of action.modelList) {
			newState = newState
				.setIn([ modelName, 'definition', 'crudoState' ], CrudoState.OK)
				.setIn([ modelName, 'definition', 'data' ], action.models[modelName].schema)
				.setIn([ modelName, 'refs' ], action.models[modelName].refs)
			;
			if (action.models[modelName].meta && action.models[modelName].meta.translatable)
				newState = newState.setIn([ modelName, 'translatable' ], true);
		}

		return newState;
	},

	/**
	 * @typedef {CrudoAction} CrudoAction_GetServerConfigFailure
	 * @property {actions.GET_SERVER_CONFIG_FAILURE} type
	 * @todo add other props
	 */
	/**
	 * @param state
	 * @param {CrudoAction_GetServerConfigFailure} type
	 * @returns {*}
	 */
	[actions.GET_SERVER_CONFIG_FAILURE] (state, action) {
		// TODO
		return state;
	},


};

function crudoReducer(state = initialState, action) {
	const { type } = action;
	if (type in actionHandlers) {
		return actionHandlers[type](state, action);
	}
	return state;
}
/**
 * Method will prepare CRUD reducer
 * @param  {[type]} objectsArray Names of crudo objects - to set initial state
 * @return {[type]}              The reducer
 */

export default function getCrudoReducer(objectsArray) {
	initialState = prepareInitialState(objectsArray || []); //.set('auth', initialAuthState);
		return (state = initialState, action) => {
			const { type } = action;
			if (type in actionHandlers) {
				return actionHandlers[type](state, action);
			}
			return state;
		}
}
//export default crudoReducer;
