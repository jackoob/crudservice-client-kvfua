import { call, put, takeEvery } from 'redux-saga/effects';
// TODO:remove all delays
import urlResolve from "url";
import { delay } from 'redux-saga';
import { actions } from './constants';

/**
 * Prepare initial configurations of objects for saga.  Sample objects is mixed array, wher item can be string 
 * or object with "key", eg:
 * [
		'shop', - object name
		{
			key: 'shopItem', - object name
			storeBy: 'key', - "key" attribute of "shopItem", that will be used as identification on client side, it is used as default object identification. It is used in UPDATE and LIST functions.
			remoteIdentification: '_id' - if server is not prepared to manipulate the object by parameter "key", this attribute defines, which attribute is use as object identification on server side
		},
		{
			key: 'invoice', - object name
		    server: 'pay',  - server is different from default, it's alias is "pay"
		}
	],
 * 
 * 
 * @param {*} objects 
 */
export function prepareObjectsConfig(objects) {
	let result = {};
	objects.forEach(objectInit => {
		if (typeof objectInit === "object") {
			if (objectInit.key) {
				result[objectInit.key] = Object.assign({}, objectInit);
				delete result[objectInit.key].key;
			}
		}
	});
	return result;
}

export function getCookie(cname) {
	const name = `${cname}=`;
	const ca = decodeURIComponent(document.cookie).split(';');
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) === 0) {
			return c.substring(name.length, c.length);
		}
	}
	return null;
}

function addQuery(url, query) {
	if (!query) {
		return url;
	}
	let resultQuery = '';
	if (typeof query === "string") {
		resultQuery = query;
	} else {
		resultQuery = Object.keys(query)
			.map((key) => {
				if (typeof (query[key]) !== 'undefined') {
					return (`${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`);
				}
			})
			.join('&');
	}
	if (!resultQuery.startsWith("?")) {
		resultQuery = "?" + resultQuery;
	}
	return url + resultQuery;
}

/**
 * Return default header for fetch request.
 * @param {*} cookieToken 
 */
const getHeaders = (cookieToken) => {
	const headers = {
		Accept: 'application/json, text/plain, */*',
		'Content-Type': 'application/json',
	};
	return headers;
};

/**
 * Object can have different name on server. This allows to name one object on server by many different names in client.
 * This function will get the correct object's server name by the "objectName"
 * @param {*} objectsMap 
 * @param {*} objectName 
 */
const getApiObject = (objectsMap, objectName) => {
	let apiObject = objectName;
	if (Object.prototype.hasOwnProperty.call(objectsMap, objectName)) {
		apiObject = objectsMap[objectName];
	}
	return apiObject;
};

const getObjectIdentifier = (data, crudObjects, objectName) => {
	if (!data) {
		throw "Object " + objectName + " is undefined.";
	}
	let id;
	if (!crudObjects[objectName] || !crudObjects[objectName].storeBy) {
		id = data.id;
		if (!id) id = data._id;

	} else {
		let remoteStoreBy = crudObjects[objectName].storeBy;
		if (crudObjects[objectName].remoteIdentification)
			remoteStoreBy = crudObjects[objectName].remoteIdentification;
		id = data[remoteStoreBy];
	}
	if (!id) {
		throw "Object " + objectName + " is missing identifier.";
	}
	return id;

};

const getObjectUrlId = (id, crudObjects, objectName) => {
	if (!Array.isArray(id))
		return id;
	let storeByIds = crudObjects[objectName].storeBy;

	var res = `${id[0]}?`;// do not move this line next to the forcycle. The compilator will include this line into initialization of for-loop and the "return" will be broken.

	if (!Array.isArray(storeByIds)) {
		throw new Error(`Object '${objectName}' expects one identificator. Change "storeBy" of '${objectName}' into array in CRUD object config or send only object identfication (instead of array) .`);
	}

	for (let i = 1; i < storeByIds.length; i++) {
		if (id[i]) {
			res += `${storeByIds[i]}=${id[i]}&`;
		}
	}
	return res;

}

/**
 * Function will find and return server, where the object "objectName" is stored.
 * 
 * @param {*} defaultServerUrl the default server url used if "objectName" has not defined specific server
 * @param {*} crudObjects objects definition
 * @param {*} objectName object name
 * @param {*} servers object, which properties are server names used in object definitions.
 */
const getServer = (defaultServerUrl, crudObjects, objectName, servers = {}) => {
	if (!objectName) {
		throw "Object " + objectName + " is undefined.";
	}

	let resultServerAlias = null;
	if (crudObjects[objectName] && crudObjects[objectName].server) {
		resultServerAlias = crudObjects[objectName].server;
	}

	let resultUrl = null;
	if (!resultServerAlias || objectName === 'default') {
		resultUrl = defaultServerUrl;
	} else if (servers && servers[resultServerAlias]) {
		resultUrl = servers[resultServerAlias];
	} else {
		throw "Server" + resultServerAlias + " is not defined in config.";
	}

	return resultUrl;
};


export function* getObject({ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest }, args) {
	const { objectName, id, query } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);

		let api = urlResolve.resolve(serverUrl, `${apiObject}/${getObjectUrlId(id, crudObjects, objectName)}`);
		api = addQuery(api, query);
		let fetchData = {
			method: 'GET',
			headers: getHeaders(cookieToken),
			credentials: 'include',
		};
		if (customizeFetchRequest) {
			fetchData = customizeFetchRequest(fetchData, actions.GET_DATA);
		}
		const fetchResponse = yield call(fetch, api, fetchData);
		const response = yield call([fetchResponse, fetchResponse.json]);

		if (fetchResponse.ok) {
			const { data } = response;
			yield put({
				type: actions.GET_DATA_SUCCESS,
				objectName,
				data,
				id,
				args,
			});
		} else {
			const error = getErrorResponse(fetchResponse, response);
			yield put({
				type: actions.GET_DATA_FAIL,
				objectName,
				error,
				id,
				args,
			});
		}
	} catch (exception) {
		const error = {
			status: 404,
			statusText: '',
			error: 'Problem with contacting the server.',
		};
		yield put({
			type: actions.GET_DATA_FAIL,
			objectName,
			error,
			id,
			args,
		});
	}
}

export function* getSingleton({ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest }, args) {
	const { objectName, params, query } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);
		// const api = `${serverUrl}/${apiObject}/singleton`;
		let api = urlResolve.resolve(serverUrl, `${apiObject}/singleton`);
		api = addQuery(api, query);
		let fetchData = {
			method: 'POST',
			headers: getHeaders(cookieToken),
			body: JSON.stringify(params),
			credentials: 'include',
		};

		if (customizeFetchRequest) {
			fetchData = customizeFetchRequest(fetchData, actions.GET_SINGLETON);
		}

		const fetchResponse = yield call(fetch, api, fetchData);
		const response = yield call([fetchResponse, fetchResponse.json]);

		if (fetchResponse.ok) {
			const { data } = response;
			yield put({
				type: actions.GET_SINGLETON_SUCCESS,
				objectName,
				data,
				args,
			});
		} else {
			const error = getErrorResponse(fetchResponse, response);
			yield put({
				type: actions.GET_SINGLETON_FAIL,
				objectName,
				error,
				args,
			});
		}
	} catch (exception) {
		const error = {
			status: 404,
			statusText: '',
			error: 'Problem with contacting the server.',
		};
		yield put({
			type: actions.GET_SINGLETON_FAIL,
			objectName,
			error,
			args,
		});
	}
}
export function* listData({ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest }, { objectName, listName, query }) {
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);
		let api = urlResolve.resolve(serverUrl, `${apiObject}/all`);
		api = addQuery(api, query);
		let fetchData = {
			method: 'GET',
			headers: getHeaders(cookieToken),
			credentials: 'include',
		};
		if (customizeFetchRequest) {
			fetchData = customizeFetchRequest(fetchData, actions.LIST_DATA);
		}

		const fetchResponse = yield call(fetch, api, fetchData);

		const response = yield call([fetchResponse, fetchResponse.json]);

		const error = { error: 'Problem with calling server' };
		if (response && response.status === 'success') {
			const { data } = response;
			yield put({
				type: actions.LIST_DATA_SUCCESS,
				objectName,
				listName,
				data,
			});
		} else {
			yield put({
				type: actions.LIST_DATA_FAIL,
				objectName,
				listName,
				error,
			});
		}
	} catch (exception) {
		yield put({
			type: actions.LIST_DATA_FAIL,
			objectName,
			listName,
			error: exception,
		});
	}
}

const getErrorResponse = (fetchResponse, responseData) => {
	if (fetchResponse.OK) {
		return null;
	}
	return {
		status: fetchResponse.status,
		statusText: fetchResponse.statusText,
		error: responseData.description,
		faultyProperty: responseData.faultyProperty,
	};
};

export function* createObject({ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest }, args) {
	const { objectName, data, query } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);
		let api = urlResolve.resolve(serverUrl, `${apiObject}/create`);
		api = addQuery(api, query);
		let fetchData = {
			method: 'POST',
			headers: getHeaders(cookieToken),
			body: JSON.stringify(data),
			credentials: 'include',
		};
		if (customizeFetchRequest) {
			fetchData = customizeFetchRequest(fetchData, actions.CREATE_DATA);
		}

		const fetchResponse = yield call(fetch, api, fetchData);
		const response = yield call([fetchResponse, fetchResponse.json]);

		// if (response && response.status === 'success') {
		if (fetchResponse.ok) {
			const newId = response.created.items[0];

			yield put({
				type: actions.CREATE_DATA_SUCCESS,
				objectName,
				newId,
				data,
				args,
				response,
			});
		} else {
			const error = getErrorResponse(fetchResponse, response);
			yield put({
				type: actions.CREATE_DATA_FAIL,
				objectName,
				error,
				args,
				response,
			});
		}
		yield* checkAndProcessCallbacks(response);
	} catch (exception) {
		const error = {
			status: 404,
			statusText: '',
			error: 'Problem with contacting the server.',
		};
		yield put({
			type: actions.CREATE_DATA_FAIL,
			objectName,
			error,
			args,
		});
	}
}

export function* updateObject({ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest }, args) {
	const { objectName, listName, data, query } = args;

	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const key = getObjectIdentifier(data, crudObjects, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);
		let api = urlResolve.resolve(serverUrl, `${apiObject}/${key}`);
		api = addQuery(api, query);

		let sendData = Object.assign({}, data);
		delete sendData.crudoState;
		delete sendData.version;
		if (sendData.id && !sendData._id) sendData._id = sendData.id;
		delete sendData.id;


		let fetchData = {
			method: 'PUT',
			headers: getHeaders(cookieToken),
			body: JSON.stringify(sendData),
			credentials: 'include',
		};
		if (customizeFetchRequest) {
			fetchData = customizeFetchRequest(fetchData, actions.UPDATE_DATA);
		}


		const fetchResponse = yield call(fetch, api, fetchData);

		// ------------------------------------------------------------------------

		const response = yield call([fetchResponse, fetchResponse.json]);

		// ------------------------------------------------------------------------
		const error = { error: 'Problem with calling server' };
		if (response && response.status === 'success') {
			yield put({
				type: actions.UPDATE_DATA_SUCCESS,
				objectName,
				listName,
				data,
				args,
				response,
			});
		} else {
			yield put({
				type: actions.UPDATE_DATA_FAIL,
				objectName,
				listName,
				error,
				data,
				args,
				response,
			});
		}
		yield* checkAndProcessCallbacks(response);

	} catch (exception) {
		yield put({
			type: actions.UPDATE_DATA_FAIL,
			objectName,
			listName,
			args,
			data,
			error: exception,
		});
	}
}




export function* deleteObject({ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest }, args) {
	const { objectName, id, query } = args;

	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);
		let api = urlResolve.resolve(serverUrl, `${apiObject}/${id}`);
		api = addQuery(api, query);

		let fetchData = {
			method: 'DELETE',
			headers: getHeaders(cookieToken),
			credentials: 'include',
		};
		if (customizeFetchRequest) {
			fetchData = customizeFetchRequest(fetchData, actions.DELETE_DATA);
		}

		const fetchResponse = yield call(fetch, api, fetchData);

		// ------------------------------------------------------------------------

		const response = yield call([fetchResponse, fetchResponse.json]);

		const error = { error: 'Problem with calling server' };
		if (fetchResponse.ok) {
			yield put({
				type: actions.DELETE_DATA_SUCCESS,
				objectName,
				id,
				args,
			});

		} else {
			yield put({
				type: actions.DELETE_DATA_FAIL,
				objectName,
				error,
				args,
			});
		}
		yield* checkAndProcessCallbacks(response);
	} catch (exception) {
		yield put({
			type: actions.DELETE_DATA_FAIL,
			objectName,
			error: exception,
			args,
		});
	}
}



export function* callRPC({ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest }, args) {
	const { objectName, rpcName, data, success, fail, query } = args;

	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);
		let api = urlResolve.resolve(serverUrl, `${apiObject}/${rpcName}`);
		api = addQuery(api, query);
		// console.log(headers);
		
		const headers = getHeaders(cookieToken);
		let fetchData = {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(data),
			credentials: 'include',
		};

		if (customizeFetchRequest) {
			fetchData = customizeFetchRequest(fetchData, actions.RPC);
		}
		const fetchResponse = yield call(fetch, api, fetchData);
		// ------------------------------------------------------------------------

		const response = yield call([fetchResponse, fetchResponse.json]);

		const error = { error: 'Problem with calling server', response: fetchResponse };
		if (fetchResponse.ok) {

			if (success) {
				success(response.data);
			}
		} else {
			if (fail) {
				fail(error);
			}
		}
		yield* checkAndProcessCallbacks(response);

	} catch (exception) {
		if (fail) {
			fail(exception, {});
		}
	}
}

function* checkAndProcessCallbacks(response) {
	if (response && response.callbacks && Array.isArray(response.callbacks)) {
		yield put({
			type: actions.PROCESS_CALLBACKS,
			callbacks: response.callbacks,
		});
	}
}

// export sagas
/**
 * Saga params contains:
 *  url - the server url
 *  cookieToken - cookie token, if it is used
 *  objectsMap - map of object names (aliases)
 *  crudObjects - definition of crudo objects  it can be string (name of crud object), or object:
 *     - key - name of crud object
 *     - storeBy - attribute of object tha
 *     - remoteIdentification - id attribute for getting from server, if it is different from "storedBy", used in update
 *     - server - where the object is stored in)
 *  servers - list of serers
 *  customizeFetchRequest (fetchData, action)- function, that can customize the request's fetchData
 *    - sample fetchData:
 * 			{ method: 'POST',
 * 			headers: headers,
 * 			body: JSON.stringify(data),
 * 			credentials: 'include' }
 *	  - action:  actions.GET_DATA|GET_SINGLETON|LIST_DATA|CREATE_DATA|UPDATE_DATA|DELETE_DATA|RPC
 * 
 * 
 * @param {*} rawSagaParams 
 */
export const getCudoSaga = (rawSagaParams) => {
	const sagaParams = Object.assign({}, rawSagaParams);
	sagaParams.crudObjects = prepareObjectsConfig(rawSagaParams.crudObjects);
	return [
		takeEvery(actions.GET_DATA, getObject, sagaParams),
		takeEvery(actions.GET_SINGLETON, getSingleton, sagaParams),
		takeEvery(actions.LIST_DATA, listData, sagaParams),
		takeEvery(actions.CREATE_DATA, createObject, sagaParams),
		takeEvery(actions.UPDATE_DATA, updateObject, sagaParams),
		takeEvery(actions.DELETE_DATA, deleteObject, sagaParams),
		takeEvery(actions.RPC, callRPC, sagaParams),
	]
};
