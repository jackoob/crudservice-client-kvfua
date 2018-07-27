import { fromJS } from 'immutable';
import { actions, CrudoState } from './constants';

//import { LOGOUT } from '../session/constants';
//TODO: import LOGOUT from auth-session
export const PREFIX = 'app/Login/';
export const LOGOUT = `${PREFIX}LOGOUT`;


const getRawObjectState = () => ({
	data: {},
	error: null,
	crudoState:CrudoState.INITIAL,
	storeBy: 'id',
	//storeBy:'id',
});

const getCustomRawObjectState = ({data, crudoState, storeBy}) => ({
	data: data ? data : {},
	error: null,
	crudoState: crudoState ? crudoState : CrudoState.INITIAL,
	storeBy: storeBy ? storeBy : 'id',
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
		const gettingData = initObjectSate(state.getIn([objectName]));
		gettingData.setIn('crudoState', CrudoState.LOADING);
		return state.setIn([objectName, 'data', id], gettingData);
	},

	[actions.GET_DATA_SUCCESS](state, { objectName, id, data, args }) {

		const imData = fromJS(Object.assign({},data,{crudoState: CrudoState.OK}));
		let itemData = state.getIn([objectName, 'data', id]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([objectName]));
		}
		itemData = itemData.merge(imData);
		if (args && args.success) {
			setTimeout(() => {
				args.success(data);
			}, 1);
		}
		return state.setIn([objectName, 'data', id], itemData);
	},

	[actions.GET_DATA_FAIL](state, { objectName, id, error, args }) {
		let itemData = state.getIn([objectName, 'data', id]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([objectName]));
		}
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		if (args && args.success) {
			setTimeout(() => {
				args.success(itemData);
			}, 1);
		}
		return state.setIn([objectName,'data', id], itemData);
	},

	//----------------------------------------------------------------------------
	// invalidate data
	//----------------------------------------------------------------------------
	[actions.INVALIDATE_DATA](state, { objectName, ids }) {
		if (!objectName || !ids || ids.length === 0) return state;
		let result = state;
		ids.forEach(id => {
			result = result.setIn([objectName, 'data', id, 'crudoState'], CrudoState.INITIAL);
		})
		return result;
	},
	//----------------------------------------------------------------------------
	// singleton
	//----------------------------------------------------------------------------
	[actions.GET_SINGLETON](state, { objectName }) {
		const gettingData = initObjectSate(state.getIn([objectName]));
		gettingData.setIn('crudoState', CrudoState.LOADING);
		return state.setIn([objectName,'data'], gettingData);
	},

	[actions.GET_SINGLETON_SUCCESS](state, { objectName, data }) {
		const imData = fromJS(data);
		let itemData = state.getIn([objectName]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([objectName]));
		}
		itemData = itemData.set('crudoState', CrudoState.OK).set('data', imData);

		return state.setIn([objectName], itemData);
	},

	[actions.GET_SINGLETON_FAIL](state, { objectName, error }) {
		let itemData = state.getIn([objectName]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([objectName]));
		}
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		return state.setIn([objectName], itemData);
	},
	//----------------------------------------------------------------------------
	// list
	//----------------------------------------------------------------------------
	[actions.LIST_DATA](state, { objectName, listName }) {
		let gettingData = initObjectSate(state.getIn([objectName]));
		gettingData = gettingData.set('crudoState', CrudoState.LOADING);
		if (listName) {
			return state.setIn([listName], gettingData);
		}
		return state.setIn([objectName], gettingData);
	},
	[actions.LIST_DATA_SUCCESS](state, { objectName, listName, data }) {
		let target = objectName;
		let newState = state;
		if (listName) {
			target = listName;
			const updatedIds = data.map((item) => {
				// eslint-disable-next-line no-underscore-dangle
				if (!item.id && item._id) { return reassignProp(item, '_id', 'id'); }
				return item;
			});
			newState = newState.setIn([listName, 'list'], fromJS(updatedIds));
		} else {
			const storeBy = state.getIn([objectName, 'storeBy']);
			data.forEach((item) => {
				let inputItem = item;
				let itemId = inputItem[storeBy];
				if (!itemId) {
					// eslint-disable-next-line no-underscore-dangle
					if (item._id) inputItem = reassignProp(item, '_id', 'id');
					itemId = inputItem.id;
				}
				if (itemId) {
					newState = newState.setIn([objectName, 'data', itemId], fromJS(inputItem));
				}
			});
		}
		return newState.setIn([target, 'crudoState'], CrudoState.OK);
	},
	[actions.LIST_DATA_FAIL](state, { objectName, listName, error }) {
		let itemData = state.getIn([objectName]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([objectName]));
		}
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		if (listName) {
			return state.setIn([listName], itemData);
		}
		return state.setIn([objectName], itemData);
	},

	//----------------------------------------------------------------------------
	// CREATE
	//----------------------------------------------------------------------------
	[actions.CREATE_DATA](state) {
		return state;
	},
	[actions.CREATE_DATA_SUCCESS](state, {
		objectName, newId, data, args,
	}) {
		let newState = state;
		const newData = data;
		newData.id = newId;
		if (newId) {
			newState = newState.setIn([objectName, 'data', newId], fromJS(newData));
		}
		if (args && args.success) {
			setTimeout(() => {
				args.success(newData);
			}, 1);
		}
		return newState.setIn([objectName, 'crudoState'], CrudoState.OK);
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
	[actions.UPDATE_DATA_SUCCESS](state, {
		objectName, data, listName, args, response,
	}) {
		// TODO: call success handler + update data
		let newState = state;
		// const { id } = data;
		const storeBy = state.getIn([objectName, 'storeBy']);
		const id = data[storeBy]
		if (objectName && id) {
			if (listName) {
				let list = state.getIn([objectName, 'list']);
				const idx = list.findIndex((value) => {
					if (value.get(storeBy) === id) {
						return true;
					}
					return false;
				});
				if (idx >= 0) {
					let mergeData = list.get(idx).toJS();
					mergeData = Object.assign(mergeData, data);
					list = list.set(idx, fromJS(mergeData));
					newState = state.setIn([objectName, 'list'], list);
				} else {
					newState = state;
					debug(`Object ${objectName} with id "${id}" not found in list ${listName}.`);
				}
			} else {
				if (!state.getIn([objectName, 'data', id])) {
					debug(`No object ${objectName} with id ${id} was found.`);
					if (args && args.success) {
						setTimeout(() => {
							args.success(data, response);
						}, 1);
					}
					return state;
				}
				let mergeDataUpd = state.getIn([objectName, 'data', id]).toJS();
				mergeDataUpd = Object.assign(mergeDataUpd, data);
				mergeDataUpd.version = mergeDataUpd.version ? (mergeDataUpd.version+1):1; 
				newState = state.setIn([objectName, 'data', id], fromJS(mergeDataUpd));
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
		return state;
	},
	[actions.DELETE_DATA_SUCCESS](state, { objectName, id, args }) {
		if (objectName && id) {
			return state.deleteIn([objectName, 'data', id]);
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
	let initialState = prepareInitialState(objectsArray);
		return (state = initialState, action) => {
			const { type } = action;
			if (type in actionHandlers) {
				return actionHandlers[type](state, action);
			}
			return state;
		}
}
//export default crudoReducer;
