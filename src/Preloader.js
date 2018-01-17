/**
 * 图片资源加载器
 * 基于Promise实现
 * @author bullseye
 */
const ResourcePool = require('./ResourcePool.js');

class Preloader {
	/**
	 * 构造方法
	 * @param {array} items 可选，资源列表
	 * @param {string|number|object} sceneOrWeight 可选，以上资源的优先级或所属场景
	 */
	constructor (items, sceneOrWeight) {
		this.__resourceList = [];
		this.__loadToResource = {};
		this.__loadProgress = {};
		this.__loadEndPromise = {};
		this.__loadId = 0;
		this.add(items, sceneOrWeight);
	}

	/**
	 * 添加资源的方法
	 * @param {array} items 可选，资源列表
	 * @param {string|number|object} sceneOrWeight 可选，以上资源的优先级或所属场景
	 */
	add (items, sceneOrWeight) {
		if (items) {
			const newResources = items.map((item) => this.__formatResource(item, sceneOrWeight)).filter((item) => item);
			this.__resourceList = this.__resourceList.concat(newResources);
		}
		return this;
	}

	/**
	 * 开始加载资源
	 * 返回一个Promise，在所有资源都加载完毕后触发resolve()
	 * @param {string|number} weightOrScene 优先级值或者场景名
	 * @param {function} onProgress 加载中事件，传入两个参数：currentNum和totalNum
	 */
	load (weightOrScene) {
		let filteredResources;
		if (typeof weightOrScene === 'number') {
			filteredResources = this.__filterByWeight(weightOrScene);
		} else if (typeof weightOrScene === 'string') {
			filteredResources = this.__filterByScene(weightOrScene);
		} else {
			filteredResources = this.__resourceList;
		}
		const currentLoadId = ++this.__loadId;
		this.__registerLoad(currentLoadId, filteredResources);
		// 如果有progress事件，注册progress
		const progressEvent = arguments[arguments.length - 1];
		if (progressEvent && typeof progressEvent === 'function') {
			this.__registerProgress(currentLoadId, progressEvent);
		}
		// 注册资源的onload事件，并加载资源
		this.__fire(filteredResources);
		// 返回一个Promise
		return new Promise((resolve, reject) => {
			this.__registerEndPromise(currentLoadId, resolve);
		});
	}

	/**
	 * 内部方法，注册资源的onload事件，并开始加载资源
	 * @param {Array} resources 待加载资源列表
	 */
	__fire (resources) {
		resources.forEach((resource) => {
			const onload = () => {
				resource.status = 2;
				// 触发每个load的progress事件
				// 清空list
				const progressEvents = resource.loadEvents;
				resource.loadEvents = [];
				progressEvents.forEach((loadId) => { this.__fileResourceProgress(loadId); });
			};
			if (resource.status === 0) {
				resource.status = 1;
				ResourcePool.register(resource.src, onload);
			} else if (resource.status === 2) {
				// 直接触发回调
				// 如果本次load的所有资源已经全部加载过，就会出现结束resolve在Promise注册之前就触发
				// 因此需要settimeout保证触发顺序
				window.setTimeout(onload);
			}
		});
	}

	/**
	 * 一个资源加载完成后，通知相应的load行为
	 * @param {Array} loadId load行为列表列表
	 */
	__fileResourceProgress (loadId) {
		const resourceList = this.__loadToResource[loadId];
		const loadedNum = resourceList.filter((resource) => resource.status === 2).length;
		this.__loadProgress[loadId] && (this.__loadProgress[loadId])(loadedNum, resourceList.length);
		// 如果结束了，触发结束事件
		if (loadedNum === resourceList.length) {
			this.__unregisterLoad(loadId);
			this.__loadEndPromise[loadId] && (this.__loadEndPromise[loadId])(loadedNum);
		}
	}

	/**
	 * 内部方法，注册一次load行为和资源的对应关系
	 * @param {number} loadId 区分load行为的id
	 * @param {Array} resourceList 本次load的资源
	 */
	__registerLoad (loadId, resourceList) {
		// 双向绑定
		this.__loadToResource[loadId] = resourceList;
		resourceList.forEach((resource) => {
			resource.loadEvents.push(loadId);
		});
	}

	/**
	 * 内部方法，双向解绑
	 * 在判断一个load行为所有资源状态都为已加载时触发
	 * 如果一个load的所有资源已经加载完，则不需要触发剩下的progress事件了
	 * 因此需要解绑
	 * @param {number} loadId 区分load行为的id
	 */
	__unregisterLoad (loadId) {
		const resourceList = this.__loadToResource[loadId];
		this.__loadToResource[loadId] = [];
		resourceList.forEach((resource) => {
			resource.loadEvents = resource.loadEvents.filter((id) => id !== loadId);
		});
	}

	/**
	 * 内部方法，注册load完毕Promise resolve，该Promise在load方法中返回，resolve在所有资源都加载完毕时触发
	 * @param {number} loadId load行为
	 * @param {function} promiseResolve 该load行为对应的Promise resolve方法的指针
	 */
	__registerEndPromise (loadId, promiseResolve) {
		this.__loadEndPromise[loadId] = promiseResolve;
	}

	/**
	 * 内部方法，注册load onprogress事件，以便在每个资源onload时能够找到相对应的progress触发
	 * @param {number} loadId 区分load行为的id
	 * @param {function} progress 外部注册的事件
	 */
	__registerProgress (loadId, progress) {
		this.__loadProgress[loadId] = progress;
	}

	/**
	 * 内部方法，负责将constructor与add进来的新资源规范格式
	 * @param {object|string} items 资源对象或地址字符串
	 * @param {string|number|object} sceneOrWeight 可选，以上资源的优先级或所属场景，以便于之后按照场景类别或优先级加载
	 */
	__formatResource (item, sceneOrWeight) {
		let scene = false;
		let weight = false;
		if (sceneOrWeight && sceneOrWeight.toString === '[object Object]') {
			[scene, weight] = [sceneOrWeight.scene || false, sceneOrWeight.weight || false];
		} else if (typeof sceneOrWeight === 'string') {
			scene = sceneOrWeight;
		} else if (typeof sceneOrWeight === 'number') {
			weight = sceneOrWeight;
		}
		// 将string转成对象
		let formattedItem = {};
		if (typeof item === 'string') {
			formattedItem = {src: item};
		} else if (item.toString() === '[object Object]' && item.src) {
			formattedItem = item;
		} else {
			return false;
		}
		return Object.assign({}, {
			src: '',
			weight,
			scene,
			status: 0,
			loadEvents: []
		}, formattedItem);
	}

	/**
	 * 根据优先级筛选需要加载的资源
	 * @param {number} weight 优先级值
	 */
	__filterByWeight (weight) {
		return this.__resourceList.filter((item) => item.weight === false || item.weight >= weight);
	}

	/**
	 * 根据场景名筛选需要加载的资源
	 * @param {string} scene 场景名
	 */
	__filterByScene (scene) {
		return this.__resourceList.filter((item) => item.scene === false || item.scene === scene);
	}
}

module.exports = Preloader;
