import { actions } from './constants';

/**
 * Function gets object's data from server and store it into reducer.
 * The data are stored each time, so this function can be called also for data actualization on client side.
 * 
 * @param {string} objectName 
 * @param {string} id 
 * @param {Function} success 
 * @param {Function} fail 
 */
export function getData( objectName, id, success, fail)  {
	return {
		type: actions.GET_DATA,
		objectName,
		id,
		success,
		fail,
	};
}

/**
 * Function calls the singleton endpoint of object "objectName" ant store's the result.
 * The data are actualized each time.
 * 
 * @param {string} objectName 
 * @param {*} params 
 */
export function getSingleton( objectName, params) {
	return {
		type: actions.GET_SINGLETON,
		objectName,
		params,
	};
}

/**
 * Function creates the data on server. Server returns id of the record ant current data are stored under this id.
 * 
 * @param {string} objectName 
 * @param {*} data 
 * @param {Function} success 
 * @param {Function} fail 
 */
export function createData(objectName, data, success, fail) {
	return {
		type: actions.CREATE_DATA,
		objectName,
		data,
		success,
		fail,
	};
}

/**
 * Function updates object on server. Data must contain "id" attribute.
 * 
 * @param {string} objectName 
 * @param {*} data Object data. It must contain "id" attribute
 * @param {Function} success 
 * @param {Function} fail 
 */
export function updateData(objectName, data, success, fail) {
	return {
		type: actions.UPDATE_DATA,
		objectName,
		data,
		success,
		fail,
	};
}

/**
 * If update of "listed" data are needed, use this function.
 * 
 * @param {string} objectName 
 * @param {string} listName 
 * @param {*} data 
 * @param {Function} success 
 * @param {Function} fail 
 */
export function updateListData(objectName, listName, data, success, fail) {
	return {
		type: actions.UPDATE_DATA,
		listName,
		objectName,
		data,
		success,
		fail,
	};
}

/**
 * Delete the data from server.
 * 
 * @param {string} objectName 
 * @param {String} id 
 * @param {Function} success 
 * @param {Function} fail 
 */
export function deleteData(objectName, id, success, fail) {
	return {
		type: actions.DELETE_DATA,
		objectName,
		id,
		success,
		fail,
	};
}

/**
 * List all data from server of object "objectName"
 * 
 * @param {*} param - that contains "objectName" and optional "listName" 
 */
export function listData({ objectName, listName }) {
	return {
		type: actions.LIST_DATA,
		objectName,
		listName,
	};
}

/**
 * Reset cached data on client side
 */
export function clearData() {
	return {
		type: actions.CLEAR_ALL_DATA,
	};
}

/**
 * Call the remote function on server.
 * 
 * @param {string} objectName 
 * @param {string} rpcName 
 * @param {*} data 
 * @param {Function} success 
 * @param {Function} fail 
 */
export function rpc( objectName, rpcName, data, success, fail)  {
	return {
		type: actions.RPC,
		objectName,
		rpcName,
		data,
		success,
		fail,
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
	rpc,
}

export default crudo;
