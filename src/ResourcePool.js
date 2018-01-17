
const resources = {};

const ResourcePool = {
	register (src, callback) {
		// 去重
		if (!resources[src]) {
			const resource = {
				done: false,
				eventList: [callback],
				image: new Image()
			};
			resource.image.onload = () => {
				resource.done = true;
				const callbackList = resource.eventList;
				resource.eventList = [];
				callbackList.forEach((func) => { func(); });
			};
			resource.image.src = src;
			resources[src] = resource;
		} else if (!resources[src].done) {
			resources[src].eventList.push(callback);
		} else {
			callback();
		}
	}
};

module.exports = ResourcePool;
