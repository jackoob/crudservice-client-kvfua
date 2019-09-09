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
				console.warn("Object is ignored, becaus it's key is missing: "+require('util').inspect(objectInit));
			} else {
				result[objectInit.key] = getCustomRawObjectState(objectInit);
			}
		}

	});

	return fromJS(result);
}


const actionHandlers = {
	//----------------------------------------------------------------------------
	// get
	//----------------------------------------------------------------------------
	[actions.GET_DATA](state, { objectName, id }) {
		let gettingData;
		if (!state.hasIn([ 'models', objectName, 'data', id ])) {
			gettingData = initObjectSate(state.getIn([ 'models', objectName ]));
		}else{
			gettingData = state.getIn([ 'models', objectName, 'data', id ])
		}
		gettingData= gettingData.set('crudoState', CrudoState.LOADING);
		return state.setIn([ 'models', objectName, 'data', id ], gettingData);
	},

	[actions.GET_DATA_SUCCESS](state, { objectName, id, data, args }) {

		const imData = fromJS(Object.assign({},data,{crudoState: CrudoState.OK}));
		let lastVersion = state.getIn([ 'models', objectName, 'data', id, 'version' ]);

		let itemData = initObjectSate(state.getIn([ 'models', objectName ]));
		itemData = itemData.merge(imData);
		itemData = itemData.set('version',  lastVersion ? lastVersion+1:1);
		if (args && args.success) {
			setTimeout(() => {
				args.success(data);
			}, 1);
		}
		return state.setIn([ 'models', objectName, 'data', id ], itemData);
	},

	[actions.GET_DATA_FAIL](state, { objectName, id, error, args }) {
		let itemData = state.getIn([ 'models', objectName, 'data', id ]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([ 'models', objectName ]));
		}
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		if (args && args.fail) {
			setTimeout(() => {
				args.fail(itemData);
			}, 1);
		}
		return state.setIn([ 'models', objectName, 'data', id ], itemData);
	},

	//----------------------------------------------------------------------------
	// invalidate data
	//----------------------------------------------------------------------------
	[actions.INVALIDATE_DATA](state, { objectName, ids }) {
		if (!objectName || !ids || ids.length === 0) return state;
		let result = state;
		ids.forEach(id => {
			result = result.setIn([ 'models', objectName, 'data', id, 'crudoState' ], CrudoState.INITIAL);
		})
		return result;
	},
	//----------------------------------------------------------------------------
	// singleton
	//----------------------------------------------------------------------------
	[actions.GET_SINGLETON](state, { objectName }) {
		const gettingData = initObjectSate(state.getIn([ 'models', objectName ]));
		gettingData.setIn('crudoState', CrudoState.LOADING);
		return state.setIn([ 'models', objectName,'data' ], gettingData);
	},

	[actions.GET_SINGLETON_SUCCESS](state, { objectName, data }) {
		const imData = fromJS(data);
		let itemData = state.getIn([ 'models', objectName ]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([ 'models', objectName ]));
		}
		itemData = itemData.set('crudoState', CrudoState.OK).set('data', imData);

		return state.setIn([ 'models', objectName ], itemData);
	},

	[actions.GET_SINGLETON_FAIL](state, { objectName, error }) {
		let itemData = state.getIn([ 'models', objectName ]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([ 'models', objectName ]));
		}
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		return state.setIn([ 'models', objectName ], itemData);
	},
	//----------------------------------------------------------------------------
	// list
	//----------------------------------------------------------------------------
	[actions.LIST_DATA](state, { objectName, listName }) {
		/*let gettingData = initObjectSate(state.getIn([ 'models', objectName ]));
		gettingData = gettingData.set('crudoState', CrudoState.LOADING);*/
		return state.setIn([ 'models', objectName, 'crudoState' ], CrudoState.LOADING);
		/*if (listName) {
			// FIXME: repair listName-based feature
			return state.setIn([listName], gettingData); // FIXME: don't put listName onto the state root
		}
		return state.setIn([ 'models', objectName ], gettingData);*/
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
			const storeBy = state.getIn([ 'models', objectName, 'storeBy' ]);
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
					newState = newState.setIn([ 'models', objectName, 'data', itemId ], fromJS({
						crudoState: CrudoState.OK,
						data: inputItem,
					}));
				//}
			});
		}
		return newState.setIn([ 'models', target, 'crudoState' ], CrudoState.OK); // FIXME: this breaks with listName; see other FIXMEs
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
		let itemData = state.getIn([ 'models', objectName ]);
		if (!itemData) itemData = initObjectSate(state.getIn([ 'models', objectName ])); // FIXME: why pass this argument?
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		if (listName) {
			return state.setIn([listName], itemData); // FIXME: don't put listName onto the state root
		}
		return state.setIn([ 'models', objectName ], itemData);
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
			state: CrudoState.OK,
			data,
		};
		//newData.id = newId;
		if (newId) {
			newState = newState.setIn([ 'models', objectName, 'data', newId ], fromJS(newData));
		}
		if (args && args.success) {
			setTimeout(() => {
				args.success(newData);
			}, 1);
		}
		return newState.setIn([ 'models', objectName, 'crudoState' ], CrudoState.OK);
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
		const storeBy = state.getIn([ 'models', objectName, 'storeBy' ]);
		const id = data[storeBy]
		if (objectName && id) {
			if (listName) {
				let list = state.getIn([ 'models', objectName, 'list' ]);
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
					newState = state.setIn([ 'models', objectName, 'list' ], list); // TODO what is this?
				} else {
					newState = state;
					debug(`Object ${objectName} with id "${id}" not found in list ${listName}.`);
				}
			} else {
				if (!state.getIn([ 'models', objectName, 'data', id ])) {
					debug(`No object ${objectName} with id ${id} was found.`);
					if (args && args.success) {
						setTimeout(() => {
							args.success(data, response);
						}, 1);
					}
					return state;
				}
				let mergeDataUpd = state.getIn([ 'models', objectName, 'data', id ]).toJS();
				mergeDataUpd = Object.assign(mergeDataUpd, data, newData);
				mergeDataUpd.version = mergeDataUpd.version ? (mergeDataUpd.version+1):1;
				newState = state.setIn([ 'models', objectName, 'data', id ], fromJS(mergeDataUpd));
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
			return state.deleteIn([ 'models', objectName, 'data', id ]);
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


	// CRUDO v2


	/**
	 * Mark authentication as in progress
	 * @param state
	 * @returns {*}
	 */
	[actions.AUTHENTICATE] (state) {
		return state.update('auth', produce(auth => {
			auth.state = AuthState.IN_PROGRESS;
		}));
	},

	/**
	 * @typedef {CrudoAction} CrudoAction_AuthenticateSuccess
	 * @property {actions.AUTHENTICATE_SUCCESS} type
	 * @property {Object} userObject
	 */
	/**
	 * Mark the authentication as successful (and store the user object)
	 * @param state
	 * @param {CrudoAction_AuthenticateSuccess} action
	 * @returns {*}
	 */
	[actions.AUTHENTICATE_SUCCESS] (state, action) {
		return state.update('auth', produce(auth => {
			auth.state = AuthState.AUTHED;
			auth.user = action.userObject;
		}));
		//return state.setIn([ 'userState', 'authenticated' ], true);
	},

	/**
	 * @typedef {CrudoAction} CrudoAction_AuthenticateFailure
	 * @property {actions.AUTHENTICATE_FAILURE} type
	 * @todo prop error ...
	 */
	/**
	 * Mark the authentication as failed
	 * @todo
	 * @param state
	 * @param {CrudoAction_AuthenticateFailure} action
	 * @returns {*}
	 */
	[actions.AUTHENTICATE_FAILURE] (state, action) {
		return state.update('auth', produce(auth => {
			auth.state = AuthState.FAILED;
		}));
		//return state;
	},

	// TODO logout
	/*[actions.LOGOUT] (state) {
		return state.setIn([ 'auth', 'state' ], AuthState.NONE).deleteIn([ 'auth', 'user' ]);
	},*/

	// TODO logout failure (or maybe leave that to a saga?)



	/**
	 * @typedef {CrudoAction} CrudoListModelsSuccessAction
	 * @property {actions.LIST_MODELS_SUCCESS} type
	 * @property {*} data
	 */
	/**
	 * Get a list of models from a server
	 * @param state
	 * @param {CrudoListModelsSuccessAction} action
	 * @return {*}
	 */
	[actions.LIST_MODELS_SUCCESS] (state, action) {
		//console.log(state);
		/*return state.set('models', ImmuMap(action.data.reduce((accu, modelName) => ({
				...accu,
				[modelName]: null,
		}), {})));*/
		// TODO: only if not already set or something.
		return state.set('models', prepareInitialState(action.data)); // TODO: rid me of the 'storeBy' argument
	},

	// todo actions.LOAD_MODEL_FAILURE


	/**
	 * @typedef {CrudoAction} CrudoAction_LoadModelDefinition
	 * @property {actions.LOAD_MODEL_DEFINITION} type
	 * @property {string} modelName
	 */
	/**
	 * ACTION HANDLER: Load a model definition from its server
	 * @param state
	 * @param {CrudoAction_LoadModelDefinition} action
	 * @return {*}
	 */
	[actions.LOAD_MODEL_DEFINITION] (state, action) {
		/*const p = prepareInitialState([action.modelName]).get(action.modelName) // OPTIMIZE: I'm ugly
		return state.setIn([ 'models', action.modelName ], p)*/
		return state.setIn([ 'models', action.modelName, 'definition', 'crudoState' ], CrudoState.LOADING);
	},

	/**
	 * @typedef {CrudoAction} CrudoAction_LoadModelDefinitionSuccess
	 * @property {actions.LOAD_MODEL_DEFINITION_SUCCESS} type
	 * @property {string} modelName
	 * @property {*} model Model definition
	 */
	/**
	 * ACTION HANDLER: Process loaded model definition
	 * @param state
	 * @param {CrudoAction_LoadModelDefinitionSuccess} action
	 * @return {*}
	 */
	[actions.LOAD_MODEL_DEFINITION_SUCCESS] (state, action) {
		let newState = state
			.setIn([ 'models', action.modelName, 'definition', 'crudoState' ], CrudoState.OK)
			.setIn([ 'models', action.modelName, 'definition', 'data'], action.model.schema);
		if (action.model.meta && action.model.meta.translatable) newState = newState.setIn([ 'models', action.modelName, 'translatable' ], true);
		return newState;
		/*return state.setIn([ 'models', action.modelName ], action.model).updateIn(['models',action.modelName], s=> {
			s.crudoState
		}'],CrudoState.OK)*/
	}
	// todo fail

	// todo new get actions

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
	let initialState = prepareInitialState(/*objectsArray*/ []).set('auth', initialAuthState);
		return (state = initialState, action) => {
			const { type } = action;
			if (type in actionHandlers) {
				return actionHandlers[type](state, action);
			}
			return state;
		}
}
//export default crudoReducer;
