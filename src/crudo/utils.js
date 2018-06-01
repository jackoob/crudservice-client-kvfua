import { CrudoState } from './constants';

export const getCrudoObject = (crudoReducer, objectName, objectId) => {
	const id = `${objectId}`;
	let crudoState = crudoReducer.getIn([objectName, 'crudoState']);
	const immuData = crudoReducer.getIn([objectName, 'data', id]);
	// object can have it's own state. If it has, preffer this state
	if (immuData && immuData.has('crudoState')){
			crudoState=immuData.get('crudoState');
	}
	if (!crudoState && !immuData){
		 return { crudoState: CrudoState.INITIAL };
	}
	if (!immuData) return { crudoState };
	const obj = immuData ? immuData.toJS() : { crudoState: CrudoState.FAIL };
	const newObj = Object.assign({}, {crudoState}, obj );
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
	return { ...obj, crudoState };
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
	return { data: result, crudoState };
};

export const getCrudArray = (crudoReducer, objectName) => {
	const crudoState = crudoReducer.getIn([objectName, 'crudoState']);
	if (crudoState !== CrudoState.OK) return [];
	const immuData = crudoReducer.getIn([objectName, 'data']);
	if (!immuData) return [];
	const result = [];
	const data = immuData.toJS();
	Object.keys(data).forEach((key) => {
		if (!data[key].crudoState || data[key].crudoState === CrudoState.OK)
			result.push(data[key]);
	});
	return result;
};
