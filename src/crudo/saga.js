import { call, put, takeEvery } from 'redux-saga/effects';
// TODO:remove all delays
import { delay } from 'redux-saga';
import { actions } from './constants';
//import { getCookie } from '../../utils/cookie';

//import { url } from '../../config';


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
	const token = getCookie(cookieToken);
	const headers = {
		Accept: 'application/json, text/plain, */*',
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`,
	};
	return headers;
};

const getApiObject = (objectsMap, objectType) => {
	let apiObject = objectType;
	if (Object.prototype.hasOwnProperty.call(objectsMap, objectType)) {
		apiObject = objectsMap[objectType];
	}
	return apiObject;
};


export function* getObject({ url, cookieToken, objectsMap },args) {
	const { objectType, id } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectType);
		const api = `/${apiObject}/`+id;

		const fetchResponse = yield call(fetch, url + api, {
			method: 'GET',
			headers: getHeaders(cookieToken),
		});
		const response = yield call([fetchResponse, fetchResponse.json]);

		// console.log(response);
		// if (response && response.status === 'success') {
		if (fetchResponse.ok) {
			const { data } = response;
			yield put({
				type: actions.GET_DATA_SUCCESS,
				objectType,
				data,
				id,
				args,
			});
		} else {
			const error = getErrorResponse(fetchResponse, response);
			yield put({
				type: actions.GET_DATA_FAIL,
				objectType,
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
			objectType,
			error,
			id,
			args,
		});
	}
}

export function* getSingleton({ url, cookieToken, objectsMap },args) {
	const { objectType, params } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectType);
		const api = `/${apiObject}/singleton`;

		const fetchResponse = yield call(fetch, url + api, {
			method: 'POST',
			headers: getHeaders(cookieToken),
			body: JSON.stringify(params),
		});
		const response = yield call([fetchResponse, fetchResponse.json]);

		// if (response && response.status === 'success') {
		if (fetchResponse.ok) {
			const { data } = response;
			yield put({
				type: actions.GET_SINGLETON_SUCCESS,
				objectType,
				data,
				args,
			});
		} else {
			const error = getErrorResponse(fetchResponse, response);
			yield put({
				type: actions.GET_SINGLETON_FAIL,
				objectType,
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
			objectType,
			error,
			args,
		});
	}
}
export function* listData({ url, cookieToken, objectsMap },{ objectType, listName }) {
	try {
		const apiObject = getApiObject(objectsMap, objectType);
		const api = `/${apiObject}/all`;

		const fetchResponse = yield call(fetch, url + api, {
			method: 'GET',
			headers: getHeaders(cookieToken),
		});

		const response = yield call([fetchResponse, fetchResponse.json]);
		// console.log(response);

		const error = { error: 'Problem with calling server' };
		if (response && response.status === 'success') {
			const { data } = response;
			yield put({
				type: actions.LIST_DATA_SUCCESS,
				objectType,
				listName,
				data,
			});
		} else {
			yield put({
				type: actions.LIST_DATA_FAIL,
				objectType,
				listName,
				error,
			});
		}
	} catch (exception) {
		yield put({
			type: actions.LIST_DATA_FAIL,
			objectType,
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
	const { objectType, data } = args;
	try {
		const apiObject = getApiObject(objectsMap, objectType);
		const api = `/${apiObject}/create`;

		const fetchResponse = yield call(fetch, url + api, {
			method: 'POST',
			headers: getHeaders(cookieToken),
			body: JSON.stringify(data),
		});
		const response = yield call([fetchResponse, fetchResponse.json]);

		// if (response && response.status === 'success') {
		if (fetchResponse.ok) {
			const newId = response.created.items[0];

			yield put({
				type: actions.CREATE_DATA_SUCCESS,
				objectType,
				newId,
				data,
				args,
			});
		} else {
			const error = getErrorResponse(fetchResponse, response);
			yield put({
				type: actions.CREATE_DATA_FAIL,
				objectType,
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
			objectType,
			error,
			args,
		});
	}
}

export function* updateObject({ url, cookieToken, objectsMap }, args) {
	const { objectType, listName, data } = args;

	try {
		const apiObject = getApiObject(objectsMap, objectType);
		let id = data.id;
		if (!id) id = data._id;
		const api = `/${apiObject}/${id}`;

		const fetchResponse = yield call(fetch, url + api, {
			method: 'PUT',
			headers: getHeaders(cookieToken),
			body: JSON.stringify(data),
		});

		// ------------------------------------------------------------------------

		const response = yield call([fetchResponse, fetchResponse.json]);

		// ------------------------------------------------------------------------
		const error = { error: 'Problem with calling server' };
		if (response && response.status === 'success') {
			yield put({
				type: actions.UPDATE_DATA_SUCCESS,
				objectType,
				listName,
				data,
				args,
			});
		} else {
			yield put({
				type: actions.UPDATE_DATA_FAIL,
				objectType,
				listName,
				error,
			});
		}
	} catch (exception) {
		yield put({
			type: actions.UPDATE_DATA_FAIL,
			objectType,
			listName,
			error: exception,
		});
	}
}

export function* deleteObject({ url }, args) {
	const { objectType, id } = args;

	try {
		// const { response, error } = yield call(crudoApi().Login, user, password);

		// ------------------------------------------------------------------------
		// TODO: this block is temporal -
		// it should be replaced by calling API on server
		const response = {
			status: 'success',
			timestamp: '2017-01-01T10:00:00',
		};

		yield delay(1000);

		// TODO:  end of temporal block
		// ------------------------------------------------------------------------
		const error = { error: 'Problem with calling server' };
		if (response && response.status === 'success') {
			yield put({
				type: actions.DELETE_DATA_SUCCESS,
				objectType,
				id,
				args,
			});
		} else {
			yield put({
				type: actions.DELETE_DATA_FAIL,
				objectType,
				error,
				args,
			});
		}
	} catch (exception) {
		yield put({
			type: actions.DELETE_DATA_FAIL,
			objectType,
			error: exception,
			args,
		});
	}
}


/*
// convert local names to api names (when some objec's name differs from API name)
const objectNamesMap = {
	cards: 'card',
	components: 'component',
	forms: 'form',
	client: 'contact',
};

const EXAMPLE_CONFIG = {
	url: (process.env.NODE_ENV === 'development') ? 'http://localhost:7777' : 'https://app.production.com',
	objectsMap: objectNamesMap,
	cookieToken:'projectname.tkn',
}
*/

// export sagas
export const getCudoSaga = (sagaParams) => [
	takeEvery(actions.GET_DATA, getObject, sagaParams),
	takeEvery(actions.GET_SINGLETON, getSingleton, sagaParams),
	takeEvery(actions.LIST_DATA, listData, sagaParams),
	takeEvery(actions.CREATE_DATA, createObject, sagaParams),
	takeEvery(actions.UPDATE_DATA, updateObject, sagaParams),
	takeEvery(actions.DELETE_DATA, deleteObject, sagaParams),
];
