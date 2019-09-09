/**
 * Wrap fetch api
 * @async
 * @param {Object} args
 * @param {string} args.url
 * @param {string} args.method
 * @param {boolean} [args.json=false]
 * @param {Object} [args.body]
 * @param {boolean} [args.cookie=true]
 * @returns {Promise<Response>}
 */
export function apiRequest (args) {
	let {
		url,
		method,
		json = false,
		body,
		cookie = true,
	} = args;

	/** @type {RequestInit} */ const req = {
		headers: {},
		method,
	};

	if (json) req.headers['Accept'] = req.headers['Content-Type'] = 'application/json';

	if (cookie) req.credentials = 'include'; // todo: set me to 'same-origin' once you fix 127.0.0.1 vs localhost

	method = method.toUpperCase();

	/*console.log(method);
	console.log(body);*/

	if (body) {
		//if (method === 'GET' || method === 'HEAD') throw ... // this is done by fetch automatically
		if (json) req.body = JSON.stringify(body);
		// ... todo
	}

	let prom = fetch(url, req).then(function checkResponseOk (r) {
		if (!r.ok) throw new Error(`Not ok, ${r.status}`);
		return r;
	});

	if (json) prom = prom.then(async r => {
		return {
			...r,
			body: await r.json(),
		};
	});

	return prom;
}
