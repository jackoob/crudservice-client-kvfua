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
			storeBy: 'key', - "key" attribute of "shopItem", that will be used as identification on client side, it is used as default object identification 
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
				result[objectInit.key] = Object.assign({},objectInit);
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


export function* getObject({ url, cookieToken, objectsMap, crudObjects, servers }, args) {
	const { objectName, id } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects,  apiObject, servers);
		const api = urlResolve.resolve(serverUrl, `${apiObject}/${id}` );

		const fetchResponse = yield call(fetch, api, {
			method: 'GET',
			headers: getHeaders(cookieToken),
			credentials: 'include',
		});
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

export function* getSingleton({ url, cookieToken, objectsMap, crudObjects, servers }, args) {
	const { objectName, params } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects,  apiObject, servers);
		// const api = `${serverUrl}/${apiObject}/singleton`;
		const api = urlResolve.resolve(serverUrl, `${apiObject}/singleton`);


		const fetchResponse = yield call(fetch, api, {
			method: 'POST',
			headers: getHeaders(cookieToken),
			body: JSON.stringify(params),
			credentials: 'include',
		});
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
export function* listData({ url, cookieToken, objectsMap, crudObjects, servers }, { objectName, listName }) {
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects,  apiObject, servers);
		const api = urlResolve.resolve(serverUrl, `${apiObject}/all`);

		const fetchResponse = yield call(fetch, api, {
			method: 'GET',
			headers: getHeaders(cookieToken),
			credentials: 'include',
		});

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

export function* createObject({ url, cookieToken, objectsMap, crudObjects, servers }, args) {
	const { objectName, data } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects,  apiObject, servers);
		const api = urlResolve.resolve(serverUrl, `${apiObject}/create`);

		const fetchResponse = yield call(fetch,  api, {
			method: 'POST',
			headers: getHeaders(cookieToken),
			body: JSON.stringify(data),
			credentials: 'include',
		});
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

export function* updateObject({ url, cookieToken, objectsMap, crudObjects, servers}, args) {
	const { objectName, listName, data } = args;

	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const key = getObjectIdentifier(data, crudObjects, objectName);
		const serverUrl = getServer(url, crudObjects,  apiObject, servers);
		const api = urlResolve.resolve(serverUrl,`${apiObject}/${key}`);


		let sendData = Object.assign({},data);
		delete sendData.crudoState;
		delete sendData.version;
		if (sendData.id && !sendData._id) sendData._id = sendData.id;
		delete sendData.id;
		const fetchResponse = yield call(fetch, api, {
			method: 'PUT',
			headers: getHeaders(cookieToken),
			body: JSON.stringify(sendData),
			credentials: 'include',
		});

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




export function* deleteObject({ url, cookieToken, objectsMap, crudObjects, servers }, args) {
	const { objectName, id } = args;

	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);
		const api = urlResolve.resolve(serverUrl, `${apiObject}/${id}` );

		const fetchResponse = yield call(fetch, api, {
			method: 'DELETE',
			headers: getHeaders(cookieToken),
			credentials: 'include',
		});

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



export function* callRPC({ url, cookieToken, objectsMap, crudObjects, servers}, args) {
	const { objectName, rpcName, data, success, fail } = args;

	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);
		const api = urlResolve.resolve(serverUrl, `${apiObject}/${rpcName}`);
		const headers = getHeaders(cookieToken);
		console.log(headers);
		
		let fetchData = {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(data),
			credentials: 'include',
		};

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
			callbacks:response.callbacks,
		});
	}
}


// export sagas
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
