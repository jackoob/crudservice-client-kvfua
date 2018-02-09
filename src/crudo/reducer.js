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
	[actions.GET_DATA](state, { objectType, id }) {
		const gettingData = initObjectSate();
		gettingData.setIn('crudoState', CrudoState.LOADING);
		return state.setIn([objectType, 'data', id], gettingData);
	},

	[actions.GET_DATA_SUCCESS](state, { objectType, id, data, args }) {
		const imData = fromJS(data);
		let itemData = state.getIn([objectType, 'data', id]);
		if (!itemData) {
			itemData = initObjectSate();
		}
		itemData = itemData.set('crudoState', CrudoState.OK).set('data', imData);
		if (args && args.success) {
			setTimeout(() => {
				args.success(data);
			}, 1);
		}
		return state.setIn([objectType, 'data', id], itemData);
	},

	[actions.GET_DATA_FAIL](state, { objectType, id, error, args }) {
		let itemData = state.getIn([objectType, 'data', id]);
		if (!itemData) {
			itemData = initObjectSate();
		}
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		if (args && args.success) {
			setTimeout(() => {
				args.success(newData);
			}, 1);
		}
		return state.setIn([objectType,'data', id], itemData);
	},

	//----------------------------------------------------------------------------
	// singleton
	//----------------------------------------------------------------------------
	[actions.GET_SINGLETON](state, { objectType }) {
		const gettingData = initObjectSate();
		gettingData.setIn('crudoState', CrudoState.LOADING);
		return state.setIn([objectType,'data'], gettingData);
	},

	[actions.GET_SINGLETON_SUCCESS](state, { objectType, data }) {
		const imData = fromJS(data);
		let itemData = state.getIn([objectType]);
		if (!itemData) {
			itemData = initObjectSate();
		}
		itemData = itemData.set('crudoState', CrudoState.OK).set('data', imData);

		return state.setIn([objectType], itemData);
	},

	[actions.GET_SINGLETON_FAIL](state, { objectType, error }) {
		let itemData = state.getIn([objectType]);
		if (!itemData) {
			itemData = initObjectSate();
		}
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		return state.setIn([objectType], itemData);
	},
	//----------------------------------------------------------------------------
	// list
	//----------------------------------------------------------------------------
	[actions.LIST_DATA](state, { objectType, listName }) {
		let gettingData = initObjectSate(state.getIn([objectType]));
		gettingData = gettingData.set('crudoState', CrudoState.LOADING);
		if (listName) {
			return state.setIn([listName], gettingData);
		}
		return state.setIn([objectType], gettingData);
	},
	[actions.LIST_DATA_SUCCESS](state, { objectType, listName, data }) {
		let target = objectType;
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
			const storeBy = state.getIn([objectType, 'storeBy']);
			data.forEach((item) => {
				let inputItem = item;
				let itemId = inputItem[storeBy];
				if (!itemId) {
					// eslint-disable-next-line no-underscore-dangle
					if (item._id) inputItem = reassignProp(item, '_id', 'id');
					itemId = inputItem.id;
				}
				if (itemId) {
					newState = newState.setIn([objectType, 'data', itemId], fromJS(inputItem));
				}
			});
		}
		return newState.setIn([target, 'crudoState'], CrudoState.OK);
	},
	[actions.LIST_DATA_FAIL](state, { objectType, listName, error }) {
		let itemData = state.getIn([objectType]);
		if (!itemData) {
			itemData = initObjectSate(state.getIn([objectType]));
		}
		itemData = itemData.set('crudoState', CrudoState.FAIL).set('error', error);
		if (listName) {
			return state.setIn([listName], itemData);
		}
		return state.setIn([objectType], itemData);
	},

	//----------------------------------------------------------------------------
	// CREATE
	//----------------------------------------------------------------------------
	[actions.CREATE_DATA](state) {
		return state;
	},
	[actions.CREATE_DATA_SUCCESS](state, {
		objectType, newId, data, args,
	}) {
		let newState = state;
		const newData = data;
		newData.id = newId;
		if (newId) {
			newState = newState.setIn([objectType, 'data', newId], fromJS(newData));
		}
		if (args && args.success) {
			setTimeout(() => {
				args.success(newData);
			}, 1);
		}
		return newState.setIn([objectType, 'crudoState'], CrudoState.OK);
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
		objectType, data, listName, args,
	}) {
		// TODO: call success handler + update data
		let newState = state;
		const { id } = data;
		if (objectType && id) {
			if (listName) {
				let list = state.getIn([objectType, 'list']);
				const idx = list.findIndex((value) => {
					if (value.get('id') === id) {
						return true;
					}
					return false;
				});
				if (idx >= 0) {
					let mergeData = list.get(idx).toJS();
					mergeData = Object.assign(mergeData, data);
					list = list.set(idx, fromJS(mergeData));
					newState = state.setIn([objectType, 'list'], list);
				} else {
					newState = state;
					debug(`Object ${objectType} with id "${id}" not found in list ${listName}.`);
				}
			} else {
				if (!state.getIn([objectType, 'data', id])) {
					debug(`No object ${objectType} with id ${id} was found.`);
					if (args && args.success) {
						setTimeout(() => {
							args.success(data);
						}, 1);
					}
					return state;
				}
				let mergeDataUpd = state.getIn([objectType, 'data', id]).toJS();
				mergeDataUpd = Object.assign(mergeDataUpd, data);
				newState = state.setIn([objectType, 'data', id], fromJS(mergeDataUpd));
			}
		} else if (!objectType) {
			debug('Respone of updating is missing  objectType. ');
		} else {
			debug(`Respone of updating object ${objectType} is missing id`);
		}
		if (args && args.success) {
			setTimeout(() => {
				args.success(data);
			}, 1);
		}
		return newState;
	},

	[actions.UPDATE_DATA_FAIL](state, { error, args }) {
		if (args && args.fail) {
			setTimeout(() => {
				args.fail(error);
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
	[actions.DELETE_DATA_SUCCESS](state, { objectType, id, args }) {
		if (objectType && id) {
			return state.deleteIn([objectType, 'data', id]);
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
