import { createSelector } from 'reselect';
import { CrudoState } from './constants';
import { fromJS } from 'immutable';
import { getCrudData } from '..';

const initialObjectState = fromJS({ crudoState: CrudoState.INITIAL });
const loadingObjectState = fromJS({ crudoState: CrudoState.LOADING });

export const getCrudoObjectSelector = (objectName, propsDataKey) => {
	return (state, props) => {
		const result = state.crudo.getIn([objectName, 'data', props[propsDataKey]]);
		if (!result){
			if (state.crudo.getIn([objectName,'crudoState'])==CrudoState.LOADING)
				return loadingObjectState;
		}
		if (!result || !result.has('_id'))
			return initialObjectState;
		return result;
	}
}

export var getObjectState = (state, objectName) => { return state.crudo.getIn([objectName, 'crudoState']) };
export var objectNeedsToLoad = (state, objectName) => { return state.crudo.getIn([objectName, 'crudoState']) === CrudoState.INITIAL };


//-------------------------------------------------
// internal selectors


const crudoDataSelectorsByName = {};
const crudoDataSelectorByName = ( objectName ) => {
	if (!crudoDataSelectorsByName[objectName])	{
		crudoDataSelectorsByName[objectName] = ( crudoReducer, id ) => {
			if (Array.isArray(id)) {
				return crudoReducer.getIn([objectName, 'data', ...id]);
			}
			return crudoReducer.getIn([objectName, 'data', id]);
		}
	}
	return crudoDataSelectorsByName[objectName];
};

const crudoStateSelectorsByName = {};
const crudoStateSelectorByName = ( objectName ) => {
	if (!crudoStateSelectorsByName[objectName])	{
		crudoStateSelectorsByName[objectName] = ( crudoReducer, id ) => {
			let resultState = null;
			if (Array.isArray(id))
				resultState = crudoReducer.getIn([objectName, 'data', ...id, 'crudoState']);
			else
				resultState = crudoReducer.getIn([objectName, 'data', id, 'crudoState']);
			if (!resultState)
				resultState = crudoReducer.getIn([objectName, 'crudoState']);
			return resultState;
		}
	}
	return crudoStateSelectorsByName[objectName];
};


//-------------------------------------------------

const CRUDO_INITIAL = { crudoState: CrudoState.INITIAL }
const CRUDO_FAIL = { crudoState: CrudoState.FAIL }

const getObjecId= (id) => {
	if (Array.isArray(id)){
		return id.join(";");
	}
	return id;
}
const crudoSelectors = {};

export const getCrudoObject = (crudoStore, objectName, objectId) => {
	let id = getObjecId(objectId);
	let crudoSource = crudoStore.crudo ? crudoStore.crudo : crudoStore;
	if (!crudoSelectors[objectName]) crudoSelectors[objectName]={};
	if (!crudoSelectors[objectName][id]){
		crudoSelectors[objectName][id]=createSelector( 
			[crudoStateSelectorByName(objectName), crudoDataSelectorByName(objectName)],
			(crudoState, data) => {
				if (!crudoState && !data) return { crudoState: CrudoState.INITIAL };
				if (!data) return { crudoState };
				// console.log("selector - "+objectName);
				return Object.assign({}, {crudoState}, data.toJS() ); 
			}
		)
	}
	return crudoSelectors[objectName][id](crudoSource, objectId);
}

export const getCrudoObjectOld = (crudoReducer, objectName, objectId) => {
	let id = null;
	if (Array.isArray(objectId))
		id = objectId;
	else
		id = [`${objectId}`];
	let crudoState = crudoReducer.getIn([objectName, 'crudoState']);
	let immuData = crudoReducer.getIn([objectName, 'data', ...id]);
	// object can have it's own state. If it has, preffer this state
	if (immuData && immuData.has('crudoState')){
		crudoState = immuData.get('crudoState');
	}
	if (!crudoState && !immuData) {
		 return { crudoState: CrudoState.INITIAL };
	}
	if (!immuData) return { crudoState };
	const obj = immuData ? immuData.toJS() : { crudoState: CrudoState.FAIL };
	const newObj = Object.assign({}, {crudoState}, obj );
	// console.log("getCrudoObject - " + objectName);
	return newObj;
};

export const getCrudoSingleton = (crudoReducer, objectName) => {
	const crudoState = crudoReducer.getIn([objectName, 'crudoState']);
	const immuData = crudoReducer.getIn([objectName, 'data']);
	if (!immuData) return { crudoState };
	const obj = immuData ? immuData.toJS() : { crudoState: CrudoState.FAIL };
	const newObj = { ...obj, crudoState };
	return newObj;
};


export const getCrudoRefObject = (crudoReducer, srcObject, parameter, referenceobjectName) => {
	const crudoState = crudoReducer.getIn([referenceobjectName, 'crudoState']);

	if (crudoState !== CrudoState.OK) return { crudoState };

	if (!srcObject) return { crudoState: CrudoState.FAIL };
	if (srcObject.crudoState !== CrudoState.OK) {
		return { crudoState: srcObject.crudoState };
	}
	if (!Object.prototype.hasOwnProperty.call(srcObject, parameter)) {
		return { crudoState: CrudoState.FAIL };
	}

	const id = `${srcObject[parameter]}`;
	const immuData = crudoReducer.getIn([referenceobjectName, 'data', id]);
	if (!immuData) return { crudoState };
	const obj = immuData ? immuData.toJS() : { crudoState: CrudoState.FAIL };
	// console.log("getCrudoRefObject - " + referenceobjectName);
	return { ...obj, crudoState };0
};

export const getCrudoRefArray = (crudoReducer, srcObject, parameter, referenceobjectName) => {
	const crudoState = crudoReducer.getIn([referenceobjectName, 'crudoState']);

	if (crudoState !== CrudoState.OK) return { crudoState };

	if (!srcObject) return { crudoState: CrudoState.FAIL };
	if (srcObject.crudoState !== CrudoState.OK) {
		return { crudoState: srcObject.crudoState };
	}

	if (!Object.prototype.hasOwnProperty.call(srcObject, parameter)) {
		return { crudoState: CrudoState.FAIL };
	}

	const ids = srcObject[parameter];
	const result = [];
	if (!ids || ids.length === 0) return result;
	ids.forEach((id) => {
		const immuData = crudoReducer.getIn([referenceobjectName, 'data', `${id}`]);
		if (immuData) {
			const obj = immuData ? immuData.toJS() : { crudoState: CrudoState.FAIL };
			result.push(obj);
		}
	});
	// console.log("getCrudoRefArray - " + referenceobjectName);

	return { data: result, crudoState };
};

const getCrudArraSelectors = {};

/**
 * TODO: optimalize with selectors
 * @param {*} crudoReducer 
 * @param {*} objectName 
 */
export const getCrudArray = (crudoReducer, objectName) => {
	let crudo = crudoReducer.crudo ? crudoReducer.crudo : crudoReducer;
	const crudoState = crudo.getIn([objectName, 'crudoState']);
	if (crudoState !== CrudoState.OK) return [];
	const immuData = crudo.getIn([objectName, 'data']);
	if (!immuData) return [];
	var result = [];
	const data = immuData.toJS();
	Object.keys(data).forEach((key) => {
		if (!data[key].crudoState || data[key].crudoState === CrudoState.OK)
			result.push(data[key]);
	});
	// console.log("getCrudArray - " + objectName);
	return result;
};

const crudOrderedArraySelectors = {};
const crudOrderedArrayComparators = {};

/**
 * Create selector for getting ordered data. There can be used custom comparator. 
 * 
 * @param {*} state 
 * @param {*} objectName 
 * @param {*} customSort 
 */
export var getCrudArrayOrdered = function (state, objectName, customComparator = null) {
	let theComparator = customComparator ? customComparator : orderComparator;
	if (crudOrderedArrayComparators[objectName] !== theComparator) {
		crudOrderedArrayComparators[objectName] = theComparator;
		crudOrderedArraySelectors[objectName] = createSelector(
			[getCrudData(objectName)],
			(data) => {
				var result = [];
				if (!data) return result;
				Object.keys(data).forEach(function (key) {
					if (!data[key].crudoState || data[key].crudoState === CrudoState.OK) result.push(data[key]);
				});
				if (result.length > 0) {
					result.sort(theComparator);
				}
				return result;
			},
		);
	}
	return crudOrderedArraySelectors[objectName](state);
}

export const orderComparator = (a, b) => {
	if (!a || !b){
		if (!a && !b) return 0;
		if (a)
			return 1;
		return -1;
	}
	if (!a._meta || !b._meta){
		if (!a._meta && !b._meta) return 0;
		if (a._meta)
			return 1;
		return -1;
	}
	if (!a._meta.order || !b._meta.order) {
		if (!a._meta.order && !b._meta.order) return 0;
		if (a._meta.order)
			return 1;
		return -1;
	}

	return a._meta.order - !b._meta.order;
}