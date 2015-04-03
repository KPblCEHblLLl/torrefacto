/**
 * Created by d.lubimov on 03.04.2015.
 * @module
 */
/** @class */
function OrderModel() {
	/** @type {string} */
	this.username = "";
	/** @type {OrderItem[]} */
	this.itemsList = [];
	/** @type {CoffeeModel[]} */
	this.coffeeList = [];

	this._eventsTarget = $(this);
}

/** @type {number[]} */
OrderModel.prototype.weightsList = [
	150,
	450
];

OrderModel.prototype.fire = function() {
	return this._eventsTarget.trigger.apply(this._eventsTarget, arguments);
};

OrderModel.prototype.on = function() {
	return this._eventsTarget.on.apply(this._eventsTarget, arguments);
};

/** @param {string} username */
OrderModel.prototype.setUserName = function(username) {
	this.username = username;
	this.saveToStorage();
	this.fire("username-changed", this.username);
};

OrderModel.prototype.applyCoffeeList = function(list) {
	list = $.map(list, function(coffeeData) {
		var coffee = new CoffeeModel();
		coffee.id = coffeeData["id"];
		coffee.name = coffeeData["name"];
		coffee.subName = coffeeData["subName"];
		coffee.price = coffeeData["price"];
		return coffee;
	});

	list.sort(function (/**CoffeeModel*/i1, /**CoffeeModel*/i2) {
		if (i1.name == i2.name) {
			return i1.subName > i2.subName ? 1 : -1;
		}
		return i1.name > i2.name ? 1 : -1;
	});

	this.coffeeList = list;

	// появились настоящие объекты кофе, пора прикрутить на них ссылки
	for (var i = 0; i < this.itemsList.length; ++i) {
		var item = this.itemsList[i];
		item.coffee = this.getCoffee(item.id);
	}

	this.fire("coffee-list-changed", this.coffeeList);
};

OrderModel.prototype.clearItems = function () {
	this.itemsList = [];
	this.saveToStorage();
	this.fire("items-list-changed", this.itemsList);
};

/**
 * @param {CoffeeModel} coffee
 * @param {number} weight
 * @returns {OrderItem}
 */
OrderModel.prototype.getItem = function (coffee, weight) {
	for (var i = 0; i < this.itemsList.length; i++) {
		var orderItem = this.itemsList[i];
		if (orderItem.coffee == coffee) {
			if (orderItem.weight == weight) {
				return orderItem;
			}
		}
	}
	return null;
};

/**
 * @param {CoffeeModel} coffee
 * @param {number} weight
 * @returns {OrderItem}
 */
OrderModel.prototype.addQuantity = function(coffee, weight) {
	var currentItem = this.getItem(coffee, weight);
	if (!currentItem) {
		currentItem = new OrderItem();
		currentItem.coffee = coffee;
		currentItem.id = coffee.id;
		currentItem.weight = weight;
		this.itemsList.push(currentItem);
	}
	currentItem.quantity++;

	this.saveToStorage();
	this.fire("item-changed", currentItem);
	return currentItem;
};

/**
 * @param {CoffeeModel} coffee
 * @param {number} weight
 * @returns {OrderItem}
 */
OrderModel.prototype.substractQuantity = function(coffee, weight) {
	var currentItem = this.getItem(coffee, weight);
	if (!currentItem) {
		return currentItem;
	}
	currentItem.quantity--;

	this.saveToStorage();
	this.fire("item-changed", currentItem);
	return currentItem
};

OrderModel.prototype.loadFromStorage = function() {
	this.username = localStorage.getItem("username");
	var dataStr = localStorage.getItem("order");
	if (!dataStr) {
		return;
	}

	var data = JSON.parse(dataStr);
	this.username = data["username"];
	var list = data["list"];

	for (var i = 0; i < list.length; i++) {
		var itemData = list[i];
		var item = new OrderItem();
		item.id = itemData["id"];
		item.quantity = itemData["quantity"];
		item.weight = itemData["weight"];
		this.itemsList.push(item);
	}
	this.fire("load");
};

OrderModel.prototype.saveToStorage = function() {
	var data = {};
	data["username"] = this.username;
	data["list"] = [];

	for (var i = 0; i < this.itemsList.length; i++) {
		var item = this.itemsList[i];
		data["list"].push({
			"id": item.id,
			"quantity": item.quantity,
			"weight": item.weight,
		});
	}

	localStorage.setItem("order", JSON.stringify(data));
};

/** @returns {number} */
OrderModel.prototype.getTotal = function() {
	var total = 0;

	for (var i = 0; i < this.itemsList.length; i++) {
		var item = this.itemsList[i];
		var coffee = this.getCoffee(item.id);
		if (!coffee) {
			continue;
		}
		var price = coffee.price[item.weight];
		total += price * item.quantity;
	}

	return total;
};

/**
 * @param {string} id
 * @returns {CoffeeModel}
 */
OrderModel.prototype.getCoffee = function(id) {
	for (var i = 0; i < this.coffeeList.length; i++) {
		var coffee = this.coffeeList[i];
		if (coffee.id == id) {
			return coffee;
		}
	}

	return null;
};

/** @returns {Object} */
OrderModel.prototype.getRequestData = function() {
	this.saveToStorage();
	var data = {"order": localStorage.getItem("order")};
	return data;
};

/**
 * @class
 * @extends {OrderModel}
 */
function GlobalOrderModel() {
	GlobalOrderModel.superclass.apply(this);
	/** @type {OrderModel} */
	this.allOrders = [];
}
extend(GlobalOrderModel, OrderModel);


/** @param {OrderModel} order */
GlobalOrderModel.prototype.addOrder = function(order) {
	this.allOrders.push(order);

	for (var i = 0; i < order.itemsList.length; ++i) {
		var otherItem = order.itemsList[i];
		var item = this.getItem(otherItem.coffee, otherItem.weight);
		if (!item) {
			item = otherItem.clone();
		} else {
			item.quantity += otherItem.quantity;
		}
	}
};




/** @class */
function CoffeeModel() {
	/** @type {string} */
	this.id = "";
	/** @type {string} */
	this.name = "";
	/** @type {string} */
	this.subName = "";
	/** @type {number[]} */
	this.price = "";
}

/** @class */
function OrderItem() {
	/** @type {CoffeeModel} */
	this.coffee = null;
	/** @type {string} */
	this.id = "";
	/** @type {number} */
	this.weight = "";
	/** @type {number} */
	this.quantity = 0;
}

/** @returns {OrderItem} */
OrderItem.prototype.clone = function() {
	var clone = new OrderItem();
	clone.coffee = this.coffee;
	clone.id = this.id;
	clone.quantity = this.quantity;
	clone.weight = this.weight;

	return clone;
};