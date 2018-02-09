import { actions } from './constants';

export function getData( objectType, id, success, fail)  {
	return {
		type: actions.GET_DATA,
		objectType,
		id,
		success,
		fail,
	};
}

export function getSingleton( objectType, params) {
	return {
		type: actions.GET_SINGLETON,
		objectType,
		params,
	};
}


export function createData(objectType, data, success, fail) {
	return {
		type: actions.CREATE_DATA,
		objectType,
		data,
		success,
		fail,
	};
}

export function updateData(objectType, data, success, fail) {
	return {
		type: actions.UPDATE_DATA,
		objectType,
		data,
		success,
		fail,
	};
}
export function updateListData(objectType, listName, data, success, fail) {
	return {
		type: actions.UPDATE_DATA,
		listName,
		objectType,
		data,
		success,
		fail,
	};
}

export function deleteData(objectType, id, success, fail) {
	return {
		type: actions.DELETE_DATA,
		objectType,
		id,
		success,
		fail,
	};
}

export function listData({ objectType, listName }) {
	return {
		type: actions.LIST_DATA,
		objectType,
		listName,
	};
}

export function clearData() {
	return {
		type: actions.CLEAR_ALL_DATA,
	};
}


const crudo = {
	getData,
	getSingleton,
	createData,
	updateData,
	updateListData,
	deleteData,
	listData,
	clearData,
}

export default crudo;
