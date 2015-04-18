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
	/** @type {CoffeeModel[]} */
	this._promisedCoffeeList = [];
	/** @type {CoffeeOpinion[]} */
	this._opinionsList = [];

	this._eventsTarget = $(this);
}

/** @type {boolean} */
OrderModel.prototype.isGlobal = false;

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
	var self = this;
	list = $.map(list, function(coffeeData) {
		var id = coffeeData["id"];
		var coffee = self.getPromissedCoffee(id);
		coffee = coffee || new CoffeeModel();
		coffee.id = coffeeData["id"];
		coffee.name = coffeeData["name"];
		coffee.subName = coffeeData["subName"];
		coffee.price = coffeeData["price"];
		coffee.link = coffeeData["link"];
		return coffee;
	});

	list.sort(function (/**CoffeeModel*/i1, /**CoffeeModel*/i2) {
		if (i1.name == i2.name) {
			return i1.subName > i2.subName ? 1 : -1;
		}
		return i1.name > i2.name ? 1 : -1;
	});

	this.coffeeList = list;

	this.fire("coffee-list-changed", this.coffeeList);
};

OrderModel.prototype.applyOpinionsList = function(list) {
	var self = this;
	for (var i = 0; i < list.length; i++) {
		var data = list[i];
		var opinion = this._parseOpinion(data);
		this._opinionsList.push(opinion);
	}
	this.fire("opinions-list-changed", this.coffeeList);
};

OrderModel.prototype.clearItems = function () {
	this.itemsList = [];
	this.saveToStorage();
	this.fire("items-list-changed", this.itemsList);
};

/** @returns {OrderItem[]} */
OrderModel.prototype.getItemsList = function() {
	return this.itemsList.slice(0);
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

	this._loadSelfOrder();
	this._loadOpinions();

	this.fire("load");
};

OrderModel.prototype._loadSelfOrder = function() {
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
		item.coffee = this.promiseCoffee(itemData["id"]);
		item.quantity = itemData["quantity"];
		item.weight = itemData["weight"];
		this.itemsList.push(item);
	}
};

OrderModel.prototype._loadOpinions = function() {
	var dataStr = localStorage.getItem("opinions");
	if (!dataStr) {
		return;
	}

	var list = JSON.parse(dataStr);
	for (var i = 0; i < list.length; ++i) {
		var data = list[i];
		var opinion = this._parseOpinion(data);
		this._opinionsList.push(opinion);
	}
};

/**
 * @param {object} data
 * @returns {CoffeeOpinion}
 * @private
 */
OrderModel.prototype._parseOpinion = function(data) {
	var opinion = new CoffeeOpinion();
	opinion.text = data["text"];
	opinion.coffee = this.promiseCoffee(data["coffeeId"]);
	opinion.username = data["username"];
	return opinion;
};

OrderModel.prototype.saveToStorage = function() {
	localStorage.setItem("username", this.username);

	this._storeSelfOrder();
	this._storeSelfOpinions();
};

OrderModel.prototype._storeSelfOrder = function() {
	var data = {};
	data["username"] = this.username;
	data["list"] = [];

	for (var i = 0; i < this.itemsList.length; i++) {
		var item = this.itemsList[i];
		if (item.quantity == 0) {
			continue;
		}
		data["list"].push({
			"id": item.coffee.id,
			"quantity": item.quantity,
			"weight": item.weight,
		});
	}

	localStorage.setItem("order", JSON.stringify(data));
};

OrderModel.prototype._storeSelfOpinions = function() {
	var opinionsData = this.getAllUserOpinions().map(function(/**CoffeeOpinion*/opinion) {
		return {
			"username": opinion.username,
			"coffeeId": opinion.coffee.id,
			"text": opinion.text,
		};
	});

	localStorage.setItem("opinions", JSON.stringify(opinionsData));
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

/**
 * @param {string} id
 * @returns {CoffeeModel}
 */
OrderModel.prototype.getPromissedCoffee = function(id) {
	for (var i = 0; i < this._promisedCoffeeList.length; i++) {
		var coffee = this._promisedCoffeeList[i];
		if (coffee.id == id) {
			return coffee;
		}
	}

	return null;
};

/**
 * @param {string} [id]
 * @returns {CoffeeModel}
 */
OrderModel.prototype.promiseCoffee = function(id) {
	var coffee = this.getCoffee(id);
	if (!coffee) {
		coffee = new CoffeeModel();
		coffee.id = id;
		this._promisedCoffeeList.push(coffee);
	}

	return coffee;
};

/** @returns {Object} */
OrderModel.prototype.getRequestData = function() {
	this.saveToStorage();
	var data = {"order": localStorage.getItem("order")};
	return data;
};

/**
 * @param {string} [username]
 */
OrderModel.prototype.getAllUserOpinions = function(username) {
	username = username || this.username;
	var list = this._opinionsList.filter(function(/**CoffeeOpinion*/opinion) {
		return opinion.username == username;
	});
	return list;
};

/**
 * @param {CoffeeModel} [coffee]
 * @param {*} [hash]
 * @returns {*|CoffeeOpinion[][]}
 */
OrderModel.prototype.getOpinionsGroupedByCoffee = function(coffee, hash) {
	hash = hash || {};
	var list;
	if (coffee) {
		list = this._getOpinionsByCoffee(coffee);
		hash[coffee.id] = list;
	} else {
		for (var i = 0; i < this.coffeeList.length; ++i) {
			coffee = this.coffeeList[i];
			hash = this.getOpinionsGroupedByCoffee(coffee, hash);
		}
	}

	return hash;
};

/**
 * @param {CoffeeModel} [coffee]
 * @returns {CoffeeOpinion[]}
 */
OrderModel.prototype._getOpinionsByCoffee = function(coffee) {
	var list = this._opinionsList.filter(function(/**CoffeeOpinion*/opinion) {
		return opinion.coffee == coffee;
	});

	return list;
};

/**
 * @param {CoffeeModel} coffee
 * @param {string} [username]
 * @returns {CoffeeOpinion}
 */
OrderModel.prototype.getUserOpinion = function(coffee, username) {
	username = username || this.username;
	var opinionsList = this._getOpinionsByCoffee(coffee);
	for (var i = 0; i < opinionsList.length; ++i) {
		var opinion = opinionsList[i];
		if (opinion.username == username) {
			return opinion;
		}
	}

	return null;
};

/**
 * @param {CoffeeModel} coffee
 * @returns {CoffeeOpinion[]}
 */
OrderModel.prototype.getOtherOpinions = function(coffee) {
	var currentUser = this.username;
	var list = [];
	var opinionsList = this._getOpinionsByCoffee(coffee);
	for (var i = 0; i < opinionsList.length; ++i) {
		var opinion = opinionsList[i];
		if (opinion.username != currentUser) {
			list.push(opinion);
		}
	}
	return list;
};

/**
 * @param {CoffeeModel} coffee
 * @param {string} text
 * @param {string} [username]
 */
OrderModel.prototype.saveUserOpinion = function(coffee, text, username) {
	username = username || this.username;
	if (!text) {
		this.deleteOpinion(coffee, username);
	} else {
		var opinion = this.getUserOpinion(coffee, username);
		if (!opinion) {
			opinion = new CoffeeOpinion();
			opinion.coffee = coffee;
			opinion.username = username;
			this._opinionsList.push(opinion);
		}
		opinion.text = text;
		this.saveToStorage();
		this.fire("opinions-list-changed");
	}
};

/**
 * @param {CoffeeModel} coffee
 * @param {string} [username]
 */
OrderModel.prototype.deleteOpinion = function(coffee, username) {
	username = username || this.username;
	var opinion = this.getUserOpinion(coffee, username);
	if (!opinion) {
		return;
	}
	this._opinionsList.splice(this._opinionsList.indexOf(opinion), 1);
	this.saveToStorage();
	this.fire("opinions-list-changed");
};

/**
 * @class
 * @extends {OrderModel}
 */
function GlobalOrderModel() {
	GlobalOrderModel.superclass.apply(this);
	/** @type {OrderModel} */
	this.allOrders = [];
	/** @type {boolean} */
	this.isGlobal = true;
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
	/** @type {number[]} */
	this.link = "";
}

/** @class */
function OrderItem() {
	/** @type {CoffeeModel} */
	this.coffee = null;
	/** @type {number} */
	this.weight = "";
	/** @type {number} */
	this.quantity = 0;
}

/** @returns {OrderItem} */
OrderItem.prototype.clone = function() {
	var clone = new OrderItem();
	clone.coffee = this.coffee;
	clone.quantity = this.quantity;
	clone.weight = this.weight;

	return clone;
};

/** @class */
function CoffeeOpinion() {
	/** @type {string} */
	this.username = "";
	/** @type {CoffeeModel} */
	this.coffee = null;
	/** @type {string} */
	this.text = "";
}