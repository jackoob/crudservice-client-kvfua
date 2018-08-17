import { createSelector } from 'reselect';

const NULL = null;

//----------------------------------------------------------------
//
//----------------------------------------------------------------

const wholeCrudSeletors = {};
const wholeCrudSelector = (objectName) => {
	if (!wholeCrudSeletors[objectName]) {
		wholeCrudSeletors[objectName] = state => state.crudo.getIn([objectName]);
	}
	return wholeCrudSeletors[objectName];
};


const toJSMap = {};
/**
 * Function for improve perfrormance of "toJS()" function in immutable object.
 *
 * @param {*} objectName 
 * @param {*} immuObject 
 */
const getJS = (objectName, immuObject) => {
	if (!immuObject.has('data')) {
		return immuObject.toJS();
	}

	let result = immuObject.delete('data').toJS();
	if (!toJSMap[objectName]) {
		toJSMap[objectName] = { immu:{}, js:{}};
	}
	let { immu, js } = toJSMap[objectName];
	let resultData = {};
	// let differences = 0;
	immuObject.get('data').forEach((value, key) => {
		if (immu[key] !== value) {
			immu[key] = value;
			js[key] = value.toJS();
			// differences++;
		}
		resultData[key] = js[key];
	});
	// console.log("getJS, differences: " + differences);

	result.data = resultData;
	return result;
 
}

const wholeCrudSelectors = {};

// eslint-disable-next-line
export const getWholeCrud = (objectName) => {
	if (!wholeCrudSelectors[objectName]) {
		wholeCrudSelectors[objectName] = createSelector(
			[wholeCrudSelector(objectName)],
			(objectData) => {
				if (!objectData) return NULL;
				// let start = new Date();
				// let result = objectData.toJS();
				// let exists =  toJSMap[objectName];
				let result = getJS(objectName, objectData);
				/* let end = new Date();
				let diff = end.getTime() - start.getTime();
				if (diff > 1) {
					if (exists) {
						console.log(`toJS() of ${objectName} takes ${diff} ms (${objectData.get('data').size} records)...................`);
					} else {
						console.log(`toJS() of ${objectName} takes ${diff} ms (${objectData.get('data').size} records) (initializing)`);
						
					}
				} */
				return result;
			},
		);
	}
	return wholeCrudSelectors[objectName];
};


//----------------------------------------------------------------
//
//----------------------------------------------------------------

const crudDataSelectors = {};

// eslint-disable-next-line
export const getCrudData = (objectName) => {
	if (!crudDataSelectors[objectName]) {
		crudDataSelectors[objectName] = createSelector(
			[getWholeCrud(objectName)],
			(objectData) => {
				if (!objectData) return NULL;
				return objectData.data;
			},
		);
	}
	return crudDataSelectors[objectName];
};