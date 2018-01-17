# be-image-preloader

图片资源加载器插件
@author JadePo (nickname: bullseye)

当前项目的需要，写了这么一个小插件；
该插件可以负担需要大量图片资源加载的情况，支持按照优先级、按照场景加载，基于Promise异步完成；

## 插件引入

```
npm install be-image-preloader --save
```
在代码中引入：

``` javascript
import Preloader from 'be-image-preloader';
```

## 准备资源

你可以在初始化时指定需要加载的资源列表，也可以调用add()方法新加：

``` javascript
const preloader = new Preloader(resourceList);
preloader.add(resourceList2);
```

也可以链式调用：

``` javascript
const preloader = new Preloader(list1).add(list2).add(list3);
```

其中资源列表中的每一项可以是图片的src，也可以是包含了该图片加载优先级、场景信息的对象：

``` javascript
const resourceList = [
	// 资源src
	'http://p4.qhimg.com/t014815f3ca3bebf2be.jpg',
	// 包括优先级weight、场景scene的对象
	{
		src: 'http://p4.qhimg.com/t014815f3ca3bebf2be.jpg',
		weight: 50,
		scene: 'scene1'
	}
];
```

当然，你可以给整个资源列表指定同一个优先级，或同一个场景：

``` javascript
// 优先级
// 场景名
preloader.add(resourceList1, 50).add(resourceList2, 'scene1');
```

当你在既add方法里设置了优先级（或场景名），又在该资源对象中设置了自己的优先级（或场景名），那么会以对象自身的设定为准：

``` javascript
preloader.add([
	{src: 'http://p4.qhimg.com/t014815f3ca3bebf2be.jpg', weight: 100}
], 50);
// 最终该对象的优先级为100
```

## 资源加载

上面设定的资源通过load()方法加载；

``` javascript
preloader.load();
```

加载时，你可以根据需要，指定优先级或场景名加载；

``` javascript
// 指定优先级加载
preloader.load(100);
```

指定优先级时，加载器会筛选加载所有优先级高的，以及没有指定优先级的资源；
指定场景时，加载器会加载所有与指定场景相符的，以及没有指定场景的资源：

``` javascript
preloader.add([
	{src: 'src1', weight: 100},
	{src: 'src2', weight: 50},
	{src: 'src3'}
]);
preloader.load(80);
// 本次会加载src1和src3，不会加载src2
```

重复加载：加载器会缓存所有已经下载的资源，当两次load中包含同一个图片时，不会重复下载，以便节约带宽资源；

## 监听进度

你可以在load()方法中传入一个监听函数，来处理加载过程事件；该函数可以接受两个参数，分别表示当前已加载的资源数和本次加载的总资源数：

``` javascript
preloader.load(100, (loadedNum, allNum) => {
	console.log(`加载进度：${~~(loadedNum / allNum * 100)}%`);
});
```

## 异步完成

load()方法会返回一个Promise，你可以在then()中指定后续的步骤：

``` javascript
preloader.load().then((allNum) => {
	// 其中会传入一个参数表示本次加载的资源数
	console.log(allNum + '张图片加载完成');
	// 后续操作
});
```

也可以使用async await的写法：

``` javascript
const allNum = await preloader.load();
console.log(allNum + '张图片加载完成');
// 后续操作
```

也可以多次load行为同步/异步灵活组合：

``` javascript
// 同步分别执行
preloader.load('scene1').then(() => console.log('场景1加载完成'));
preloader.load('scene2').then(() => console.log('场景2加载完成'));

// 或者异步
const [list1Num, list2Num] = await Promise.all([
	preloader.load('scene1'),
	preloader.load('scene2')
]);
console.log(`共${list1Num + list1Num}个资源加载完成`);
// 后续操作
```

# 后续计划

接下来会引入timeout机制，限定资源加载的超时时间，以便在出现死链时也能继续后面的操作；
