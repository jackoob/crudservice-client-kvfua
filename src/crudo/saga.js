import { call, put, takeEvery } from 'redux-saga/effects';
// TODO:remove all delays
import { delay } from 'redux-saga';
import { actions } from './constants';
//import { getCookie } from '../../utils/cookie';

//import { url } from '../../config';


export function prepareObjectsConfig(objects) {
	let result = {};
	objects.forEach(objectInit => {
		if (typeof objectInit === "object") {
			if (objectInit.storeBy) {
				result[objectInit.key] = { 
					storeBy: objectInit.storeBy,
					remoteIdentification: objectInit.remoteIdentification,
				};
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

const getHeaders = (cookieToken) => {
	const headers = {
		Accept: 'application/json, text/plain, */*',
		'Content-Type': 'application/json',
	};
	return headers;
};

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


export function* getObject({ url, cookieToken, objectsMap, crudObjects }, args) {
	const { objectName, id } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectName);

		const api = `/${apiObject}/` + id;

		const fetchResponse = yield call(fetch, url + api, {
			method: 'GET',
			headers: getHeaders(cookieToken),
			credentials: 'include',
		});
		const response = yield call([fetchResponse, fetchResponse.json]);

		// console.log(response);
		// if (response && response.status === 'success') {
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

export function* getSingleton({ url, cookieToken, objectsMap }, args) {
	const { objectName, params } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const api = `/${apiObject}/singleton`;

		const fetchResponse = yield call(fetch, url + api, {
			method: 'POST',
			headers: getHeaders(cookieToken),
			body: JSON.stringify(params),
			credentials: 'include',
		});
		const response = yield call([fetchResponse, fetchResponse.json]);

		// if (response && response.status === 'success') {
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
export function* listData({ url, cookieToken, objectsMap }, { objectName, listName }) {
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const api = `/${apiObject}/all`;

		const fetchResponse = yield call(fetch, url + api, {
			method: 'GET',
			headers: getHeaders(cookieToken),
			credentials: 'include',
		});

		const response = yield call([fetchResponse, fetchResponse.json]);
		// console.log(response);

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

export function* createObject({ url, cookieToken, objectsMap }, args) {
	const { objectName, data } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const api = `/${apiObject}/create`;

		const fetchResponse = yield call(fetch, url + api, {
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
			});
		} else {
			const error = getErrorResponse(fetchResponse, response);
			yield put({
				type: actions.CREATE_DATA_FAIL,
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
			type: actions.CREATE_DATA_FAIL,
			objectName,
			error,
			args,
		});
	}
}

export function* updateObject({ url, cookieToken, objectsMap, crudObjects }, args) {
	const { objectName, listName, data } = args;

	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const key = getObjectIdentifier(data, crudObjects, objectName);
		const api = `/${apiObject}/${key}`;

		const fetchResponse = yield call(fetch, url + api, {
			method: 'PUT',
			headers: getHeaders(cookieToken),
			body: JSON.stringify(data),
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




export function* deleteObject({ url, cookieToken, objectsMap }, args) {
	const { objectName, id } = args;

	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const api = `/${apiObject}/${id}`;

		const fetchResponse = yield call(fetch, url + api, {
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
	} catch (exception) {
		yield put({
			type: actions.DELETE_DATA_FAIL,
			objectName,
			error: exception,
			args,
		});
	}
}



export function* callRPC({ url, cookieToken, objectsMap }, args) {
	const { objectName, rpcName, data, success, fail } = args;

	try {
		const apiObject = getApiObject(objectsMap, objectName);
		const api = `${url}/${apiObject}/${rpcName}`;
		let fetchData = {
			method: 'POST',
			headers: getHeaders(cookieToken),
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
	} catch (exception) {
		if (fail) {
			fail(exception, {});
		}
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
