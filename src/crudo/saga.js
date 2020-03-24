import { call, put, takeEvery, select, race, delay, take } from 'redux-saga/effects';
// TODO:remove all delays
import urlResolve from "url";
import { actions, CrudoState } from "./constants";
import { apiRequest } from "../api";

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

/**
 * Get an unique identifier of the passed object based on its model configuration
 * @param {Object} data Object/document
 * @param {Object.<string, Object>} crudObjects
 * @param {string} objectName Model name
 * @throws {string} When the passed object is undefined or missing the identifier
 * @return {string} Unique document (object) identifier
 */
const getObjectIdentifier = (data, crudObjects, objectName) => {
	if (!data) {
		throw "Object " + objectName + " is undefined.";
	}
	let id;
	if (!crudObjects[objectName] || !crudObjects[objectName].storeBy) {
		/*id = data.id;
		if (!id)*/ id = data._id;

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
 * ???
 * @todo Find out what this fn does
 * @deprecated
 * @param {string|string[]} id
 * @param {Object.<string, Object>} crudObjects
 * @param {string} objectName Model name
 * @throws
 * @return {*}
 */
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
		// FIXME: this probably cannot ever work because crudObjects is not a {} but an ImmuMap
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


const getDataPreprocessed = (data, action, crudObjects, objectName) => {
	let dataPreprocessor = crudObjects && crudObjects[objectName] && crudObjects[objectName].dataPreprocessor;
	if (!dataPreprocessor)
		return data;
	return dataPreprocessor(action, data);
}

export function* getObject({ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest }, args) {
	const { objectName, id, query, success, fail } = args;
	try {
		/** @type {ImmuMap} */ let crudObjectsSrc = yield select(state => state.crudo);
		if (!crudObjectsSrc) {
			crudObjectsSrc = crudObjects;
		}
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjectsSrc, apiObject, servers);

		let api = urlResolve.resolve(serverUrl, `${apiObject}/${getObjectUrlId(id, crudObjectsSrc, objectName)}`);
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
			let processedData = getDataPreprocessed(data, actions.GET_DATA_SUCCESS, crudObjects, objectName);
			yield put({
				type: actions.GET_DATA_SUCCESS,
				objectName,
				data: processedData,
				id,
				args,
			});
			if (success) success(processedData);
		} else {
			const error = getErrorResponse(fetchResponse, response);
			yield put({
				type: actions.GET_DATA_FAIL,
				objectName,
				error,
				id,
				args,
			});
			if (fail) fail(error);
		}
	} catch (exception) {
		/*const error = {
			status: 404,
			statusText: '',
			error: 'Problem with contacting the server.',
		};*/
		//console.error((exception))
		// if e.msg == 'b undefined' -> didn't yet get list of models
		yield put({
			type: actions.GET_DATA_FAIL,
			objectName,
			//error,
			/*error: Object.entries(exception).reduce((accu, [k,v]) => {
				accu[k] = v;
				return accu;
			}, {}),*/
			id,
			args,
		});
		if (fail) fail(exception);
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
			let processedData = getDataPreprocessed(data, actions.GET_SINGLETON_SUCCESS, crudObjects, objectName);

			yield put({
				type: actions.GET_SINGLETON_SUCCESS,
				objectName,
				data: processedData,
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
export function* listData (
	{ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest },
	{ objectName, listName, query, success, fail }
) {
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
			let processedData = getDataPreprocessed(data, actions.LIST_DATA_SUCCESS, crudObjects, objectName);
			yield put({
				type: actions.LIST_DATA_SUCCESS,
				objectName,
				listName,
				data: processedData,
			});
			if (success) success(processedData);
		} else {
			yield put({
				type: actions.LIST_DATA_FAIL,
				objectName,
				listName,
				error,
			});
			if (fail) fail(error);
		}
	} catch (exception) {
		yield put({
			type: actions.LIST_DATA_FAIL,
			objectName,
			listName,
			error: exception,
		});
		if (fail) fail(exception);
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
		fullResponse: responseData,
	};
};

export function* createObject({ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest }, args) {
	const { objectName, data, query, multipart, success, fail } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);
		let api = urlResolve.resolve(serverUrl, `${apiObject}/create`);
		api = addQuery(api, query);
		let fetchData = {
			method: 'POST',
			headers: getHeaders(cookieToken),
			body: multipart ? data : JSON.stringify(data),
			credentials: 'include',
		};
		if (multipart) delete fetchData.headers['Content-Type'];
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
			if (success) success(newId);
		} else {
			const error = getErrorResponse(fetchResponse, response);
			yield put({
				type: actions.CREATE_DATA_FAIL,
				objectName,
				error,
				args,
				response,
			});
			if (fail) fail(error);
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
		if (fail) fail(exception);
	}
}

export function* updateObject({ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest }, args) {
	const {
		objectName,
		listName,
		data,
		query,
		documentIdentifier,
		multipart,
		success,
		fail,
	} = args;

	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const key = documentIdentifier || getObjectIdentifier(data, crudObjects, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);
		let api = urlResolve.resolve(serverUrl, `${apiObject}/${key}`);
		api = addQuery(api, query);

		let sendData = Object.assign({}, data);
		delete sendData.crudoState;
		delete sendData.version;
		/*if (sendData.id && !sendData._id) sendData._id = sendData.id;
		delete sendData.id;*/
		let fetchData = {
			method: 'PUT',
			headers: getHeaders(cookieToken),
			body: multipart ? sendData : JSON.stringify(sendData),
			credentials: 'include',
		};
		if (multipart) delete fetchData.headers['Content-Type'];
		if (customizeFetchRequest) {
			fetchData = customizeFetchRequest(fetchData, actions.UPDATE_DATA);
		}


		const fetchResponse = yield call(fetch, api, fetchData);

		// ------------------------------------------------------------------------

		const response = yield call([fetchResponse, fetchResponse.json]);

		// ------------------------------------------------------------------------
		const error = { error: 'Problem with calling server' };
		if (response && response.status === 'success') {
			let processedData = getDataPreprocessed(data, actions.UPDATE_DATA_SUCCESS, crudObjects, objectName);
			yield put({
				type: actions.UPDATE_DATA_SUCCESS,
				objectName,
				listName,
				data:processedData,
				args,
				response,
			});
			if (success) success(processedData);
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
			if (fail) fail(error);
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
		if (fail) fail(exception);
	}
}




export function* deleteObject({ url, cookieToken, objectsMap, crudObjects, servers, customizeFetchRequest }, args) {
	const {
		objectName,
		/*id,*/
		query,
		documentIdentifier,
		success,
		fail,
	} = args;

	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const serverUrl = getServer(url, crudObjects, apiObject, servers);
		const key = documentIdentifier || args.id; // FIXME: fallback for legacy purposes - delete
		let api = urlResolve.resolve(serverUrl, `${apiObject}/${key}`);
		api = addQuery(api, query);

		//console.log(api);
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
				id: key, // FIXME: legacy
				args,
			});
			if (success) success();
		} else {
			yield put({
				type: actions.DELETE_DATA_FAIL,
				objectName,
				error,
				args,
			});
			if (fail) fail(error);
		}
		yield* checkAndProcessCallbacks(response);
	} catch (exception) {
		yield put({
			type: actions.DELETE_DATA_FAIL,
			objectName,
			error: exception,
			args,
		});
		if (fail) fail(exception);
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

/**
 * Perform an authentication attempt using provided user credentials. If successful, a session cookie will be created.
 * @param {string} url
 * @param {string} username
 * @param {string} password
 */
function* authenticate({ url }, { username, password }) {
	try {
		/*const resp = yield call(fetch, urlResolve.resolve(url, `/user/login`), {
			method: 'POST',
			/!*headers: {
				'content-type':'application/json',
			},*!/
			headers: getHeaders({}),
			credentials: 'include', // this allows cookie creation
			body: JSON.stringify({
				why: "me",
				username,
				password,
			}),
		});*/
		const resp = yield call(apiRequest, {
			url: urlResolve.resolve(url, '/user/login'),
			method: 'POST',
			json: true,
			cookie: true,
			body: {
				username,
				password,
			},
		});
		yield put({
			type: actions.AUTHENTICATE_SUCCESS,
			userObject: resp.body.user,
		});
	} catch (e) {
		yield put({
			type: actions.AUTHENTICATE_FAILURE,
			error: e.message,
		});
	}
}

/**
 * End the current session.
 * We don't care about the response but if an error occurs we should at least register it.
 * @param {string} url
 */
function* logout ({ url }) {
	try {
		yield call(apiRequest, {
			url: urlResolve.resolve(url, '/user/logout'),
			method: 'GET',
			json: true,
			cookie: true,
		});
	} catch (e) {
		yield put({
			type: actions.LOGOUT_FAILURE,
			error: e,
		});
	}
}

/**
 * Get server-provided config
 * @param {Object} sagaParams
 * @param {Object} action
 */
function* getServerConfig (sagaParams, action) {
	try {
		const resp = yield call(apiRequest, {
			url: urlResolve.resolve(sagaParams.url, '/sys/config'),
			method: 'GET',
			cookie: true,
			json: true,
		});
		yield put({
			type: actions.GET_SERVER_CONFIG_SUCCESS,
			...resp.body.data,
		});
	} catch (e) {
		yield put({
			type: actions.GET_SERVER_CONFIG_FAILURE,
			error: JSON.parse(JSON.stringify(e, Object.getOwnPropertyNames(e))),
		});
	}
}

/**
 * SAGA: Get string representations of referenced documents of a given model
 * @todo reconsider whether this saga actually brings anything to the table as it's just a wrapper for listData.
 * @param {Object} sagaParams
 * @param {Object} action
 * @param {string} action.modelName
 */
function* getRefStrings (sagaParams, { modelName }) {
	// just use list_data with specific parameters
	const listName = `_stringrep_${modelName}`;
	yield put({
		type: actions.LIST_DATA,
		objectName: modelName,
		listName,
		query: { stringRepresentationOnly: true },
	});
	const { success, failure } = yield race({
		success: take(action =>
			action.type === actions.LIST_DATA_SUCCESS && action.objectName === modelName && action.listName === listName),
		failure: take(action =>
			action.type === actions.LIST_DATA_FAIL && action.objectName === modelName && action.listName === listName),
		//failure: take(actions.LIST_DATA_FAIL),
	});
	// TODO: verify that the race really only applies to the case we want and doesn't wreak havoc across others
	if (failure) {
		yield put({
			type: actions.GET_STRING_REPRESENTATIONS_FAILURE,
			modelName,
			reason: failure, // TODO strip me
		});
	} else {
		yield put({
			type: actions.GET_STRING_REPRESENTATIONS_SUCCESS,
			modelName,
		});
	}
}

// export effects ("sagas")
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
 *    - result of customizeFetchRequest are data sent by "fetch" function.
 *
 *
 * @param {*} rawSagaParams
 */
export const getCudoSaga = (rawSagaParams) => {
	const sagaParams = Object.assign({}, rawSagaParams);
	sagaParams.crudObjects = prepareObjectsConfig(rawSagaParams.crudObjects);
	//console.log(sagaParams.crudObjects)
	return [
		/*takeEvery("CRUDO_GET_DATA", function* (...args) {
			console.log(...args);
			yield console.log("ja jestem saga");
		}),//, sagaParams)*/
		//takeEvery(actions.GET_DATA, getObject, sagaParams),
		takeEvery(actions.GET_DATA, getObject, sagaParams),
		takeEvery(actions.GET_SINGLETON, getSingleton, sagaParams),
		takeEvery(actions.LIST_DATA, listData, sagaParams),
		takeEvery(actions.CREATE_DATA, createObject, sagaParams),
		takeEvery(actions.UPDATE_DATA, updateObject, sagaParams),
		takeEvery(actions.DELETE_DATA, deleteObject, sagaParams),
		takeEvery(actions.RPC, callRPC, sagaParams),

		takeEvery(actions.AUTHENTICATE, authenticate, sagaParams),
		takeEvery(actions.LOGOUT, logout, sagaParams),
		takeEvery(actions.GET_SERVER_CONFIG, getServerConfig, sagaParams),

		takeEvery(actions.GET_STRING_REPRESENTATIONS, getRefStrings, sagaParams),

		//takeEvery(actions.GET_DOCUMENTS, getDocuments, sagaParams),
	];
};
