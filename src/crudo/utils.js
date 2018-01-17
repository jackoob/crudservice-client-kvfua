import { CrudoState } from './constants';

export const getCrudoObject = (crudoReducer, objectType, objectId) => {
	const id = `${objectId}`;
	const crudoState = crudoReducer.getIn([objectType, 'crudoState']);
	const immuData = crudoReducer.getIn([objectType, 'data', id]);
	if (!immuData) return { crudoState };
	const obj = immuData ? immuData.toJS() : { crudoState: CrudoState.FAIL };
	const newObj = { ...obj, crudoState };
	return newObj;
};

export const getCrudoRefObject = (crudoReducer, srcObject, parameter, referenceObjectType) => {
	const crudoState = crudoReducer.getIn([referenceObjectType, 'crudoState']);

	if (crudoState !== CrudoState.OK) return { crudoState };

	if (!srcObject) return { crudoState: CrudoState.FAIL };
	if (srcObject.crudoState !== CrudoState.OK) {
		return { crudoState: srcObject.crudoState };
	}
	if (!Object.prototype.hasOwnProperty.call(srcObject, parameter)) {
		return { crudoState: CrudoState.FAIL };
	}

	const id = `${srcObject[parameter]}`;
	const immuData = crudoReducer.getIn([referenceObjectType, 'data', id]);
	if (!immuData) return { crudoState };
	const obj = immuData ? immuData.toJS() : { crudoState: CrudoState.FAIL };
	return { ...obj, crudoState };
};

export const getCrudoRefArray = (crudoReducer, srcObject, parameter, referenceObjectType) => {
	const crudoState = crudoReducer.getIn([referenceObjectType, 'crudoState']);

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
		const immuData = crudoReducer.getIn([referenceObjectType, 'data', `${id}`]);
		if (immuData) {
			const obj = immuData ? immuData.toJS() : { crudoState: CrudoState.FAIL };
			result.push(obj);
		}
	});
	return { data: result, crudoState };
};

export const getCrudArray = (crudoReducer, objectType) => {
	const crudoState = crudoReducer.getIn([objectType, 'crudoState']);
	if (crudoState !== CrudoState.OK) return [];
	const immuData = crudoReducer.getIn([objectType, 'data']);
	if (!immuData) return [];
	const result = [];
	const data = immuData.toJS();
	Object.keys(data).forEach((key) => {
		result.push(data[key]);
	});
	return result;
};
