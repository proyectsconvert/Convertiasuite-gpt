/*jshint bitwise:true, browser:true, curly:false, eqeqeq:true, noarg:true, noempty:true, strict:true, undef:true, unused:true, strict: false, esversion: 11 */
/*jshint quotmark:false*/
/*global inConcert, $*/
/*jslint bitwise: true */

/************************ API ************************/

/**
* Constructor
*
* @param  {string}		domain						-Required. API domain. Example: "i6.inconcert.cc"
* @param  {string}		interactionId				-Optional. Id of interaction to fire events.
* @param  {boolean}		usesSsl						-Optional. If is run in a file environment, indicats if uses https.
*/
function inConcertAgentApi(domain, interactionId, usesSsl) {
	if (window.inConcert && window.inConcert.AgentApi) {
		if (inConcert.AgentApi.domain === domain) {
			return window.inConcert.AgentApi;
		}
		else {
			inConcert.AgentApi.__release();
			delete inConcert.AgentApi;
		}
	}
	this.domain = domain || window.location.host;
	this.outgoingEventsCallbacks = {};
	this.incomingEventsNotifications = {};
	this.interactionId = interactionId || null;
	this.usesSsl = usesSsl || false;
	this.__iframeReady = false;
	this.__makeAsync();
	this.__initialize();
}

/************************ General Use ************************/

inConcertAgentApi.prototype.getMD5 = function (str) {
	var MD5 = function (d) {
		return M(V(Y(X(d), 8 * d.length)));
	};
	function M (d) {
		for (var _, m = '0123456789ABCDEF', f = '', r = 0; r < d.length; r++) {
			_ = d.charCodeAt(r);
			f += m.charAt(_ >>> 4 & 15) + m.charAt(15 & _);
		}
		return f;
	}
	function X (d) {
		for (var _ = Array(d.length >> 2), m = 0; m < _.length; m++) {
			_[m] = 0;
		}
		for (m = 0; m < 8 * d.length; m += 8) {
			_[m >> 5] |= (255 & d.charCodeAt(m / 8)) << m % 32;
		}
		return _;
	}
	function V (d) {
		for (var _ = '', m = 0; m < 32 * d.length; m += 8) {
			_ += String.fromCharCode(d[m >> 5] >>> m % 32 & 255);
		}
		return _;
	}
	function Y (d, _) {
		d[_ >> 5] |= 128 << _ % 32;
		d[14 + (_ + 64 >>> 9 << 4)] = _;
		for (var m = 1732584193, f = -271733879, r = -1732584194, i = 271733878, n = 0; n < d.length; n += 16) {
			var h = m;
			var t = f;
			var g = r;
			var e = i;
			f = md5ii(f = md5ii(f = md5ii(f = md5ii(f = md5hh(f = md5hh(f = md5hh(f = md5hh(f = md5gg(f = md5gg(f = md5gg(f = md5gg(f = md5ff(f = md5ff(f = md5ff(f = md5ff(f, r = md5ff(r, i = md5ff(i, m = md5ff(m, f, r, i, d[n + 0], 7, -680876936), f, r, d[n + 1], 12, -389564586), m, f, d[n + 2], 17, 606105819), i, m, d[n + 3], 22, -1044525330), r = md5ff(r, i = md5ff(i, m = md5ff(m, f, r, i, d[n + 4], 7, -176418897), f, r, d[n + 5], 12, 1200080426), m, f, d[n + 6], 17, -1473231341), i, m, d[n + 7], 22, -45705983), r = md5ff(r, i = md5ff(i, m = md5ff(m, f, r, i, d[n + 8], 7, 1770035416), f, r, d[n + 9], 12, -1958414417), m, f, d[n + 10], 17, -42063), i, m, d[n + 11], 22, -1990404162), r = md5ff(r, i = md5ff(i, m = md5ff(m, f, r, i, d[n + 12], 7, 1804603682), f, r, d[n + 13], 12, -40341101), m, f, d[n + 14], 17, -1502002290), i, m, d[n + 15], 22, 1236535329), r = md5gg(r, i = md5gg(i, m = md5gg(m, f, r, i, d[n + 1], 5, -165796510), f, r, d[n + 6], 9, -1069501632), m, f, d[n + 11], 14, 643717713), i, m, d[n + 0], 20, -373897302), r = md5gg(r, i = md5gg(i, m = md5gg(m, f, r, i, d[n + 5], 5, -701558691), f, r, d[n + 10], 9, 38016083), m, f, d[n + 15], 14, -660478335), i, m, d[n + 4], 20, -405537848), r = md5gg(r, i = md5gg(i, m = md5gg(m, f, r, i, d[n + 9], 5, 568446438), f, r, d[n + 14], 9, -1019803690), m, f, d[n + 3], 14, -187363961), i, m, d[n + 8], 20, 1163531501), r = md5gg(r, i = md5gg(i, m = md5gg(m, f, r, i, d[n + 13], 5, -1444681467), f, r, d[n + 2], 9, -51403784), m, f, d[n + 7], 14, 1735328473), i, m, d[n + 12], 20, -1926607734), r = md5hh(r, i = md5hh(i, m = md5hh(m, f, r, i, d[n + 5], 4, -378558), f, r, d[n + 8], 11, -2022574463), m, f, d[n + 11], 16, 1839030562), i, m, d[n + 14], 23, -35309556), r = md5hh(r, i = md5hh(i, m = md5hh(m, f, r, i, d[n + 1], 4, -1530992060), f, r, d[n + 4], 11, 1272893353), m, f, d[n + 7], 16, -155497632), i, m, d[n + 10], 23, -1094730640), r = md5hh(r, i = md5hh(i, m = md5hh(m, f, r, i, d[n + 13], 4, 681279174), f, r, d[n + 0], 11, -358537222), m, f, d[n + 3], 16, -722521979), i, m, d[n + 6], 23, 76029189), r = md5hh(r, i = md5hh(i, m = md5hh(m, f, r, i, d[n + 9], 4, -640364487), f, r, d[n + 12], 11, -421815835), m, f, d[n + 15], 16, 530742520), i, m, d[n + 2], 23, -995338651), r = md5ii(r, i = md5ii(i, m = md5ii(m, f, r, i, d[n + 0], 6, -198630844), f, r, d[n + 7], 10, 1126891415), m, f, d[n + 14], 15, -1416354905), i, m, d[n + 5], 21, -57434055), r = md5ii(r, i = md5ii(i, m = md5ii(m, f, r, i, d[n + 12], 6, 1700485571), f, r, d[n + 3], 10, -1894986606), m, f, d[n + 10], 15, -1051523), i, m, d[n + 1], 21, -2054922799), r = md5ii(r, i = md5ii(i, m = md5ii(m, f, r, i, d[n + 8], 6, 1873313359), f, r, d[n + 15], 10, -30611744), m, f, d[n + 6], 15, -1560198380), i, m, d[n + 13], 21, 1309151649), r = md5ii(r, i = md5ii(i, m = md5ii(m, f, r, i, d[n + 4], 6, -145523070), f, r, d[n + 11], 10, -1120210379), m, f, d[n + 2], 15, 718787259), i, m, d[n + 9], 21, -343485551);
			m = safeadd(m, h);
			f = safeadd(f, t);
			r = safeadd(r, g);
			i = safeadd(i, e);
		}
		return [m, f, r, i];
	}
	function md5cmn (d, _, m, f, r, i) {
		return safeadd(bitrol(safeadd(safeadd(_, d), safeadd(f, i)), r), m);
	}
	function md5ff (d, _, m, f, r, i, n) {
		return md5cmn(_ & m | ~_ & f, d, _, r, i, n);
	}
	function md5gg (d, _, m, f, r, i, n) {
		return md5cmn(_ & f | m & ~f, d, _, r, i, n);
	}
	function md5hh (d, _, m, f, r, i, n) {
		return md5cmn(_ ^ m ^ f, d, _, r, i, n);
	}
	function md5ii (d, _, m, f, r, i, n) {
		return md5cmn(m ^ (_ | ~f), d, _, r, i, n);
	}
	function safeadd (d, _) {
		var m = (65535 & d) + (65535 & _);
		return (d >> 16) + (_ >> 16) + (m >> 16) << 16 | 65535 & m;
	}
	function bitrol (d, _) {
		return d << _ | d >>> 32 - _;
	}
	return MD5(str);
};

inConcertAgentApi.prototype.__maxFileSize = function() {
	return 64;
};

inConcertAgentApi.prototype.__S4 = function() {
	/*jshint bitwise:false*/
	return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

inConcertAgentApi.prototype.GUID = function() {
	let S4 = this.__S4;
	return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4()).toUpperCase();
};

inConcertAgentApi.prototype.__getQuerystringParam = function(name) {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	let regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(location.search);
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};

inConcertAgentApi.prototype.__noop = function() {
	
};

inConcertAgentApi.prototype.__isEmptyObject = function(data) {
	if (!data) {
		return true;
	}
	for (let key in data) {
		if (data[key]) {
			return false;
		}
	}
	return true;
};

inConcertAgentApi.prototype.__makeUrl = function(params) {
	let protocol = window.location.protocol;
	if (protocol !== "https:") {
		protocol = this.usesSsl? "https:": "http:";
	}
	return protocol + "//" + this.domain + params.path;
};

inConcertAgentApi.prototype.__openTab = function(params) {
	let url = this.__makeUrl({ path : params.path });
	return window.open(url, "_blank");
};

inConcertAgentApi.prototype.__appendHiddenIframe = function(params) {
	let url = this.__makeUrl({ path : params.path });
	let iframeObject = document.getElementById(params.id);
	if (!iframeObject) {
		iframeObject = document.createElement("iframe");
		iframeObject.id = params.id;
		iframeObject.allow = params.allow || "";
		let container = document.createElement("div");
		container.style.display = "none";
		container.appendChild(iframeObject);
		document.getElementsByTagName("body")[0].appendChild(container);
	}
	iframeObject.src = url;
	return iframeObject.contentWindow;
};

inConcertAgentApi.prototype.__makeResult = function(result, data) {
	data = data || {};
	data.result = result;
	return data;
};

inConcertAgentApi.prototype.__makeOk = function(data) {
	return this.__makeResult("OK", data);
};

inConcertAgentApi.prototype.__makeError = function(result, reason, data) {
	data = data || {};
	data.reason = reason || "unknown error";
	return this.__makeResult(result || "FAIL", data);
};

/************************ Internal ************************/

inConcertAgentApi.prototype.__getIframePath = function() {
	return "/inconcert/apps/agent/agent_api/";
};

inConcertAgentApi.prototype.__loadIframe = function() {
	this.iframe = this.__appendHiddenIframe({
		id : this.iframeToken,
		path : this.__getIframePath() + "?token=" + encodeURIComponent(this.iframeToken)
	});
};

inConcertAgentApi.prototype.__initialize = function() {
	if (this.__initialized) {
		return;
	}
	this.__initializeInteractionId();
	this.iframeToken = this.GUID();
	this.__loadIframe();
	this.__listenIframeEvents();
	this.__incomingEventsPooling();
	this.__initialized = true;
};

inConcertAgentApi.prototype.__makeAsync = function() {
	this.async = Object.keys(inConcertAgentApi.prototype).reduce((async, methodName) => {
		const asyncMethod = this.__makeAsyncMethod(methodName);
		if (asyncMethod) async[methodName] = asyncMethod;
		return async;
	}, {});
};

inConcertAgentApi.prototype.__makeAsyncMethod = function(methodName) {
	const self = this;
	const method = self[methodName];
	if (methodName.indexOf("_") === 0 || typeof(method) !== "function")
		return;

	return async function() {
		let args = arguments;
		const unsetArgs = method.length - args.length - 1;
		if (unsetArgs > 0) args = [...args, ...Array(unsetArgs)];

		return new Promise((resolve, _reject) => {
			method.apply(self, [...args, (result) => resolve(result)]);
		});
	};
};

inConcertAgentApi.prototype.__release = function() {
	if (this.__iframeListener) {
		window.removeEventListener("message", this.__iframeListener);
	}
	if (this.__incomingEventsTimmer) {
		window.clearInterval(this.__incomingEventsTimmer);
	}
	let iframeObject = document.getElementById(this.iframeToken);
	if (iframeObject) {
		iframeObject.remove();
	}
	let environmentIframeObject = document.getElementById("inconcert_environment_" + this.iframeToken);
	if (environmentIframeObject) {
		environmentIframeObject.remove();
	}
};

inConcertAgentApi.prototype.__initializeInteractionId = function() {
	if (this.interactionId) {
		return;
	}
	if (this.__getQuerystringParam("__cti") === "true") {
		this.interactionId = this.__getQuerystringParam("interaction_id") || null;
	}
};

inConcertAgentApi.prototype.__callbackPrefix = function() {
	return "callback_";
};

inConcertAgentApi.prototype.__listenIframeEvents = function() {
	let self = this;
	self.__iframeListener = function(event) {
		try {
			if (!event.data || !event.data.length || event.data.length < 2 || event.data[0] !== self.iframeToken) {
				return;
			}
			let eventName = event.data[1];
			if (eventName === "iframe_ready") {
				return self.__iframeIsReady();
			}
			let data = event.data.length > 2? event.data[2] : null;
			let callbackId = event.data.length > 3? event.data[3] : null;
			if (eventName.indexOf(self.__callbackPrefix()) === 0) {
				//callback
				eventName = eventName.replace(self.__callbackPrefix(), "");
				self.__fireOutgoingMethodCallback(eventName, data, callbackId);
			}
			else {
				//new incoming event
				self.__incomingEvent(eventName, data, callbackId);
			}
		}
		catch(e) {
			console.error("Error processing event", event, e);
		}	
	};
	window.addEventListener("message", self.__iframeListener);
};

inConcertAgentApi.prototype.__sendIframeMessage = function(event, data, callbackId, onSent) {
	onSent = onSent || function() {};
	let self = this;
	self.__onIframeReady(function() {
		try {
			self.iframe.postMessage([self.iframeToken, event, data, callbackId], "*");
			onSent(true);
		}
		catch(e) {
			console.error("Error sending message", event, e);
			onSent(false);
		}
	});
};

inConcertAgentApi.prototype.__onIframeReady = function(callback) {
	if (!callback) {
		return;
	}
	if (this.__iframeReady) {
		callback();
	}
	else {
		this.__iframeReadyCallbacks = this.__iframeReadyCallbacks || [];
		this.__iframeReadyCallbacks.push(callback);
	}
};

inConcertAgentApi.prototype.__iframeIsReady = function() {
	this.__iframeReady = true;
	if (this.__iframeReadyCallbacks) {
		for (let i = 0; i < this.__iframeReadyCallbacks.length; i++) {
			this.__iframeReadyCallbacks[i]();
		}
		this.__iframeReadyCallbacks = null;
	}
};

inConcertAgentApi.prototype.__incomingEvent = function(event, data, callbackId) {
	let self = this;
	//event custom notifications
	self.__fireIncomingEventNotification(event, data);
	//method internal notification
	if (self["__" + event]) {
		let callback = callbackId? function(result) {
			self.__incomingEventCallback(event, callbackId, result);
		} : null;
		self["__" + event](data, callback);
	}
};

inConcertAgentApi.prototype.__incomingEventCallback = function(event, callbackId, result) {
	this.__sendIframeMessage(this.__callbackPrefix() + event, result, callbackId);
};

inConcertAgentApi.prototype.__getOutgoingMethodCallbackDefaultTimeout = function() {
	return 30;
};

inConcertAgentApi.prototype.__callOutgoingMethod = function(event, data, callback, timeout) {
	let self = this;
	let callbackId = callback? self.GUID() : null;
	self.__sendIframeMessage(event, data, callbackId, function(status) {
		if (callback) {
			if (status) {
				self.__addOutoingMethodCallback(event, callbackId, callback, timeout);
			}
			else {
				callback(self.__makeError("FAIL", "error sending message"));
			}
		}
	});
};

inConcertAgentApi.prototype.__addOutoingMethodCallback = function(event, callbackId, callback, timeout) {
	if (!event || !callbackId || !callback) {
		return;
	}
	this.outgoingEventsCallbacks[event] = this.outgoingEventsCallbacks[event] || {};
	this.outgoingEventsCallbacks[event][callbackId] = {
		callback : callback,
		timeout : this.__makeOutgoingMethodCallbackTimeout(event, callbackId, timeout)
	};
};

inConcertAgentApi.prototype.__makeOutgoingMethodCallbackTimeout = function(event, callbackId, timeout) {
	let self = this;
	if (timeout === 0) {
		return null;
	}
	timeout = timeout || self.__getOutgoingMethodCallbackDefaultTimeout();
	return window.setTimeout(function() {
		let result = self.__makeError("TIMEOUT", "timeout waiting for event result");
		self.__fireOutgoingMethodCallback(event, result, callbackId);
	}, timeout * 1000);
};

inConcertAgentApi.prototype.__getOutoingMethodCallback = function(event, callbackId) {
	return event && callbackId && this.outgoingEventsCallbacks[event] && 
		this.outgoingEventsCallbacks[event][callbackId] || null;
};

inConcertAgentApi.prototype.__removeOutoingMethodCallback = function(event, callbackId) {
	let callback = this.__getOutoingMethodCallback(event, callbackId);
	if (!callback) {
		return;
	}
	if (callback.timeout) {
		window.clearTimeout(callback.timeout);
	}
	this.outgoingEventsCallbacks[event][callbackId] = null;
	if (this.__isEmptyObject(this.outgoingEventsCallbacks[event])) {
		this.outgoingEventsCallbacks[event] = null;
	}
};

inConcertAgentApi.prototype.__fireOutgoingMethodCallback = function(event, result, callbackId) {
	let callback = this.__getOutoingMethodCallback(event, callbackId);
	if (!callback) {
		return;
	}
	this.__removeOutoingMethodCallback(event, callbackId);
	callback.callback(result);
};

inConcertAgentApi.prototype.__fireIncomingEventNotification = function(event, data) {
	let notifications = this.incomingEventsNotifications[event];
	if (!notifications) {
		return;
	}
	for (let i = 0; i < notifications.length; i++) {
		notifications[i](data);
	}
};

inConcertAgentApi.prototype.__incomingEventsPooling = function() {
	let self = this;
	self.__incomingEventsTimmer = window.setInterval(function() {
		self.__refreshIncomingEvents();
	}, 3000);
};

inConcertAgentApi.prototype.__refreshIncomingEvents = function() {
	let events = [];
	for (let event in this.incomingEventsNotifications) {
		if (this.__hasEventSuscription(event)) {
			events.push(event);
		}
	}
	if (events.length) {
		this.__callOutgoingMethod("RefreshEventsSuscription", { events : events, interactionId : this.interactionId });
	}
};

inConcertAgentApi.prototype.__hasEventSuscription = function(event) {
	return this.incomingEventsNotifications[event] && this.incomingEventsNotifications[event].length || false;
};

inConcertAgentApi.prototype.__suscribeEvent = function(event) {
	this.__callOutgoingMethod("SuscribeEvent", { event : event });
};

inConcertAgentApi.prototype.__unSuscribeEvent = function(event) {
	this.__callOutgoingMethod("UnSuscribeEvent", { event : event });
};

inConcertAgentApi.prototype.__SwitchInteractionId = function(data) {
	if (this.interactionId === data.oldId) {
		this.interactionId = data.newId;
	}
};

inConcertAgentApi.prototype.__doLoginCallback = function(result) {
	if (this.__loginCallback) {
		let callback = this.__loginCallback;
		this.__loginCallback = null;
		if (this.__loginTab && result.result !== "OK") {
			this.__loginTab.close();
			this.__loginTab = null;
		}
		callback(result);
	}
};

inConcertAgentApi.prototype.__UserLoggedIn = function(data) {
	this.__doLoginCallback(this.__makeOk({ user : data.user }));
};

inConcertAgentApi.prototype.__UserLoginFailed = function(result) {
	this.__doLoginCallback(result);
};

inConcertAgentApi.prototype.__uploadFile = function(path, file, callback, progress) {
	progress = progress || function() {};
	var self = this;
	var url = window.location.protocol + "//" + self.domain + "/inconcert/apps/" + path;
	var xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.onload = function(e) {
		var response;
		try {
			response = JSON.parse(xhr.responseText);
		}
		catch {
			response = {
				status : false,
				reason : xhr.responseText || "unknown error" 
			};
		}
		callback(e.target.status === 200, response);
	};

	// show the uploaded percentage
	xhr.upload.onprogress = function(e) {
		var percentage = 0;
		if ( e && !isNaN( e.loaded ) && !isNaN( e.total ) ) {
			percentage = Math.floor( e.loaded / e.total * 100 );
		}
		progress(percentage);
	};
	xhr.send(file);
};

inConcertAgentApi.prototype.__fileExtension = function(fileName) {
	fileName = fileName || "";
	var match = fileName.match(/[^.]*(.)$/);
	if ( !match ) {
		return "";
	}
	var extension = match[0];
	if (extension === fileName) {
		extension = "";
	}
	return extension || "";
};

inConcertAgentApi.prototype.__makeQueryString = function(data) {
	var qs = "";
	$.each(data, function(k, v) {
		qs += (qs? "&" : "?") + k + "=" + encodeURIComponent(v);
	});
	return qs;
};

/************************ Incoming events ************************/

/**
* Adds an incoming event callback
*
* @param  {string}		event						-Required. Event name.
* @param  {Function}	callback(data)				-Required. Callback function.
*/
inConcertAgentApi.prototype.On = function(event, callback) {
	if (!this[event]) {
		return;
	}
	this.incomingEventsNotifications[event] = this.incomingEventsNotifications[event] || [];
	this.incomingEventsNotifications[event].push(callback);
	this.__suscribeEvent(event);
};

/**
* Removes incoming event callbacks
*
* @param  {string}		event						-Required. Event name.
* @param  {Function}	callback(data)				-Optional. Callback function to remove. If not then all are removed.
*/
inConcertAgentApi.prototype.Off = function(event, callback) {
	if (callback && this.incomingEventsNotifications[event]) {
		let current = this.incomingEventsNotifications[event];
		this.incomingEventsNotifications[event] = [];
		for (let i = 0; i < current.length; i++) {
			if (current[i] !== callback) {
				this.incomingEventsNotifications[event].push(current[i]);
			}
		}
		if (!this.incomingEventsNotifications[event].length) {
			this.incomingEventsNotifications[event] = null;
		}
	}
	else {
		this.incomingEventsNotifications[event] = null;
	}
	if (!this.incomingEventsNotifications[event]) {
		this.__unSuscribeEvent(event);
	}
};

/************************ Incoming user events ************************/

/**
* User logged in event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.user					-User object.
*/
inConcertAgentApi.prototype.UserLoggedIn = function(callback) {
	this.On("UserLoggedIn", callback);
};

/**
* User logged out event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.user					-User object.
*/
inConcertAgentApi.prototype.UserLoggedOut = function(callback) {
	this.On("UserLoggedOut", callback);
};

/**
* User state changed event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.state					-State object.
*/
inConcertAgentApi.prototype.UserStateChanged = function(callback) {
	this.On("UserStateChanged", callback);
};

/************************ Incoming interaction events ************************/

/**
* Set interaction id. If not empty then only this interaction events are fired.
*
* @param  {string}		interactionId				-Optional. Interaction id to set.
*/
inConcertAgentApi.prototype.SetInteractionId = function(interactionId) {
	this.interactionId = interactionId || null;
	this.__callOutgoingMethod("SetInteractionId", { id : interactionId });
};

/**
* A new interaction is assigned to agent
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.InteractionAssigned = function(callback) {
	this.On("InteractionAssigned", callback);
};

/**
* Interaction was removed from the agent (includes all states)
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.InteractionRemovedFromAgent = function(callback) {
	this.On("InteractionRemovedFromAgent", callback);
};

/**
* Interaction requeued
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.InteractionRequeued = function(callback) {
	this.On("InteractionRequeued", callback);
};

/**
* Interaction transferred
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.InteractionTransferred = function(callback) {
	this.On("InteractionTransferred", callback);
};

/**
* Interaction archived
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.InteractionArchived = function(callback) {
	this.On("InteractionArchived", callback);
};

/**
* Interaction canceled
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.InteractionCanceled = function(callback) {
	this.On("InteractionCanceled", callback);
};

/**
* Interaction putted in wrapup
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.InteractionInWrapup = function(callback) {
	this.On("InteractionInWrapup", callback);
};

/**
* New interaction messages (include outgoing)
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
* @return {array}		data.messages				-New messages array.
*/
inConcertAgentApi.prototype.NewInteractionMessages = function(callback) {
	this.On("NewInteractionMessages", callback);
};
	
/************************ Incoming Phone events ************************/

/**
* Phone call taken event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallTaken = function(callback) {
	this.On("CallTaken", callback);
};

/**
* Phone call recording event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
* @return {boolean}		data.recording				-Call is recording.
*/
inConcertAgentApi.prototype.CallOnRecording = function(callback) {
	this.On("CallOnRecording", callback);
};

/**
* Phone call on hold event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
* @return {boolean}		data.hold					-Call is on hold.
*/
inConcertAgentApi.prototype.CallOnHold = function(callback) {
	this.On("CallOnHold", callback);
};

/**
* Phone call muted event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {boolean}		data.muted					-Call is muted.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallOnMute = function(callback) {
	this.On("CallOnMute", callback);
};

/**
* Phone call switch event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {boolean}		data.switch					-Call is switch.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallOnSwitch = function(callback) {
	this.On("CallOnSwitch", callback);
};

/**
* Phone call on preview event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallOnPreview = function(callback) {
	this.On("CallOnPreview", callback);
};

/**
* Phone call redialing event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallRedialing = function(callback) {
	this.On("CallRedialing", callback);
};

/**
* Phone call redial accepted event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallRedialAccepted = function(callback) {
	this.On("CallRedialAccepted", callback);
};

/**
* Phone call redial canceled event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallRedialCanceled = function(callback) {
	this.On("CallRedialCanceled", callback);
};

/**
* Phone call appointment accepted event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallAppointmentAccepted = function(callback) {
	this.On("CallAppointmentAccepted", callback);
};

/**
* Phone call appointment canceled event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallAppointmentCanceled = function(callback) {
	this.On("CallAppointmentCanceled", callback);
};

/**
* Phone call transferring event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallTransferring = function(callback) {
	this.On("CallTransferring", callback);
};

/**
* Phone call transfer connected event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallTransferConnected = function(callback) {
	this.On("CallTransferConnected", callback);
};

/**
* Phone call transfer canceled event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallTransferCanceled = function(callback) {
	this.On("CallTransferCanceled", callback);
};

/**
* Phone call on conference event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallOnConference = function(callback) {
	this.On("CallOnConference", callback);
};

/**
* Phone call trying conference consultation call event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallConferenceConsultationTrying = function(callback) {
	this.On("CallConferenceConsultationTrying", callback);
};

/**
* Phone call consultation call connected event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallConferenceConsultationConnected = function(callback) {
	this.On("CallConferenceConsultationConnected", callback);
};

/**
* Phone call consultation call canceled event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
*/
inConcertAgentApi.prototype.CallConferenceConsultationCanceled = function(callback) {
	this.On("CallConferenceConsultationCanceled", callback);
};

/**
* Phone call on transcribe event
*
* @param  {Function}	callback(data)				-Required. Callback function.
* @return {object}		data.interaction			-Interaction json.
* @return {object}		data.trancription			-Transcribed Interaction json.
*/
inConcertAgentApi.prototype.TranscribeInteraction = function(callback) {
	this.On("TranscribeInteraction", callback);
};

/************************ User methods ************************/

/**
* Get logged user
*
* @param  {Function}	callback(user)				-Required. Callback function.
* @return {object}		user						-Logged user.
* @return {string}		user.Id						-User id.
* @return {string}		user.FirstName				-User first name.
* @return {string}		user.LastName				-User last name.
* @return {string}		user.FirstSurname			-User first surname.
* @return {string}		user.LastSurname			-User last surname.
* @return {string}		user.CompleteName			-User complete name.
* @return {string}		user.Avatar					-User avatar url.
* @return {string}		user.Group					-User group.
* @return {string}		user.Company				-User company.
* @return {object}		user.CustomInfo				-User custom info.
* @return {string}		user.State					-User state.
* @return {string}		user.StateDescription		-User state description.
* @return {string}		user.CountryCode			-User country code.
* @return {string}		user.AreaCode				-User area code.
* @return {string}		user.Timezone				-User timezone.
* @return {string}		user.Vcc					-User vcc.
* @return {object}		user.SessionData			-User session data.
*/
inConcertAgentApi.prototype.GetLoggedUser = function(callback) {
	this.__callOutgoingMethod("GetLoggedUser", null, function(result) {
		callback(result.user || null);
	}, 2);
};

/**
* Get logged user state
*
* @param  {Function}	callback(state)				-Required. Callback function.
* @return {string}		state						-Logged user state.
*/
inConcertAgentApi.prototype.GetLoggedUserState = function(callback) {
	this.__callOutgoingMethod("GetLoggedUserState", null, function(result) {
		callback(result.state || null);
	}, 2);
};

/**
* List user states
*
* @param  {Function}	callback(states)			-Required. Callback function.
* @return {array}		states						-States list.
* @return {string}		states[i].Id				-State id.
* @return {string}		states[i].Description		-State description.
* @return {boolean}		states[i].Break				-Indicates if is a break state.
* @return {boolean}		states[i].Custom			-Indicates if is a custom state.
*/
inConcertAgentApi.prototype.ListUserStates = function(callback) {
	this.__callOutgoingMethod("ListUserStates", null, function(result) {
		callback(result.states || []);
	});
};

/**
* Change user state
*
* @param  {string}		state						-Required. New user state id.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.ChangeUserState = function(state, callback) {
	this.__callOutgoingMethod("ChangeUserState", { state : state }, function(result) {
		callback(result);
	});
};

/**
* Login user
*
* @param  {object}		request						-Required.
* @param  {string}		request.username			-Required.
* @param  {string}		request.vcc					-Required.
* @param  {string}		request.password			-Required.
* @param  {string}		request.mode				-Optional: iframe or tab. Default: tab.
* @param  {bool}		request.closeTabOnError		-Optional: close tab on login error. Default: true.
* @param  {int}			request.timeout				-Optional: login timeout to get a result. Default: 180.
* @param  {object}		request.data				-Optional: user session data.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
* @return {object}		result.user					-If success: logged user object.
*/
inConcertAgentApi.prototype.LoginUser = function(request, callback) {
	let self = this;
	//validate
	if (!request.username || !request.vcc || !request.password) {
		return callback({ result : "FAIL", reason : "must enter credentials" });
	}
	request.mode = request.mode || "tab";
	//process callback
	let callbackGuid = self.GUID();
	self.__loginCallbackGuid = callbackGuid;
	self.__loginCallback = callback;
	window.setTimeout(function() {
		if (self.__loginCallback && self.__loginCallbackGuid === callbackGuid) {
			let callback = self.__loginCallback;
			self.__loginCallback = null;
			if (self.__loginTab) {
				self.__loginTab.close();
				self.__loginTab = null;
			}
			callback({ result : "FAIL", reason : "timeout" });
		}
	}, (request.timeout || 180) * 1000);

	//make url
	let protocol = window.location.protocol;
	if (protocol !== "https:") {
		protocol = this.usesSsl? "https:": "http:";
	}
	let data = request.data || {};
	data.embedded = data.embedded || request.mode === "iframe";
	let path = "/inconcert/apps/agent/login/" + 
		"?username=" + encodeURIComponent(request.username) + 
		"&vcc=" + encodeURIComponent(request.vcc) + 
		"&password=" + encodeURIComponent(request.password) +
		"&data=" + encodeURIComponent(JSON.stringify(data));
	//open login
	if (request.mode === "iframe") {
		self.__appendHiddenIframe({
			id : "inconcert_environment_" + self.iframeToken,
			path : path,
			allow : "camera; microphone"
		});
	}
	else {
		let tab = self.__openTab({ path : path });
		if (request.closeTabOnError !== false) {
			self.__loginTab = tab;
		}
	}
	this.vcc = request.vcc;
};

/**
* Logout user
*
* @param  {object}		request						-Optional.
* @param  {boolean}		request.force				-Optional. Forces to logout.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.LogoutUser = function(request, callback) {
	this.__callOutgoingMethod("LogoutUser", request || {}, function(result) {
		callback(result);
	});
};

/**
* Fire poller
*
* @param  {object}		request						-Optional.
* @param  {boolean}		request.force				-Optional. Indicates if current polling is canceled before.
* @param  {boolean}		request.sync				-Optional. Don't wait for data.
* @param  {boolean}		request.returnData			-Optional. Return poller data on callback.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
* @return {object}		result.data					-Poller data if returnData is true.
*/
inConcertAgentApi.prototype.FirePoller = function(request, callback) {
	this.__callOutgoingMethod("FirePoller", request || {}, function(result) {
		callback(result);
	});
};

/**
* Fire chat messages poller
*
* @param  {object}		request						-Optional.
* @param  {boolean}		request.force				-Optional. Indicates if current polling is canceled before.
* @param  {boolean}		request.sync				-Optional. Don't wait for data.
* @param  {boolean}		request.returnData			-Optional. Return poller data on callback.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
* @return {object}		result.data					-Poller data if returnData is true.
*/
inConcertAgentApi.prototype.FireChatPoller = function(request, callback) {
	this.__callOutgoingMethod("FireChatPoller", request || {}, function(result) {
		callback(result);
	});
};

/**
* Enables automatic poller
*
* @param  {object}		request						-Optional.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.EnableAutomaticPoller = function(request, callback) {
	this.__callOutgoingMethod("EnableAutomaticPoller", request || {}, function(result) {
		callback(result);
	});
};

/**
* Disables automatic poller
*
* @param  {object}		request						-Optional.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.DisableAutomaticPoller = function(request, callback) {
	this.__callOutgoingMethod("DisableAutomaticPoller", request || {}, function(result) {
		callback(result);
	});
};

/**
* Get logged user default campaign
*
* @param  {Function}	callback(DefaultCampaign)	-Required. Callback function.
* @return {string}		DefaultCampaign				-Logged user default campaign.
*/
inConcertAgentApi.prototype.GetLoggedUserDefaultCampaign = function(callback) {
	this.__callOutgoingMethod("GetLoggedUserDefaultCampaign", null, function(result) {
		callback(result.DefaultCampaign || null);
	}, 2);
};

/************************ Campaign methods ************************/

/**
* Get campaigns
*
* @param  {object}		request								-Optional.
* @param  {string}		request.type						-Optional. Filter by accounts proxy type.
* @param  {Function}	callback(campaigns)					-Required. Callback function.
* @return {array}		campaigns							-Campaigns list.
* @return {object}		campaigns[1]						-Campaign object.
* @return {string}		campaigns[1].Id						-Campaign id.
* @return {string}		campaigns[1].Name					-Campaign name.
* @return {string}		campaigns[1].Description			-Campaign description
* @return {string}		campaigns[1].Timezone				-Campaign timezone.
* @return {array}		campaigns[1].Accounts				-Campaign accounts.
* @return {object}		campaigns[1].Accounts[j]			-Account object.
* @return {string}		campaigns[1].Accounts[j].Id			-Account id.
* @return {string}		campaigns[1].Accounts[j].Name		-Account name.
* @return {string}		campaigns[1].Accounts[j].Type		-Account proxy type.
* @return {string}		campaigns[1].Accounts[j].Language	-Account language.
* @return {boolean}		campaigns[1].Accounts[j].Enabled	-Account is enabled.
* @return {string}		campaigns[1].Accounts[j].Status		-Account status (OK if is active).
*/
inConcertAgentApi.prototype.GetCampaigns = function(request, callback) {
	this.__callOutgoingMethod("GetCampaigns", request || {}, function(result) {
		callback(result.campaigns || []);
	});
};

/**
* Get campaign
*
* @param  {string}		campaignId						-Required. Campaign id.
* @param  {Function}	callback(campaign)				-Required. Callback function.
* @return {object}		campaign						-Campaign object.
* @return {string}		campaign.Id						-Campaign id.
* @return {string}		campaign.Name					-Campaign name.
* @return {string}		campaign.Description			-Campaign description
* @return {string}		campaign.Timezone				-Campaign timezone.
* @return {array}		campaign.Accounts				-Campaign accounts.
* @return {object}		campaign.Accounts[j]			-Account object.
* @return {string}		campaign.Accounts[j].Id			-Account id.
* @return {string}		campaign.Accounts[j].Name		-Account name.
* @return {string}		campaign.Accounts[j].Type		-Account proxy type.
* @return {string}		campaign.Accounts[j].Language	-Account language.
* @return {boolean}		campaign.Accounts[j].Enabled	-Account is enabled.
* @return {string}		campaign.Accounts[j].Status		-Account status (OK if is active).
*/
inConcertAgentApi.prototype.GetCampaign = function(campaignId, callback) {
	this.__callOutgoingMethod("GetCampaign", { id : campaignId }, function(result) {
		callback(result.campaign || null);
	});
};

/**
* Get campaign account
*
* @param  {string}		campaignId						-Required. Campaign id.
* @param  {string}		accountId						-Required. Account id or name.
* @param  {Function}	callback(account)				-Required. Callback function.
* @return {object}		account							-Account object.
* @return {string}		account.Id						-Account id.
* @return {string}		account.Name					-Account name.
* @return {string}		account.Type					-Account proxy type.
* @return {string}		account.Language				-Account language.
* @return {boolean}		account.Enabled					-Account is enabled.
* @return {string}		account.Status					-Account status (OK if is active).
*/
inConcertAgentApi.prototype.GetCampaignAccount = function(campaignId, accountId, callback) {
	this.__callOutgoingMethod("GetCampaignAccount", { campaign : campaignId, account : accountId }, function(result) {
		callback(result.account || null);
	});
};

/**
* Get campaign dispositions
*
* @param  {string}		campaignId					-Required. campaign id.
* @param  {Function}	callback(dispositions)		-Required. Callback function.
* @return {array}		dispositions				-Dispositions list.
* @return {object}		dispositions[i]				-Disposition object.
* @return {string}		dispositions[i].name		-Disposition name.
* @return {boolean}		dispositions[i].isGoal		-Disposition is goal.
*/
inConcertAgentApi.prototype.GetCampaignDispositions = function(campaignId, callback) {
	this.__callOutgoingMethod("GetCampaignDispositions", { campaign : campaignId }, function(result) {
		callback(result.dispositions || []);
	});
};

/**
* Get campaign labels
*
* @param  {string}		campaignId					-Required. campaign id.
* @param  {Function}	callback(labels)			-Required. Callback function.
* @return {array}		labels						-Labels list.
* @return {object}		labels[i]					-Label object.
* @return {string}		labels[i].Id				-Label id.
* @return {string}		labels[i].Name				-Label name.
* @return {boolean}		labels[i].System			-Label is system.
*/
inConcertAgentApi.prototype.GetCampaignLabels = function(campaignId, callback) {
	this.__callOutgoingMethod("GetCampaignLabels", { campaign : campaignId }, function(result) {
		callback(result.labels || []);
	});
};

/************************ Interaction methods ************************/

/**
* Get assigned interactions list
* Filters can be strings or arrays (a list of options)
*
* @param  {object}			request						-Optional. Request filters.
* @param  {boolean}			request.full				-Optional. Indicates if steps and events are loaded.
* @param  {string|array}	request.type				-Optional. Filter by interaction type.
* @param  {string|array}	request.campaign			-Optional. Filter by campaign.
* @param  {string|array}	request.account				-Optional. Filter by account id or name.
* @param  {Function}		callback(interactions)		-Required. Callback function.
* @return {Array}			interactions				-Interaction jsons array.
*/
inConcertAgentApi.prototype.GetAssignedInteractions = function(request, callback) {
	this.__callOutgoingMethod("GetAssignedInteractions", request || {}, function(result) {
		callback(result.interactions || []);
	});
};

/**
* Get appointment interactions list
* Filters can be strings or arrays (a list of options)
*
* @param  {object}			request						-Optional. Request filters.
* @param  {boolean}			request.full				-Optional. Indicates if steps and events are loaded.
* @param  {string|array}	request.type				-Optional. Filter by interaction type.
* @param  {string|array}	request.campaign			-Optional. Filter by campaign.
* @param  {Function}		callback(interactions)		-Required. Callback function.
* @return {Array}			interactions				-Interaction jsons array.
*/
inConcertAgentApi.prototype.GetAppointmentInteractions = function(request, callback) {
	this.__callOutgoingMethod("GetAppointmentInteractions", request || {}, function(result) {
		callback(result.interactions || []);
	});
};

/**
* Get waiting interactions list
* Filters can be strings or arrays (a list of options)
*
* @param  {object}			request						-Optional. Request filters.
* @param  {boolean}			request.full				-Optional. Indicates if steps and events are loaded.
* @param  {string|array}	request.type				-Optional. Filter by interaction type.
* @param  {string|array}	request.campaign			-Optional. Filter by campaign.
* @param  {string|array}	request.account				-Optional. Filter by account id or name.
* @param  {string|array}	request.address				-Optional. Filter by address.
* @param  {string|array}	request.contactId			-Optional. Filter by contact system id.
* @param  {string|array}	request.contactExternalId	-Optional. Filter by contact external id.
* @param  {string|array}	request.contactName			-Optional. Filter by contact name.
* @param  {string|array}	request.text				-Optional. Filter by text.
* @param  {string|array}	request.ticket				-Optional. Filter by ticket.
* @param  {string|array}	request.dateFrom			-Optional. Filter by date from (yyyy-mm-dd).
* @param  {string|array}	request.dateTo				-Optional. Filter by date to (yyyy-mm-dd).
* @param  {boolean}			request.exact				-Optional. Indicates if filters are exact. Default: false.
* @param  {integer}			request.rows				-Optional. Number of rows to return. Default: 20.
* @param  {integer}			request.last				-Optional. Number of last row (to paginate).
* @param  {Function}		callback(result)			-Required. Callback function.
* @return {object}			result						-Action result.
* @return {string}			result.result				-Result code. OK if success.
* @return {string}			result.reason				-Error message.
* @return {Array}			result.interactions			-Interaction jsons array.
* @return {integer}			result.last					-Number of last retrieved interaction.
* @return {integer}			result.total				-Total number of filtered interactions.
* @return {boolean}			result.areMore				-Indicates if are more interactions to get.
*/
inConcertAgentApi.prototype.GetWaitingInteractions = function(request, callback) {
	this.__callOutgoingMethod("GetWaitingInteractions", request || {}, function(result) {
		callback(result);
	});
};

/**
* Get top queued interactions (sorted by date, priority, etc.)
*
* @param  {object}			request						-Optional. Request filters.
* @param  {boolean}			request.full				-Optional. Indicates if steps and events are loaded.
* @param  {Function}		callback(interactions)		-Required. Callback function.
* @return {Array}			interactions				-Interaction jsons array.
*/
inConcertAgentApi.prototype.GetTopQueuedInteractions = function(request, callback) {
	this.__callOutgoingMethod("GetTopQueuedInteractions", request || {}, function(result) {
		callback(result.interactions || []);
	});
};

/**
* Get queued interactions list
* Filters can be strings or arrays (a list of options)
*
* @param  {object}			request						-Optional. Request filters.
* @param  {boolean}			request.fromMemory			-Optional. Get interactions list from agent memory.
* @param  {boolean}			request.full				-Optional. Indicates if steps and events are loaded.
* @param  {string|array}	request.type				-Optional. Filter by interaction type.
* @param  {string|array}	request.campaign			-Optional. Filter by campaign.
* @param  {string|array}	request.account				-Optional. Filter by account id or name.
* @param  {string|array}	request.address				-Optional. Filter by address.
* @param  {string|array}	request.contactId			-Optional. Filter by contact system id.
* @param  {string|array}	request.contactExternalId	-Optional. Filter by contact external id.
* @param  {string|array}	request.contactName			-Optional. Filter by contact name.
* @param  {string|array}	request.text				-Optional. Filter by text.
* @param  {string|array}	request.ticket				-Optional. Filter by ticket.
* @param  {string|array}	request.dateFrom			-Optional. Filter by date from (yyyy-mm-dd).
* @param  {string|array}	request.dateTo				-Optional. Filter by date to (yyyy-mm-dd).
* @param  {boolean}			request.exact				-Optional. Indicates if filters are exact. Default: false.
* @param  {integer}			request.rows				-Optional. Number of rows to return. Default: 20.
* @param  {integer}			request.last				-Optional. Number of last row (to paginate).
* @param  {Function}		callback(result)			-Required. Callback function.
* @return {object}			result						-Action result.
* @return {string}			result.result				-Result code. OK if success.
* @return {string}			result.reason				-Error message.
* @return {Array}			result.interactions			-Interaction jsons array.
* @return {integer}			result.last					-Number of last retrieved interaction.
* @return {integer}			result.total				-Total number of filtered interactions.
* @return {boolean}			result.areMore				-Indicates if are more interactions to get.
*/
inConcertAgentApi.prototype.GetQueuedInteractions = function(request, callback) {
	this.__callOutgoingMethod("GetQueuedInteractions", request || {}, function(result) {
		callback(result);
	});
};

/**
* Get archive interactions list
* Filters can be strings or arrays (a list of options)
*
* @param  {object}			request						-Optional. Request filters.
* @param  {boolean}			request.full				-Optional. Indicates if steps and events are loaded.
* @param  {string|array}	request.type				-Optional. Filter by interaction type.
* @param  {string|array}	request.campaign			-Optional. Filter by campaign.
* @param  {string|array}	request.account				-Optional. Filter by account id or name.
* @param  {string|array}	request.address				-Optional. Filter by address.
* @param  {string|array}	request.contactId			-Optional. Filter by contact system id.
* @param  {string|array}	request.contactExternalId	-Optional. Filter by contact external id.
* @param  {string|array}	request.contactName			-Optional. Filter by contact name.
* @param  {string|array}	request.text				-Optional. Filter by text.
* @param  {string|array}	request.ticket				-Optional. Filter by ticket.
* @param  {string|array}	request.dateFrom			-Optional. Filter by date from (yyyy-mm-dd).
* @param  {string|array}	request.dateTo				-Optional. Filter by date to (yyyy-mm-dd).
* @param  {string|array}	request.disposition			-Optional. Filter by disposition code.
* @param  {boolean}			request.exact				-Optional. Indicates if filters are exact. Default: false.
* @param  {integer}			request.rows				-Optional. Number of rows to return. Default: 20.
* @param  {integer}			request.last				-Optional. Number of last row (to paginate).
* @param  {Function}		callback(result)			-Required. Callback function.
* @return {object}			result						-Action result.
* @return {string}			result.result				-Result code. OK if success.
* @return {string}			result.reason				-Error message.
* @return {Array}			result.interactions			-Interaction jsons array.
* @return {integer}			result.last					-Number of last retrieved interaction.
* @return {integer}			result.total				-Total number of filtered interactions.
* @return {boolean}			result.areMore				-Indicates if are more interactions to get.
*/
inConcertAgentApi.prototype.GetArchiveInteractions = function(request, callback) {
	this.__callOutgoingMethod("GetArchiveInteractions", request || {}, function(result) {
		callback(result);
	});
};

/**
* Get abandoned interactions list
* Filters can be strings or arrays (a list of options)
*
* @param  {object}			request						-Optional. Request filters.
* @param  {boolean}			request.full				-Optional. Indicates if steps and events are loaded.
* @param  {string|array}	request.type				-Optional. Filter by interaction type.
* @param  {string|array}	request.campaign			-Optional. Filter by campaign.
* @param  {string|array}	request.account				-Optional. Filter by account id or name.
* @param  {string|array}	request.address				-Optional. Filter by address.
* @param  {string|array}	request.contactId			-Optional. Filter by contact system id.
* @param  {string|array}	request.contactExternalId	-Optional. Filter by contact external id.
* @param  {string|array}	request.contactName			-Optional. Filter by contact name.
* @param  {string|array}	request.text				-Optional. Filter by text.
* @param  {string|array}	request.ticket				-Optional. Filter by ticket.
* @param  {string|array}	request.dateFrom			-Optional. Filter by date from (yyyy-mm-dd).
* @param  {string|array}	request.dateTo				-Optional. Filter by date to (yyyy-mm-dd).
* @param  {string|array}	request.disposition			-Optional. Filter by disposition code.
* @param  {boolean}			request.exact				-Optional. Indicates if filters are exact. Default: false.
* @param  {boolean}			request.excludeNotCallbackAllowed			-Optional. Exclude abandoned interactions where callback is not allowd. Default: false.
* @param  {integer}			request.rows				-Optional. Number of rows to return. Default: 20.
* @param  {integer}			request.last				-Optional. Number of last row (to paginate).
* @param  {Function}		callback(result)			-Required. Callback function.
* @return {object}			result						-Action result.
* @return {string}			result.result				-Result code. OK if success.
* @return {string}			result.reason				-Error message.
* @return {Array}			result.interactions			-Interaction jsons array.
* @return {integer}			result.last					-Number of last retrieved interaction.
* @return {integer}			result.total				-Total number of filtered interactions.
* @return {boolean}			result.areMore				-Indicates if are more interactions to get.
*/
inConcertAgentApi.prototype.GetAbandonedInteractions = function(request, callback) {
	this.__callOutgoingMethod("GetAbandonedInteractions", request || {}, function(result) {
		callback(result);
	});
};

/**
* Global search interactions
* Filters can be strings or arrays (a list of options)
*
* @param  {object}			request						-Optional. Request filters.
* @param  {boolean}			request.full				-Optional. Indicates if steps and events are loaded.
* @param  {string|array}	request.type				-Optional. Filter by interaction type.
* @param  {string|array}	request.campaign			-Optional. Filter by campaign.
* @param  {string|array}	request.account				-Optional. Filter by account id or name.
* @param  {string|array}	request.address				-Optional. Filter by address.
* @param  {string|array}	request.contactId			-Optional. Filter by contact system id.
* @param  {string|array}	request.contactExternalId	-Optional. Filter by contact external id.
* @param  {string|array}	request.contactName			-Optional. Filter by contact name.
* @param  {string|array}	request.text				-Optional. Filter by text.
* @param  {string|array}	request.ticket				-Optional. Filter by ticket.
* @param  {string|array}	request.dateFrom			-Optional. Filter by date from (yyyy-mm-dd).
* @param  {string|array}	request.dateTo				-Optional. Filter by date to (yyyy-mm-dd).
* @param  {string|array}	request.disposition			-Optional. Filter by disposition code.
* @param  {string|array}	request.agent				-Optional. Filter by agent id.
* @param  {string|array}	request.attention_level		-Optional. Filter by attention level.
* @param  {string|array}	request.state				-Optional. Filter by state: "ABANDONED", "FINISHED", "QUEUED", "LOCKED", "TAKEN", "TRANSFER QUEUED", "WAITING", "WRAPUP"
* @param  {boolean}			request.exact				-Optional. Indicates if filters are exact. Default: false.
* @param  {integer}			request.rows				-Optional. Number of rows to return. Default: 20.
* @param  {integer}			request.last				-Optional. Number of last row (to paginate).
* @param  {Function}		callback(result)			-Required. Callback function.
* @return {object}			result						-Action result.
* @return {string}			result.result				-Result code. OK if success.
* @return {string}			result.reason				-Error message.
* @return {Array}			result.interactions			-Interaction jsons array.
* @return {integer}			result.last					-Number of last retrieved interaction.
* @return {integer}			result.total				-Total number of filtered interactions.
* @return {boolean}			result.areMore				-Indicates if are more interactions to get.
*/
inConcertAgentApi.prototype.GlobalSearchInteractions = function(request, callback) {
	this.__callOutgoingMethod("GlobalSearchInteractions", request || {}, function(result) {
		callback(result);
	});
};

/**
* Get interaction json
*
* @param  {string}		interactionId				-Required. Interaction id, global interactionId if empty.
* @param  {Function}	callback(interaction)		-Required. Callback function.
* @return {object}		interaction					-Interaction json. Includes events and steps lists.
*/
inConcertAgentApi.prototype.GetInteraction = function(interactionId, callback) {
	this.__callOutgoingMethod("GetInteraction", { id : interactionId || this.interactionId }, function(result) {
		callback(result.interaction || null);
	});
};

/**
* Get assigned interaction by address
*
* @param  {object}			request						-Required. Request filters.
* @param  {string}			request.type				-Required. Interaction type.
* @param  {string}			request.campaign			-Required. Interaction campaign.
* @param  {string}			request.account				-Required. Interaction account id or name.
* @param  {string}			request.address				-Required. Interaction address.
* @param  {Function}		callback(interaction)		-Required. Callback function.
* @return {object}			interaction					-Interaction json.
*/
inConcertAgentApi.prototype.GetAssignedInteractionByAddress = function(request, callback) {
	this.__callOutgoingMethod("GetAssignedInteractionByAddress", request || {}, function(result) {
		callback(result.interaction || null);
	});
};

/**
* Get assigned interaction by contact
*
* @param  {object}			request						-Required. Request filters.
* @param  {string}			request.type				-Required. Interaction type.
* @param  {string}			request.campaign			-Required. Interaction campaign.
* @param  {string}			request.account				-Required. Interaction account id or name.
* @param  {string}			request.contactId			-Required. Interaction contact id.
* @param  {boolean}			request.isExternal			-Optional. Indicates if is contact external id or system id.
* @param  {Function}		callback(interaction)		-Required. Callback function.
* @return {object}			interaction					-Interaction json.
*/
inConcertAgentApi.prototype.GetAssignedInteractionByContact = function(request, callback) {
	this.__callOutgoingMethod("GetAssignedInteractionByContact", request || {}, function(result) {
		callback(result.interaction || null);
	});
};

/**
* Take next queued interaction
*
* @param  {object}		request						-Optional. Request filters.
* @param  {string}		request.campaign			-Optional. Interaction campaign to take.
* @param  {string}		request.type				-Optional. Interaction type to take.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
* @return {object}		result.interaction			-Interaction json. Includes events and steps lists.
*/
inConcertAgentApi.prototype.TakeNextQueuedInteraction = function(request, callback) {
	this.__callOutgoingMethod("TakeNextQueuedInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Take queued interaction
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to take.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.TakeQueuedInteraction = function(request, callback) {
	this.__callOutgoingMethod("TakeQueuedInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Requeue assigned interaction
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to requeue, global interactionId if empty.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.RequeueInteraction = function(request, callback) {
	request = request || {};
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("RequeueInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Hangup Call or Chat session
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Required. Id of interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.HangupInteraction = function(request, callback) {
	this.__callOutgoingMethod("HangupInteraction", request || {}, function(result) {
		callback(result);
	});
};

/**
* Archive assigned interaction
*
* @param  {object}		request									-Required. Request.
* @param  {string}		request.id								-Required. Id of interaction to archive, global interactionId if empty.
* @param  {object}		request.disposition						-Optional. Disposition object.
* @param  {string}		request.disposition.name				-Required. Disposition name.
* @param  {array}		request.disposition.treePath			-Required. Disposition three path (an array like ["path","to","name"]
* @param  {string}		request.disposition.rescheduleDate		-Optional. Reschedule date. CALL only.
* @param  {string}		request.disposition.rescheduleTo		-Optional. Reschedule to agent. CALL only.
* @param  {string}		request.disposition.alternativeNumber	-Optional. Reschedule to alternative phone. CALL only.
* @param  {string}		request.comment							-Optional. Comment text.
* @param  {Function}	callback(result)						-Required. Callback function.
* @return {object}		result									-Action result.
* @return {string}		result.result							-Result code. OK if success.
* @return {string}		result.reason							-Error message.
*/
inConcertAgentApi.prototype.ArchiveInteraction = function(request, callback) {
	request = request || {};
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("ArchiveInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Reopen interaction
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to reopen, global interactionId if empty.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.ReopenInteraction = function(request, callback) {
	request = request || {};
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("ReopenInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Cancel draft interaction
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to cancel, global interactionId if empty.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.CancelInteraction = function(request, callback) {
	request = request || {};
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("CancelInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Comment interaction
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to comment, global interactionId if empty.
* @param  {string}		request.comment				-Required. Text of comment.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.CommentInteraction = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("CommentInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Search interaction ticket
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.ticket				-Required. Ticket to search.
* @param  {Function}	callback(interactions)		-Required. Callback function.
* @return {array}		interactions				-A list of interactions with assigned ticket.
*/
inConcertAgentApi.prototype.SearchTicket = function(request, callback) {
	this.__callOutgoingMethod("SearchTicket", request, function(result) {
		callback(result.interactions || []);
	});
};

/**
* Emit interaction ticket
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to emit ticket, global interactionId if empty.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.ticket				-Emited ticket.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.EmitInteractionTicket = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("EmitInteractionTicket", request, function(result) {
		callback(result);
	});
};

/**
* Update interaction labels
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to update labels, global interactionId if empty.
* @param  {array}		request.addedLabels			-Optional. A list of added labels.
* @param  {string}		request.addedLabels[i]		-Id of label to add.
* @param  {array}		request.removedLabels		-Optional. A list of removed labels.
* @param  {string}		request.addedLabels[i]		-Id of label to remove.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.UpdateInteractionLabels = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("UpdateInteractionLabels", request, function(result) {
		callback(result);
	});
};

/**
* Update interaction disposition code
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to update labels, global interactionId if empty.
* @param  {string}		request.comment				-Optional. Comment to add.
* @param  {array}		request.disposition			-Required. name and treePath of disposition to set.
* @param  {string}		request.disposition.name		-Required. Disposition name.
* @param  {array}		request.disposition.treePath	-Required. Disposition three path (an array like ["DC1", "DC1_1", "DC1_1_1"])
* @param  {Function}	callback						-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.UpdateInteractionDispositionCode = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("UpdateInteractionDispositionCode", request, function(result) {
		callback(result);
	});
};

/**
* Mark events as read
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to read events, global interactionId if empty.
* @param  {array}		request.events				-Optional. A list of event indexes to mark as read. Empty if all.
* @param  {integer}		request.events[i]			-Index of event to read.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.ReadInteractionEvents = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("ReadInteractionEvents", request, function(result) {
		callback(result);
	});
};

/**
* Mark events as unread
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to unread events, global interactionId if empty.
* @param  {array}		request.events				-Optional. A list of event indexes to mark as unread. Empty if all.
* @param  {integer}		request.events[i]			-Index of event to read.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.UnreadInteractionEvents = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("UnreadInteractionEvents", request, function(result) {
		callback(result);
	});
};

/**
* Get interaction dispositions
*
* @param  {string}		interactionId				-Required. interaction id, global interactionId if empty.
* @param  {Function}	callback(dispositions)		-Required. Callback function.
* @return {array}		dispositions				-Dispositions list.
* @return {object}		dispositions[i]				-Disposition object.
* @return {string}		dispositions[i].name		-Disposition name.
* @return {boolean}		dispositions[i].isGoal		-Disposition is goal.
*/
inConcertAgentApi.prototype.GetInteractionDispositions = function(interactionId, callback) {
	this.__callOutgoingMethod("GetInteractionDispositions", { id : interactionId || this.interactionId }, function(result) {
		callback(result.dispositions || []);
	});
};

/**
* Get members to transfer.
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to transfer, global interactionId if empty.
* @param  {Function}	callback(members)			-Required. Callback function.
* @return {array}		members						-Members list.
* @return {object}		members[i]					-User object.
* @return {string}		members[i].Id				-User id.
* @return {string}		members[i].FirstName		-User first name.
* @return {string}		members[i].LastName			-User last name.
* @return {string}		members[i].FirstSurname		-User first surname.
* @return {string}		members[i].LastSurname		-User last surname.
* @return {string}		members[i].CompleteName		-User complete name.
* @return {string}		members[i].Avatar			-User avatar url.
* @return {array}		members[i].AttentionLevels	-User assigned attention levels.
*/
inConcertAgentApi.prototype.GetInteractionMembersToTransfer = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("GetInteractionMembersToTransfer", request, function(result) {
		callback(result.members || []);
	});
};

/**
* Get campaigns to transfer.
*
* @param  {object}		request								-Required. Request.
* @param  {string}		request.id							-Required. Id of interaction to transfer, global interactionId if empty.
* @param  {Function}	callback(campaigns)					-Required. Callback function.
* @return {array}		campaigns							-Members list.
* @return {object}		campaigns[i]						-Campaign object.
* @return {string}		campaigns[i].Id						-Campaign id.
* @return {string}		campaigns[i].Name					-Campaign name.
* @return {array}		campaigns[i].Accounts				-Campaign accounts list.
* @return {object}		campaigns[i].Accounts[j]			-Campaign account object.
* @return {string}		campaigns[i].Accounts[j].Id			-Account id.
* @return {string}		campaigns[i].Accounts[j].Name		-Account name.
* @return {string}		campaigns[i].Accounts[j].Type		-Account proxy type.
* @return {string}		campaigns[i].Accounts[j].Language	-Account language.
* @return {boolean}		campaigns[i].Accounts[j].Enabled	-Account is enabled.
* @return {string}		campaigns[i].Accounts[j].Status		-Account status (OK if is active).
*/
inConcertAgentApi.prototype.GetInteractionCampaignsAndAccountsToTransfer = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("GetInteractionCampaignsAndAccountsToTransfer", request, function(result) {
		callback(result.campaigns || []);
	});
};

/**
* Get attention levels to transfer.
*
* @param  {object}		request								-Required. Request.
* @param  {string}		request.id							-Required. Id of interaction to transfer, global interactionId if empty.
* @param  {Function}	callback(attentionLevels)			-Required. Callback function.
* @return {array}		attentionLevels						-Attention levels list.
* @return {object}		attentionLevels[i]					-Attention level object.
* @return {string}		attentionLevels[i].Id				-Attention level id.
* @return {string}		attentionLevels[i].Name				-Attention level name.
*/
inConcertAgentApi.prototype.GetInteractionAttentionLevelsToTransfer = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("GetInteractionAttentionLevelsToTransfer", request, function(result) {
		callback(result.attentionLevels || []);
	});
};

/**
* Transfer interaction to member
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to transfer, global interactionId if empty.
* @param  {string}		request.member				-Required. Id of member to transfer.
* @param  {string}		request.attentionLevel		-Optional. Attention level to transfer.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.TransferInteractionToMember = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("TransferInteractionToMember", request, function(result) {
		callback(result);
	});
};

/**
* Transfer interaction to number (call only)
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to transfer, global interactionId if empty.
* @param  {string}		request.number				-Required. Number to transfer.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.TransferInteractionToNumber = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("TransferInteractionToNumber", request, function(result) {
		callback(result);
	});
};

/**
* Transfer interaction to campaign
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to transfer, global interactionId if empty.
* @param  {string}		request.campaign			-Required. Campaign to transfer.
* @param  {string}		request.account				-Required. Account id to transfer.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.TransferInteractionToCampaign = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("TransferInteractionToCampaign", request, function(result) {
		callback(result);
	});
};

/**
* Transfer interaction to attention level
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to transfer, global interactionId if empty.
* @param  {string}		request.attentionLevel		-Required. Attention level to transfer.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.TransferInteractionToAttentionLevel = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("TransferInteractionToAttentionLevel", request, function(result) {
		callback(result);
	});
};


/**
* Transfer interaction to process flow
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to transfer, global interactionId if empty.
* @param  {string}		request.processFlow			-Required. Process Flow to transfer.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.TransferInteractionToProcessFlow = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("TransferInteractionToProcessFlow", request, function(result) {
		callback(result);
	});
};

/**
* Conference interaction to number (call only)
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to conference, global interactionId if empty.
* @param  {string}		request.number				-Required. Number to transfer.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.ConferenceInteractionToNumber = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("ConferenceInteractionToNumber", request, function(result) {
		callback(result);
	});
};

/**
* Conference interaction to member (call only)
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to transfer, global interactionId if empty.
* @param  {string}		request.member				-Required. Id of member to transfer.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.ConferenceInteractionToMember = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("ConferenceInteractionToMember", request, function(result) {
		callback(result);
	});
};

/**
* Schedule interaction (call only)
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to schedule, global interactionId if empty.
* @param  {string}		request.date				-Optional. Now if not. YYYY-MM-DD HH:MM.
* @param  {string}		request.number				-Optional. Number to transfer (interaction number if empty).
* @param  {string}		request.overridedNumber		-Optional. true to use the number passed in request.number.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.ScheduleInteraction = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("ScheduleInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Get interaction reporting data fields
*
* @param  {object}		request					-Required.
* @param  {string}		request.id				-Required. interaction id, global interactionId if empty.
* @param  {string}		request.scope			-Required. Fields scope: params, pre_survey, post_survey, login, dswebchat, dscontactform, dsapi, dsbatch_data, dsprocess_flow, process_flow_data, dscci
* @param  {boolean}		request.json			-Optional. Default: false. Indicates if result is an array or a key-value json.
* @param  {Function}	callback(fields)		-Required. Callback function.
* @return {array}		fields					-fields list.
* @return {object}		fields[i]				-field object.
* @return {string}		fields[i].name			-Field name.
* @return {string}		fields[i].value			-Field value.
* @return {string}		fields[i].displayName	-Optional. Field display name.
* @return {boolean}		fields[i].hidden		-Optional. Field is hidden.
*/
inConcertAgentApi.prototype.GetInteractionReportingDataFields = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("GetInteractionReportingDataFields", request, function(result) {
		callback(result.fields || []);
	});
};

/**
* Get interaction reporting data field value
*
* @param  {object}		request					-Required.
* @param  {string}		request.id				-Required. interaction id, global interactionId if empty.
* @param  {string}		request.scope			-Required. Field scope: phone_call, params, pre_survey, post_survey, login, dswebchat, contactform, dscontactform, api, dsapi, dsbatch_data, dsprocess_flow, process_flow_data, dscci
* *** phone_call scope only to taken CALL or VOICEMAIL interactions
* @param  {string}		request.field			-Required. Field name.
* @param  {Function}	callback(value)			-Required. Callback function.
* @return {var}			value					-field value.
*/
inConcertAgentApi.prototype.GetInteractionReportingDataField = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("GetInteractionReportingDataField", request, function(result) {
		callback(result.value);
	});
};

/**
* Forward messages (whatsapp only)
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to forward events, global interactionId if empty.
* @param  {string}		request.address				-Required. Address to forward events.
* @param  {array}		request.events				-Required. A list of event indexes to forward.
* @param  {integer}		request.events[i]			-Index of event to forward.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.ForwardInteractionMessages = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("ForwardInteractionMessages", request, function(result) {
		callback(result);
	});
};

/**
* Create outgoing interaction
*
* @param  {object}		request					-Required.
* @param  {string}		request.type			-Required. Interaction type (CALL, SMS, WHATSAPP, etc.).
* @param  {string}		request.campaign		-Optional. Interaction campaign.
* @param  {string}		request.account			-Optional. Interaction account id or name.
* @param  {string}		request.attentionLevel	-Optional. Interaction attention level id or name.
* @param  {object}		request.address			-Optional. Interaction address.
* @param  {string}		request.addressType		-Optional. Interaction address type (Phone, Mail, Facebook, Twitter).
* @param  {string}		request.contactId		-Optional. Contact id.
* @param  {boolean}		request.isExternal		-Optional. Indicates if is contact external id or system id.
* @param  {string}		request.contactName		-Optional. Contact name.
* @param  {object}		request.message			-Optional. Interaction message.
* @param  {boolean}		request.autosend		-Optional. Auto send message.
* @param  {Function}	callback(result)		-Required. Callback function.
* @return {object}		result					-Action result.
* @return {string}		result.result			-Result code. OK if success.
* @return {string}		result.reason			-Error message.
* @return {object}		result.interaction		-Created interaction.
*/
inConcertAgentApi.prototype.CreateOutgoingInteraction = function(request, callback) {
	this.__callOutgoingMethod("CreateOutgoingInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Open interaction client
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to open client, global interactionId if empty.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.OpenInteractionClient = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("OpenInteractionClient", request, function(result) {
		callback(result);
	});
};

/**
* Send message to interaction
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to send message, global interactionId if empty.
* @param  {object}		request.message				-Required. Interaction message.
* @param  {boolean}		request.autosend			-Optional. Auto send message.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.SendMessageToInteraction = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("SendMessageToInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Send message to assigned interaction by address
*
* @param  {object}			request						-Required. Request filters.
* @param  {string}			request.type				-Required. Interaction type.
* @param  {string}			request.campaign			-Required. Interaction campaign.
* @param  {string}			request.account				-Required. Interaction account id or name.
* @param  {string}			request.address				-Required. Interaction address.
* @param  {string}			request.addressType			-Required. Interaction address type (Phone, Mail, Facebook, Twitter).
* @param  {object}			request.message				-Required. Interaction message.
* @param  {boolean}			request.autosend			-Optional. Auto send message.
* @param  {boolean}			request.createIfNotFound	-Optional. Creates a new interaction if has not an assigned interaction.
* @param  {string}			request.contactId			-Optional. Interaction contact id, used if creates a new interaction.
* @param  {boolean}			request.isExternal			-Optional. Indicates if is contact external id or system id, used if creates a new interaction.
* @param  {Function}		callback(result)			-Required. Callback function.
* @return {object}			result						-Action result.
* @return {string}			result.result				-Result code. OK if success.
* @return {string}			result.reason				-Error message.
*/
inConcertAgentApi.prototype.SendMessageToAddress = function(request, callback) {
	this.__callOutgoingMethod("SendMessageToAddress", request || {}, function(result) {
		callback(result);
	});
};

/**
* Send message to assigned interaction by contact
*
* @param  {object}			request						-Required. Request filters.
* @param  {string}			request.type				-Required. Interaction type.
* @param  {string}			request.campaign			-Required. Interaction campaign.
* @param  {string}			request.account				-Required. Interaction account id or name.
* @param  {string}			request.contactId			-Required. Interaction contact id.
* @param  {boolean}			request.isExternal			-Optional. Indicates if is contact external id or system id.
* @param  {object}			request.message				-Required. Interaction message.
* @param  {boolean}			request.autosend			-Optional. Auto send message.
* @param  {boolean}			request.createIfNotFound	-Optional. Creates a new interaction if has not an assigned interaction.
* @param  {string}			request.address				-Optional. Interaction address, used if creates a new interaction.
* @param  {string}			request.addressType			-Optional. Interaction address type, used if creates a new interaction (Phone, Mail, Facebook, Twitter).
* @param  {Function}		callback(result)			-Required. Callback function.
* @return {object}			result						-Action result.
* @return {string}			result.result				-Result code. OK if success.
* @return {string}			result.reason				-Error message.
*/
inConcertAgentApi.prototype.SendMessageToContact = function(request, callback) {
	this.__callOutgoingMethod("SendMessageToContact", request || {}, function(result) {
		callback(result);
	});
};

/************************ Make messages methods ************************/

/**
* Makes a text message
*
* @param  {object}		request					-Required.
* @param  {string}		request.text			-Required. Message text.
* @return {object}		message					-Created message.
*/
inConcertAgentApi.prototype.MakeTextMessage = function(request) {
	return {
		msgtype : "text",
		text : request.text || ""
	};
};

/**
* Get account template messages options (whatsapp only)
*
* @param  {object}		request									-Required.
* @param  {string}		request.campaign						-Required. campaign id.
* @param  {string}		request.account							-Required. account id or name.
* @param  {Function}	callback(messages)						-Required. Callback function.
* @return {array}		messages								-Templates list.
* @return {object}		messages[i]								-Template object.
* @return {string}		messages[i].id							-Template id.
* @return {string}		messages[i].groupId						-Template group.
* @return {boolean}		messages[i].available					-Indicates if template is avaiable to be used.
* @return {array}		messages[i].params						-An array of template parameters.
* @return {object}		messages[i].languages					-Template available languages map.
* @return {object}		messages[i].languages[lang]				-Template language object.
* @return {object}		messages[i].languages[lang].text		-Template language message text.
*/
inConcertAgentApi.prototype.GetAccountTemplateMessageOptions = function(request, callback) {
	this.__callOutgoingMethod("GetAccountTemplateMessageOptions", request, function(result) {
		callback(result.options || []);
	});
};

/**
* Get interaction template messages options (whatsapp only)
*
* @param  {object}		interactionId				-Required. Interaction id, global interactionId if empty.
* @param  {Function}	callback(messages)			-Required. Callback function.
* @return {array}		messages					-Templates list.
* @return {object}		messages[i]					-Template object.
* @return {string}		messages[i].name			-Template name.
*/
inConcertAgentApi.prototype.GetInteractionTemplateMessageOptions = function(interactionId, callback) {
	this.__callOutgoingMethod("GetInteractionTemplateMessageOptions", { id : interactionId || this.interactionId }, function(result) {
		callback(result.options || []);
	});
};

/**
* Makes a template message
*
* @param  {object}		request					-Optional.
* @param  {string}		request.group			-Optional. Template group.
* @param  {string}		request.id				-Optional. Template id.
* @param  {string}		request.language		-Optional. Template language.
* @param  {array}		request.parameters		-Optional. Template parameters array.
* @return {object}		message					-Created message.
*/
inConcertAgentApi.prototype.MakeTemplateMessage = function(request) {
	request = request || {};
	return {
		msgtype : "template",
		template : {
			group : request.group || null,
			id : request.id || null,
			language : request.language || null,
			example_header_text_value : request.example_header_text_value || null,
			parameters: request.parameters || null,
			hsm_buttons: request.hsm_buttons || []
		}
	};
};

/**
* Get shared files list
*
* @param  {object}			request						-Optional. Request filters.
* @param  {string}			request.type				-Optional. Filter by file type (image, audio, video, file)
* @param  {string}			request.name				-Optional. Filter by name/description.
* @param  {string|array}	request.extension			-Optional. Filter by extension (could be an array of extensions).
* @param  {integer}			request.maxSize				-Optional. Max file size (in bytes).
* @param  {integer}			request.rows				-Optional. Number of rows to return. Default: 20.
* @param  {integer}			request.last				-Optional. Id of last row (to paginate).
* @param  {Function}		callback(result)			-Required. Callback function.
* @return {object}			result						-Action result.
* @return {string}			result.result				-Result code. OK if success.
* @return {string}			result.reason				-Error message.
* @return {integer}			result.last					-Id of last retrieved row.
* @return {integer}			result.total				-Total number of filtered rows.
* @return {Array}			result.files				-Files list.
* @return {Object}			result.files[i]				-File json.
* @return {string}			result.files[i].Id			-File id.
* @return {string}			result.files[i].Description	-File description.
* @return {string}			result.files[i].Type		-File type.
* @return {string}			result.files[i].ContentType	-File content type.
* @return {integer}			result.files[i].Size		-File size (in bytes).
*/
inConcertAgentApi.prototype.GetSharedFiles = function(request, callback) {
	this.__callOutgoingMethod("GetSharedFiles", request || {}, function(result) {
		callback(result);
	});
};

/**
* Makes a shared file attachment message
*
* @param  {object}		request					-Required.
* @param  {string}		request.type			-Required. File type (image, audio, video, file)
* @param  {string}		request.id				-Optional. File id.
* @param  {string}		request.text			-Optional. Message text.
* @return {object}		message					-Created message.
*/
inConcertAgentApi.prototype.MakeSharedFileMessage = function(request) {
	request = request || {};
	return {
		msgtype : "shared_file",
		fileType : request.type,
		fileId : request.id,
		text : request.text
	};
};

/**
* Makes an attachment file message
*
* @param  {object}		request					-Required.
* @param  {string}		request.type			-Required. File type (image, audio, video, file)
* @param  {string}		request.id				-Required. Id of repository file to be attached.
* @param  {string}		request.text			-Optional. Message text.
* @return {object}		message					-Created message.
*/
inConcertAgentApi.prototype.MakeAttachmentMessage = function(request) {
	request = request || {};
	return {
		msgtype : "attachment",
		fileType : request.type,
		fileId : request.id,
		text : request.text
	};
};

/**
* Makes an attachment file message
*
* @param  {object}		request					-Required.
* @param  {File}		request.file			-Required. File to be uploaded.
* @param  {Function}	callback(result)		-Required. Callback function.
* @return {object}		result					-Action result.
* @return {string}		result.result			-Result code. OK if success.
* @return {string}		result.reason			-Error message.
* @return {object}		result.file				-Uploaded file data.
* @return {string}		result.file.id			-Uploaded file id.
* @return {string}		result.file.name		-Uploaded file name.
* @return {string}		result.file.contentType	-Uploaded file content type.
*/
inConcertAgentApi.prototype.UploadFile = function(request, callback, progress) {
	var self = this;
	callback = callback || this.__noop;
	progress = progress || this.__noop;
	var maxSize = this.__maxFileSize();
	if (request.file.size > maxSize * 1024 * 1024) {
		return callback(false, {
			status : false,
			reason : "file size must be less than " + maxSize + "MB"
		});
	}
	var id = request.id || this.GUID();
	var url = "repository/new/" + this.__makeQueryString({
		id : id,
		section : (request.section !== null && request.section !== undefined)? request.section : -1,
		contentType : request.file.type,
		format : this.__fileExtension(request.file.name) || "",
		fileName : request.file.name,
		vcc: self.getMD5(this.vcc)
	});
	this.__uploadFile(url, request.file, 
	function(status, result) {
		if (status) {
			callback(true, { id : id });
		}
		else {
			callback(false, result);
		}
	}, progress);
};

/**
* Get account template messages options (whatsapp only)
*
* @param  {object}		request									-Required.
* @param  {string}		request.campaign						-Required. campaign id.
* @param  {boolean}		request.interactionPermissions			-Optional. Users with interaction permission.
* @param  {Function}	callback(messages)						-Required. Callback function.
* @return {array}		users									-Users list.
* @return {string}		users[i]								-User id.
*/
inConcertAgentApi.prototype.GetCampaignUsers = function(request, callback) {
	this.__callOutgoingMethod("GetCampaignUsers", request, function(result) {
		callback(result.users || []);
	});
};

/**
* Get interaction events
*
* @param  {string}		interactionId				-Required. Interaction id, global interactionId if empty.
* @param  {Function}	callback(events)			-Required. Callback function.
* @return {array}		events						-Interaction events array.
*/
inConcertAgentApi.prototype.GetInteractionEvents = function(interactionId, callback) {
	this.__callOutgoingMethod("GetInteractionEvents", { id : interactionId || this.interactionId }, function(result) {
		callback(result.events || []);
	});
};

/**
* Get interaction unread events
*
* @param  {string}		interactionId				-Required. Interaction id, global interactionId if empty.
* @param  {Function}	callback(events)			-Required. Callback function.
* @return {array}		events						-Interaction events array.
*/
inConcertAgentApi.prototype.GetInteractionUnreadEvents = function(interactionId, callback) {
	this.__callOutgoingMethod("GetInteractionUnreadEvents", { id : interactionId || this.interactionId }, function(result) {
		callback(result.events || []);
	});
};

/************************ Contact methods ************************/

/**
* Get contact by system id
*
* @param  {object}			request						-Required. Request filters.
* @param  {string}			request.id					-Required. Contact system id.
* @param  {Function}		callback(contact)			-Required. Callback function.
* @return {object}			contact						-Contact object.
*/
inConcertAgentApi.prototype.GetContact = function(request, callback) {
	this.__callOutgoingMethod("GetContact", request, function(result) {
		callback(result.contact || null);
	});
};

/**
* Get contact by external id
*
* @param  {object}			request						-Required. Request filters.
* @param  {string}			request.id					-Required. Contact external id.
* @param  {Function}		callback(contact)			-Required. Callback function.
* @return {object}			contact						-Contact object.
*/
inConcertAgentApi.prototype.GetContactByExternalId = function(request, callback) {
	this.__callOutgoingMethod("GetContactByExternalId", request, function(result) {
		callback(result.contact || null);
	});
};

/**
* Get contact by address
*
* @param  {object}			request						-Required. Request filters.
* @param  {string}			request.address				-Required. Contact address.
* @param  {string}			request.addressType			-Required. Contact address type (Phone, Mail, Facebook, Twitter).
* @param  {Function}		callback(contact)			-Required. Callback function.
* @return {object}			contact						-Contact object.
*/
inConcertAgentApi.prototype.GetContactByAddress = function(request, callback) {
	this.__callOutgoingMethod("GetContactByAddress", request, function(result) {
		callback(result.contact || null);
	});
};

/**
* Get interaction contact
*
* @param  {object}			request						-Required. Request filters.
* @param  {string}			request.id					-Required. Interaction id.
* @param  {Function}		callback(contact)			-Required. Callback function.
* @return {object}			contact						-Contact object.
*/
inConcertAgentApi.prototype.GetInteractionContact = function(request, callback) {
	this.__callOutgoingMethod("GetInteractionContact", request, function(result) {
		callback(result.contact || null);
	});
};

/**
* Get contact archived interactions list
*
* @param  {object}			request						-Required. Request filters.
* @param  {string}			request.contactId			-Required. Contact id.
* @param  {boolean}			request.isExternal			-Optional. Indicates if is contact external id or system id.
* @param  {boolean}			request.full				-Optional. Indicates if steps and events are loaded.
* @param  {integer}			request.rows				-Optional. Number of rows to return. Default: 20.
* @param  {integer}			request.last				-Optional. Number of last row (to paginate).
* @param  {Function}		callback(result)			-Required. Callback function.
* @return {object}			result						-Action result.
* @return {string}			result.result				-Result code. OK if success.
* @return {string}			result.reason				-Error message.
* @return {Array}			result.interactions			-Interaction jsons array.
* @return {integer}			result.last					-Number of last retrieved interaction.
* @return {integer}			result.total				-Total number of filtered interactions.
* @return {boolean}			result.areMore				-Indicates if are more interactions to get.
*/
inConcertAgentApi.prototype.GetContactInteractionsHistory = function(request, callback) {
	this.__callOutgoingMethod("GetContactInteractionsHistory", request, function(result) {
		callback(result);
	});
};

/**
* Get interaction contact archived interactions list
*
* @param  {object}			request						-Required. Request filters.
* @param  {string}			request.id					-Required. Interaction id, global interactionId if empty.
* @param  {boolean}			request.full				-Optional. Indicates if steps and events are loaded.
* @param  {integer}			request.rows				-Optional. Number of rows to return. Default: 20.
* @param  {integer}			request.last				-Optional. Number of last row (to paginate).
* @param  {Function}		callback(result)			-Required. Callback function.
* @return {object}			result						-Action result.
* @return {string}			result.result				-Result code. OK if success.
* @return {string}			result.reason				-Error message.
* @return {Array}			result.interactions			-Interaction jsons array.
* @return {integer}			result.last					-Number of last retrieved interaction.
* @return {integer}			result.total				-Total number of filtered interactions.
* @return {boolean}			result.areMore				-Indicates if are more interactions to get.
*/
inConcertAgentApi.prototype.GetInteractionContactInteractionsHistory = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("GetInteractionContactInteractionsHistory", request, function(result) {
		callback(result);
	});
};

/************************ Chat methods ************************/

/**
* Get chat interaction messages (only assigned chats)
*
* @param  {string}		interactionId				-Required. Interaction id, global interactionId if empty.
* @param  {Function}	callback(messages)			-Required. Callback function.
* @return {array}		messages					-Interaction messages array.
*/
inConcertAgentApi.prototype.GetChatInteractionMessages = function(interactionId, callback) {
	this.__callOutgoingMethod("GetChatInteractionMessages", { id : interactionId || this.interactionId }, function(result) {
		callback(result.messages || []);
	});
};

/**
* Get chat interaction browsing history
*
* @param  {string}		interactionId				-Required. Interaction id, global interactionId if empty.
* @param  {Function}	callback(history)			-Required. Callback function.
* @return {array}		history						-Interaction browsing history array.
*/
inConcertAgentApi.prototype.GetChatBrowsingHistory = function(interactionId, callback) {
	this.__callOutgoingMethod("GetChatBrowsingHistory", { id : interactionId || this.interactionId }, function(result) {
		callback(result.history || []);
	});
};

/**
* Set interaction finalization mail
*
* @param  {object}		request						-Required.
* @param  {string}		request.id					-Required. Interaction id, global interactionId if empty.
* @param  {boolean}		request.send				-Required. Indicates if mail finalization is enabled.
* @param  {string}		request.address				-Optional. Mail address to send message.
* @param  {Function}	callback(history)			-Required. Callback function.
* @return {array}		history						-Interaction browsing history array.
*/
inConcertAgentApi.prototype.SetInteractionFinalizationMessage = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("SetInteractionFinalizationMessage", request, function(result) {
		callback(result);
	});
};

/************************ Twitter methods ************************/

/**
* Send twitter private message
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to send message, global interactionId if empty.
* @param  {object}		request.message				-Required. Interaction message.
* @param  {boolean}		request.autosend			-Optional. Auto send message.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to reply. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.SendTwitterPrivateMessageToInteraction = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("SendTwitterPrivateMessageToInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Send twitter tweet reply message
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to send message, global interactionId if empty.
* @param  {object}		request.message				-Required. Interaction message.
* @param  {boolean}		request.autosend			-Optional. Auto send message.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to rt. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.SendTwitterTweetReplyMessageToInteraction = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("SendTwitterTweetReplyMessageToInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Retweet twitter message.
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to send message, global interactionId if empty.
* @param  {object}		request.message				-Optional. Interaction message. If empty then is a retweet else is a quote.
* @param  {boolean}		request.autosend			-Optional. Auto send message.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to reply. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.RetweetTwitterMessage = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("RetweetTwitterMessage", request, function(result) {
		callback(result);
	});
};

/**
* Like twitter message.
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to like message, global interactionId if empty.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to like. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.LikeTwitterMessage = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("LikeTwitterMessage", request, function(result) {
		callback(result);
	});
};

/**
* Unlike twitter message.
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to unlike message, global interactionId if empty.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to unlike. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.UnlikeTwitterMessage = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("UnlikeTwitterMessage", request, function(result) {
		callback(result);
	});
};

/************************ Facebook methods ************************/

/**
* Reply facebook post comment (client posts only)
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to send message, global interactionId if empty.
* @param  {object}		request.message				-Required. Interaction message.
* @param  {boolean}		request.autosend			-Optional. Auto send message.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to reply. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.SendFacebookCommentReplyMessageToInteraction = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("SendFacebookCommentReplyMessageToInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Private Reply facebook object (client posts or comments)
* This method is used to private reply posts or comments. To reply private messages conversations use SendMessageToInteraction
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to send message, global interactionId if empty.
* @param  {object}		request.message				-Required. Interaction message.
* @param  {boolean}		request.autosend			-Optional. Auto send message.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to reply. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.SendFacebookPrivateReplyMessageToInteraction = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("SendFacebookPrivateReplyMessageToInteraction", request, function(result) {
		callback(result);
	});
};

/**
* Like facebook message.
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to like message, global interactionId if empty.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to like. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.LikeFacebookMessage = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("LikeFacebookMessage", request, function(result) {
		callback(result);
	});
};

/**
* Unlike facebook message.
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to unlike message, global interactionId if empty.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to unlike. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.UnlikeFacebookMessage = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("UnlikeFacebookMessage", request, function(result) {
		callback(result);
	});
};

/************************ Mail methods ************************/

/**
* Makes a mail message
*
* @param  {object}		request					-Required.
* @param  {string}		request.body			-Required. Message body.
* @param  {array}		request.attachments		-Optional. Message attachments list.
* @param  {object|array}request.to				-Optional. Mail to (default if null, nothing if empty array).
* @param  {object|array}request.cc				-Optional. Mail cc (default if null, nothing if empty array).
* @param  {object|array}request.bcc				-Optional. Mail bcc (default if null, nothing if empty array).
* @return {object}		message					-Created message.
*/
inConcertAgentApi.prototype.MakeMailMessage = function(request) {
	return {
		msgtype : "mail",
		subject : request.subject,
		body : request.body || "",
		attachments : request.attachments || [],
		to : request.to,
		cc : request.cc,
		bcc : request.bcc
	};
};

/**
* Makes a mail destination
*
* @param  {object}		request					-Required.
* @param  {string}		request.address			-Required. Email address.
* @param  {array}		request.name			-Optional. Email name.
* @return {object}		message					-Created message.
*/
inConcertAgentApi.prototype.MakeMailDestination = function(request) {
	return {
		address : request.address,
		name : request.name
	};
};

/**
* Reply an interaction mail.
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to reply mail, global interactionId if empty.
* @param  {object}		request.message				-Required. Interaction message.
* @param  {boolean}		request.autosend			-Optional. Auto send message.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to print. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.ReplyInteractionMail = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("ReplyInteractionMail", request, function(result) {
		callback(result);
	});
};

/**
* Reply all an interaction mail.
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to reply mail, global interactionId if empty.
* @param  {object}		request.message				-Required. Interaction message.
* @param  {boolean}		request.autosend			-Optional. Auto send message.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to print. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.ReplyAllInteractionMail = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("ReplyAllInteractionMail", request, function(result) {
		callback(result);
	});
};

/**
* Forward an interaction mail.
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to reply mail, global interactionId if empty.
* @param  {object}		request.message				-Required. Interaction message.
* @param  {boolean}		request.autosend			-Optional. Auto send message.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to print. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.ForwardInteractionMail = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("ForwardInteractionMail", request, function(result) {
		callback(result);
	});
};

/**
* Prints an interaction mail.
*
* @param  {object}		request						-Required. Request.
* @param  {string}		request.id					-Required. Id of interaction to like message, global interactionId if empty.
* @param  {boolean}		request.reopen				-Optional. Reopen interaction if is closed.
* @param  {integer}		request.event				-Optional. Event to print. If not then last event is used.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @return {string}		result.reason				-Error message.
*/
inConcertAgentApi.prototype.PrintInteractionMail = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("PrintInteractionMail", request, function(result) {
		callback(result);
	});
};

/************************ Phone methods ************************/

/**
* Get phone state
*
* @param  {Function}	callback(state)		-Required. Callback function.
* @return {string}		state				-Phone state: disconnected, idle, connecting, connected, outbound, inbound, active, wrapup, transferring, transferring_connected, conference_consultation_trying, conference_consultation_connected
*/
inConcertAgentApi.prototype.GetPhoneState = function(callback) {
	this.__callOutgoingMethod("GetPhoneState", {}, function(result) {
		callback(result.state);
	});
};

/**
* Answer Call
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.AnswerCall = function(request, callback) {
	this.__callOutgoingMethod("AnswerCall", request || {}, function(result) {
		callback(result);
	});
};

/**
* Hold Call
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.HoldCall = function(request, callback) {
	this.__callOutgoingMethod("HoldCall", request || {}, function(result) {
		callback(result);
	});
};

/**
* Unhold Call
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.UnholdCall = function(request, callback) {
	this.__callOutgoingMethod("UnholdCall", request || {}, function(result) {
		callback(result);
	});
};

/**
* Mute Call
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.MuteCall = function(request, callback) {
	this.__callOutgoingMethod("MuteCall", request || {}, function(result) {
		callback(result);
	});
};

/**
* Unmute Call
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.UnmuteCall = function(request, callback) {
	this.__callOutgoingMethod("UnmuteCall", request || {}, function(result) {
		callback(result);
	});
};


/**
* Switch Call
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.SwitchCall = function(request, callback) {
	this.__callOutgoingMethod("SwitchCall", request || {}, function(result) {
		callback(result);
	});
};

/**
* UnSwitch Call
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.UnswitchCall = function(request, callback) {
	this.__callOutgoingMethod("UnswitchCall", request || {}, function(result) {
		callback(result);
	});
};


/**
* Start Call Record
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.StartCallRecord = function(request, callback) {
	this.__callOutgoingMethod("StartCallRecord", request || {}, function(result) {
		callback(result);
	});
};

/**
* Stop Call Record
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.StopCallRecord = function(request, callback) {
	this.__callOutgoingMethod("StopCallRecord", request || {}, function(result) {
		callback(result);
	});
};

/**
* Get GetInteractionRecords json
*
* @param  {string}		interactionId				-Required. Interaction id, global interactionId if empty.
* @param  {Function}	callback(interaction)		-Required. Callback function.
* @return {object}		records						-records json array.
*/
inConcertAgentApi.prototype.GetInteractionRecords = function(interactionId, callback) {
	this.__callOutgoingMethod("GetInteractionRecords", { id : interactionId || this.interactionId }, function(result) {
		callback(result.records || []);
	});
};	

/**
* Accept Call Preview
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.AcceptCallPreview = function(request, callback) {
	this.__callOutgoingMethod("AcceptCallPreview", request || {}, function(result) {
		callback(result);
	});
};

/**
* Cancel Call Preview
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.CancelCallPreview = function(request, callback) {
	this.__callOutgoingMethod("CancelCallPreview", request || {}, function(result) {
		callback(result);
	});
};

/**
* Confirm Call Transfer
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.ConfirmCallTransfer = function(request, callback) {
	this.__callOutgoingMethod("ConfirmCallTransfer", request || {}, function(result) {
		callback(result);
	});
};

/**
* Cancel Call Transfer
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.CancelCallTransfer = function(request, callback) {
	this.__callOutgoingMethod("CancelCallTransfer", request || {}, function(result) {
		callback(result);
	});
};

/**
* Confirm Call Conference
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.ConfirmCallConference = function(request, callback) {
	this.__callOutgoingMethod("ConfirmCallConference", request || {}, function(result) {
		callback(result);
	});
};

/**
* Cancel Call Conference
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.CancelCallConference = function(request, callback) {
	this.__callOutgoingMethod("CancelCallConference", request || {}, function(result) {
		callback(result);
	});
};

/**
* Redial Call
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {string}		request.altPhone	-Optional. Alternative phone including plus and country code. If empty apply to current phone on current interaction.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.RedialCall = function(request, callback) {
	this.__callOutgoingMethod("RedialCall", request || {}, function(result) {
		callback(result);
	});
};

/**
* Send Call Digit
*
* @param  {object}		request				-Optional.
* @param  {string}		request.id			-Optional. Id of interaction. If empty apply to current phone interaction.
* @param  {string}		request.digit		-Required. Digits to send.
* @param  {Function}	callback(result)	-Required. Callback function.
* @return {object}		result				-Action result.
* @return {string}		result.result		-Result code. OK if success.
* @return {string}		result.reason		-Error message.
*/
inConcertAgentApi.prototype.SendCallDigit = function(request, callback) {
	this.__callOutgoingMethod("SendCallDigit", request, function(result) {
		callback(result);
	});
};

/************************ Outbound Engine methods ************************/

/**
* Get Campaigns
*
* @param  {Function}	callback(campaigns)			-Required. Callback function.
* @return {object}		campaigns					-Campaign:ProcessId
*/
inConcertAgentApi.prototype.GetOutboundEngineCampaigns = function(callback) {
	this.__callOutgoingMethod("GetOutboundEngineCampaigns", {}, function(result) {
		callback(result.campaigns || {});
	});
};

/**
* Get Campaign Batches
*
* @param  {string}		request.campaignId			-Required. Campaign id.
* @param  {Function}	callback(campaigns)			-Required. Callback function.
* @return {array}		batches						-Batches list
*/
inConcertAgentApi.prototype.GetOutboundEngineCampaignBatches = function(request, callback) {
	this.__callOutgoingMethod("GetOutboundEngineCampaignBatches", request, function(result) {
		callback(result.batches || []);
	});
};

/**
* Get Campaign Batch
*
* @param  {string}		request.campaignId			-Required. Campaign id.
* @param  {string}		request.batchId				-Required. Batch id.
* @param  {Function}	callback(campaigns)			-Required. Callback function.
* @return {object}		batch						-Batch object.
*/
inConcertAgentApi.prototype.GetOutboundEngineCampaignBatch = function(request, callback) {
	this.__callOutgoingMethod("GetOutboundEngineCampaignBatch", request, function(result) {
		callback(result.batch);
	});
};

/**
* Get Contact
*
* @param  {string}		request.id					-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.contactId			-Optional. Overrides interaction (required if not).
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @returns {object}		result.contact
* @return {string}		result.reason				-Error message.
* @returns {object}		result.contact
*/
inConcertAgentApi.prototype.GetOutboundContact = function(request, callback) {
	request = request || {};
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("GetOutboundContact", request, function(result) {
		callback(result);
	});
};

/**
* Get Contact by Name
*
* @param  {string}		name						-Required.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @returns {object}		result.contact
* @return {string}		result.reason				-Error message.
* @returns {object}		result.contact
*/
inConcertAgentApi.prototype.GetOutboundContactByName = function(name, callback) {
	this.__callOutgoingMethod("GetOutboundContactByName", { name }, function(result) {
		callback(result);
	});
};

/**
* Get Contact by Address
*
* @param  {string}		addressType					-Required. Example: Phone
* @param  {string}		address						-Required.
* @param  {Function}	callback(result)			-Required. Callback function.
* @return {object}		result						-Action result.
* @return {string}		result.result				-Result code. OK if success.
* @returns {object}		result.contact
* @return {string}		result.reason				-Error message.
* @returns {object}		result.contact
*/
inConcertAgentApi.prototype.GetOutboundContactByAddress = function(addressType, address, callback) {
	this.__callOutgoingMethod("GetOutboundContactByAddress", { addressType, address }, function(result) {
		callback(result);
	});
};

/**
* Search Contacts
*
* @param  {string}		request.processId						-Optional. 
* @param  {string}		request.campaignId						-Optional.
* @param  {string}		request.batchId							-Optional.
* @param  {string}		request.skillId							-Optional.
* @param  {number}		request.size							-Optional.
* @param  {object}		request.conditions						-Optional.
* @param  {string}		request.pit								-Optional. Pagination
* @param  {string}		request.searchAfter						-Optional. Pagination
* @param  {boolean}		request.keepOpen						-Optional. Pagination
* @param  {object}		request.sortTerms						-Optional.
* @param  {string}		request.sortTerms[].name				-Required.
* @param  {string}		request.sortTerms[].order				-Optional. asc|desc
* @param  {array<string>} request.fields						-Optional. Retrieve specific fields
* @param  {boolean}		request.fullData						-Optional.
* @param  {Function}	callback(result)						-Required. Callback function.
* @return {object}		result									-Action result.
* @return {string}		result.result							-Result code. OK if success.
* @returns {array}		result.contacts
* @return {string}		result.reason							-Error message.
* @returns {object}		result.contact
*/
inConcertAgentApi.prototype.SearchOutboundContacts = function(request, callback) {
	this.__callOutgoingMethod("SearchOutboundContacts", request, function(result) {
		callback(result);
	});
};

/**
* Get Contact Results
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or processId.
* @param  {string}		request.batchId							-Optional.
* @param  {string}		request.contactId						-Optional.
* @param  {object}		request.conditions						-Optional.
* @param  {object}		request.sortTerms						-Optional.
* @param  {string}		request.sortTerms[].name				-Required.
* @param  {string}		request.sortTerms[].order				-Optional. asc|desc
* @param  {number}		request.size							-Optional.
* @param  {number}		request.offset							-Optional.
* @param  {Function}	callback(result)						-Required. Callback function.
* @return {object}		result									-Action result.
* @return {string}		result.result							-Result code. OK if success.
* @returns {array}		result.contactResults
* @return {string}		result.reason							-Error message.
* @returns {object}		result.contact
*/
inConcertAgentApi.prototype.GetOutboundContactResults = function(request, callback) {
	this.__callOutgoingMethod("GetOutboundContactResults", request, function(result) {
		callback(result);
	});
};

/**
* Store Contact
*
* @param  {string}		request.id										-Optional. Interaction id, global interactionId if empty.
* @param  {array}		request.mix										-Optional. Mix or replace arrays (skills, addresses...)
* @param  {string}		request.contactId								-Optional. Overrides interaction (required if not).
* @param  {object}		request.contact									-Required. 
* @param  {string}		request.contact.Name							-Optional.
* @param  {string}		request.contact.Campaign						-Optional.
* @param  {string}		request.contact.Category						-Optional.
* @param  {string}		request.contact.AccountOfficer					-Optional.
* @param  {string}		request.contact.ExternalId						-Optional.
* @param  {string}		request.contact.ImportId						-Optional.
* @param  {string}		request.contact.AccountGroup					-Optional.
* @param  {bollean}		request.contact.IsClient						-Optional.
* @param  {string}		request.contact.ManualScheduleDate				-Optional.
* @param  {string}		request.contact.Agent							-Optional.
* @param  {string}		request.contact.Addresses						-Optional.
* @param  {string}		request.contact.Addresses[].Type				-Required. Example: "Phone"
* @param  {string}		request.contact.Addresses[].Kind				-Optional. Default: "HOME"
* @param  {array}		request.contact.Addresses[].Channels			-Optional. Default: ["CALL"]
* @param  {string}		request.contact.Addresses[].Status				-Optional. Enabled|Disabled
* @param  {string}		request.contact.Addresses[].Number				-Required.
* @param  {string}		request.contact.Skills							-Optional.
* @param  {string}		request.contact.Skills[].SkillId				-Required.
* @param  {string}		request.contact.Skills[].Mode					-Optional. SORT|REQUIRED|PREFERRED
* @param  {number}		request.contact.Skills[].Value					-Required.
* @param  {string}		request.contact.NameValuesSimple				-Optional.
* @param  {string}		request.contact.NameValuesSimple[].Name			-Required.
* @param  {string}		request.contact.NameValuesSimple[].Value		-Required.
* @param  {string}		request.contact.NameValuesSearchDate			-Optional.
* @param  {string}		request.contact.NameValuesSearchDate[].Name		-Required.
* @param  {string}		request.contact.NameValuesSearchDate[].Value	-Required.
* @param  {string}		request.contact.NameValuesSearchNumeric			-Optional.
* @param  {string}		request.contact.NameValuesSearchNumeric[].Name	-Required.
* @param  {number}		request.contact.NameValuesSearchNumeric[].Value	-Required.
* @param  {string}		request.contact.NameValuesSearchText			-Optional.
* @param  {string}		request.contact.NameValuesSearchText[].Name		-Required.
* @param  {string}		request.contact.NameValuesSearchText[].Value	-Required.
* @param  {Function}	callback(result)								-Required. Callback function.
* @return {object}		result											-Action result.
* @return {string}		result.result									-Result code. OK if success.
* @return {string}		result.reason									-Error message.
*/
inConcertAgentApi.prototype.StoreOutboundContact = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("StoreOutboundContact", request, function(result) {
		callback(result);
	});
};


/**
* Store Contact addresses
*
* @param  {string}		request.id										-Optional. Interaction id, global interactionId if empty.
* @param  {array}		request.mix										-Optional. Mix or replace arrays (skills, addresses...)
* @param  {string}		request.contactId								-Optional. Overrides interaction (required if not).
* @param  {string}		request.addresses								-Required.
* @param  {string}		request.addresses[].Type						-Required. Example: "Phone"
* @param  {string}		request.addresses[].Kind						-Optional. Default: "HOME"
* @param  {array}		request.addresses[].Channels					-Optional. Default: ["CALL"]
* @param  {string}		request.addresses[].Status						-Optional. Enabled|Disabled
* @param  {string}		request.addresses[].Number						-Required.
* @param  {Function}	callback(result)								-Required. Callback function.
* @return {object}		result											-Action result.
* @return {string}		result.result									-Result code. OK if success.
* @return {string}		result.reason									-Error message.
*/
inConcertAgentApi.prototype.SetOutboundContactAddresses = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("SetOutboundContactAddresses", request, function(result) {
		callback(result);
	});
};

/**
* Store Contact Values
*
* @param  {string}		request.id										-Optional. Interaction id, global interactionId if empty.
* @param  {array}		request.mix										-Optional. Mix or replace arrays (skills, addresses...)
* @param  {array}		request.contactId								-Required. 
* @param  {string}		request.simple									-Optional.
* @param  {string}		request.simple[].Name							-Required.
* @param  {string}		request.simple[].Value							-Required.
* @param  {string}		request.date									-Optional.
* @param  {string}		request.date[].Name								-Required.
* @param  {string}		request.date[].Value							-Required.
* @param  {string}		request.numeric									-Optional.
* @param  {string}		request.numeric[].Name							-Required.
* @param  {number}		request.numeric[].Value							-Required.
* @param  {string}		request.text									-Optional.
* @param  {string}		request.text[].Name								-Required.
* @param  {string}		request.text[].Value							-Required.
* @param  {Function}	callback(result)								-Required. Callback function.
* @return {object}		result											-Action result.
* @return {string}		result.result									-Result code. OK if success.
* @return {string}		result.reason									-Error message.
*/
inConcertAgentApi.prototype.SetOutboundContactValues = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("SetOutboundContactValues", request, function(result) {
		callback(result);
	});
};

/**
* Store Contact Skills
*
* @param  {string}		request.id										-Optional. Interaction id, global interactionId if empty.
* @param  {array}		request.mix										-Optional. Mix or replace arrays (skills, addresses...)
* @param  {array}		request.contactId								-Required. 
* @param  {string}		request.skills									-Required.
* @param  {string}		request.skills[].SkillId						-Required.
* @param  {string}		request.skills[].Mode							-Optional. SORT|REQUIRED|PREFERRED
* @param  {number}		request.skills[].Value							-Required.
* @param  {Function}	callback(result)								-Required. Callback function.
* @return {object}		result											-Action result.
* @return {string}		result.result									-Result code. OK if success.
* @return {string}		result.reason									-Error message.
*/
inConcertAgentApi.prototype.SetOutboundContactSkills = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("SetOutboundContactSkills", request, function(result) {
		callback(result);
	});
};

/**
* Remove Contact Address
*
* @param  {string}		request.id										-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.contactId								-Optional. Overrides interaction (required if not).
* @param  {string}		request.address									-Required.
* @param  {string}		request.addressType								-Required. Example: "Phone"
* @param  {string}		request.address									-Required.
* @param  {Function}	callback(result)								-Required. Callback function.
* @return {object}		result											-Action result.
* @return {string}		result.result									-Result code. OK if success.
* @return {string}		result.reason									-Error message.
*/
inConcertAgentApi.prototype.RemoveOutboundContactAddress = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("RemoveOutboundContactAddress", request, function(result) {
		callback(result);
	});
};

/**
* Enable Contact Address
*
* @param  {string}		request.id										-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.contactId								-Optional. Overrides interaction (required if not).
* @param  {string}		request.address									-Required.
* @param  {string}		request.addressType								-Required. Example: "Phone"
* @param  {string}		request.address									-Required.
* @param  {Function}	callback(result)								-Required. Callback function.
* @return {object}		result											-Action result.
* @return {string}		result.result									-Result code. OK if success.
* @return {string}		result.reason									-Error message.
*/
inConcertAgentApi.prototype.EnableOutboundContactAddress = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("EnableOutboundContactAddress", request, function(result) {
		callback(result);
	});
};

/**
* Disable Contact Address
*
* @param  {string}		request.id										-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.contactId								-Optional. Overrides interaction (required if not).
* @param  {string}		request.address									-Required.
* @param  {string}		request.addressType								-Required. Example: "Phone"
* @param  {string}		request.address									-Required.
* @param  {Function}	callback(result)								-Required. Callback function.
* @return {object}		result											-Action result.
* @return {string}		result.result									-Result code. OK if success.
* @return {string}		result.reason									-Error message.
*/
inConcertAgentApi.prototype.DisableOutboundContactAddress = function(request, callback) {
	request.id = request.id || this.interactionId;
	this.__callOutgoingMethod("DisableOutboundContactAddress", request, function(result) {
		callback(result);
	});
};

/**
* Reschedule Contact
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {string}		request.batchId							-Optional. Overrides interaction (required if not).
* @param  {string}		request.contactId						-Optional. Overrides interaction (required if not).
* @param  {object}		request.configuration					-Required.
* @param  {boolean}		request.configuration.restartRetries	-Optional.
* @param  {string}		request.configuration.scheduleDate		-Optional.
* @param  {string}		request.configuration.agent				-Optional.
* @param  {string}		request.configuration.channel			-Optional.
* @param  {string}		request.configuration.kind				-Optional.
* @param  {object}		request.configuration.address			-Optional.
* @param  {string}		request.configuration.address.Type		-Required. Example: "Phone"
* @param  {string}		request.configuration.address.Kind		-Optional. Default: "HOME"
* @param  {array}		request.configuration.address.Channels	-Optional. Default: ["CALL"]
* @param  {string}		request.configuration.address.Status	-Optional. Enabled|Disabled
* @param  {string}		request.configuration.address.Number	-Required.
* @param  {Function}	callback(result)						-Required. Callback function.
* @return {object}		result									-Action result.
* @return {string}		result.result							-Result code. OK if success.
* @return {string}		result.reason							-Error message.
*/
inConcertAgentApi.prototype.RescheduleOutboundContact = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("RescheduleOutboundContact", request, function(result) {
		callback(result);
	});
};

/**
* Add Contact to Batch
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {string}		request.batchId							-Optional. Overrides interaction (required if not).
* @param  {string}		request.contactId						-Optional. Overrides interaction (required if not).
* @param  {object}		request.configuration					-Required.
* @param  {string}		request.configuration.scheduleDate		-Optional.
* @param  {string}		request.configuration.agent				-Optional.
* @param  {string}		request.configuration.engineType		-Optional.
* @param  {string}		request.configuration.channel			-Optional.
* @param  {string}		request.configuration.kind				-Optional.
* @param  {object}		request.configuration.address			-Optional.
* @param  {string}		request.configuration.address.Type		-Required. Example: "Phone"
* @param  {string}		request.configuration.address.Kind		-Optional. Default: "HOME"
* @param  {array}		request.configuration.address.Channels	-Optional. Default: ["CALL"]
* @param  {string}		request.configuration.address.Status	-Optional. Enabled|Disabled
* @param  {string}		request.configuration.address.Number	-Required.
* @param  {string}		request.configuration.contactData		-Optional. If present contact is stored as part of the operation. See StoreContact for details.
* @param  {Function}	callback(status, data)					-Required. Callback function.
* @returns {boolean}	status
*/
inConcertAgentApi.prototype.AddContactToOutboundBatch = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("AddContactToOutboundBatch", request, function(result) {
		callback(result);
	});
};

/**
* Pause Contact
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {string}		request.contactId						-Optional. Overrides interaction (required if not).
* @param  {Function}	callback(status, data)					-Required. Callback function.
* @returns {boolean}	status
*/
inConcertAgentApi.prototype.PauseOutboundContact = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("PauseOutboundContact", request, function(result) {
		callback(result);
	});
};

/**
* Resume Contact
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {string}		request.contactId						-Optional. Overrides interaction (required if not).
* @param  {Function}	callback(status, data)					-Required. Callback function.
* @returns {boolean}	status
*/
inConcertAgentApi.prototype.ResumeOutboundContact = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("ResumeOutboundContact", request, function(result) {
		callback(result);
	});
};

/**
* Cancel Contact
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {string}		request.contactId						-Optional. Overrides interaction (required if not).
* @param  {Function}	callback(status, data)					-Required. Callback function.
* @returns {boolean}	status
*/
inConcertAgentApi.prototype.CancelOutboundContact = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("CancelOutboundContact", request, function(result) {
		callback(result);
	});
};

/**
* Finish Contact
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {string}		request.contactId						-Optional. Overrides interaction (required if not).
* @param  {Function}	callback(status, data)					-Required. Callback function.
* @returns {boolean}	status
*/
inConcertAgentApi.prototype.FinishOutboundContact = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("FinishOutboundContact", request, function(result) {
		callback(result);
	});
};

/**
* Remove Contact
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {string}		request.contactId						-Optional. Overrides interaction (required if not).
* @param  {Function}	callback(status, data)					-Required. Callback function.
* @returns {boolean}	status
*/
inConcertAgentApi.prototype.RemoveOutboundContact = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("RemoveOutboundContact", request, function(result) {
		callback(result);
	});
};

/**
* Recycle Contact
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {string}		request.contactId						-Optional. Overrides interaction (required if not).
* @param  {object}		request.configuration					-Required.
* @param  {boolean}		request.configuration.restartRetries	-Optional.
* @param  {string}		request.configuration.scheduleDate		-Optional.
* @param  {string}		request.configuration.agent				-Optional.
* @param  {Function}	callback(status, data)					-Required. Callback function.
* @returns {boolean}	status
*/
inConcertAgentApi.prototype.RecycleOutboundContact = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("RecycleOutboundContact", request, function(result) {
		callback(result);
	});
};

/**
* Change Contact Priority
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {string}		request.contactId						-Optional. Overrides interaction (required if not).
* @param  {number}		request.priority						-Required.
* @param  {Function}	callback(status, data)					-Required. Callback function.
* @returns {boolean}	status
*/
inConcertAgentApi.prototype.ChangePriorityOutboundContact = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("ChangePriorityOutboundContact", request, function(result) {
		callback(result);
	});
};

/**
* Set Contact Engine Type
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {string}		request.contactId						-Optional. Overrides interaction (required if not).
* @param  {string}		request.engineType						-Optional.
* @param  {Function}	callback(status, data)					-Required. Callback function.
* @returns {boolean}	status
*/
inConcertAgentApi.prototype.SetEngineTypeOutboundContact = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("SetEngineTypeOutboundContact", request, function(result) {
		callback(result);
	});
};

/**
* Set Contact Agent
*
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {string}		request.contactId						-Optional. Overrides interaction (required if not).
* @param  {string}		request.agent							-Optional. Set empty if not.
* @param  {Function}	callback(status, data)					-Required. Callback function.
* @returns {boolean}	status
*/
inConcertAgentApi.prototype.SetAgentOutboundContact = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("SetAgentOutboundContact", request, function(result) {
		callback(result);
	});
};

/**
* Set Contact Engine Type
*
* @param  {string}		request.actionId						-Required.
* @param  {string}		request.id								-Optional. Interaction id, global interactionId if empty.
* @param  {string}		request.processId						-Optional. This or campaign id. Overrides interaction (required if not).
* @param  {string}		request.campaignId						-Optional. This or process id. Overrides interaction (required if not).
* @param  {Function}	callback(status, data)					-Required. Callback function.
* @returns {boolean}	status
*/
inConcertAgentApi.prototype.GetOutboundEngineActionStatus = function(request, callback) {
	request.id = request.id || this.interactionId;
	request.oeRequired = true;
	this.__callOutgoingMethod("GetOutboundEngineActionStatus", request, function(result) {
		callback(result);
	});
};

/**
* Validate Address
*
* @param  {string}		request.type						-Required. Example: "Phone"
* @param  {string}		request.number						-Required.
* @param  {string}		request.country						-Optional.
* @param  {string}		request.area						-Optional.
* @param  {Function}	callback(result)					-Required. Callback function.
* @return {object}		result								-Action result.
* @return {string}		result.result						-Result code. OK if success.
* @return {string}		result.reason						-Error message.
*/
inConcertAgentApi.prototype.ValidateAddress = function(request, callback) {
	this.__callOutgoingMethod("ValidateAddress", request, function(result) {
		callback(result);
	});
};

/**
* AddressBook
*
* @param  {Function}	callback(result)					-Required. Callback function.
* @return {object}		result								-Action result.
* @return {string}		result.result						-Result code. OK if success.
* @return {string}		result.reason						-Error message.
*/
inConcertAgentApi.prototype.GetAddressesBook = function(callback) {
	this.__callOutgoingMethod("GetAddressesBook", {}, function(result) {
		callback(result);
	});
};


/**
* APP - HELPDESK
*
* @param  {Function}		callback(result)					-Required. Callback function.
* @return {object}			result								-Action result.
* @return {string}			result.result						-Result code. OK if success.
* @return {array objects}	result.results						-Array of objects with the result of the reload of each iframe.
	* @return {boolean}			result.success						-true/false.
	* @return {string}			result.reason						-Error message.
*/
inConcertAgentApi.prototype.HelpDeskReloadApps = function(request, callback = $.noop) {
	request = request || {};
	this.__callOutgoingMethod(
			"HelpDeskReloadApps",
			request, function(result) {
			callback(result);
		},
		60 // timeout seconds
	);
};


/**
* Set Contact Interaction
*
* @param  {string}		request.interactionId				-Required. 
* @param  {string}		request.contactId					-Required.
* @param  {string}		request.contactName					-Optional.
* @return {string}		result.result						-Result code. OK if success.
* @return {string}		result.reason						-Error message.
*/
inConcertAgentApi.prototype.SetInteractionContact = function(request, callback = $.noop) {
	this.__callOutgoingMethod(
		"SetInteractionContact", 
		request, function(result) {
			callback(result);
		}
	);
};