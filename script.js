/**
 * Created by d.lubimov on 03.04.2015.
 */

var order = new OrderModel();
var table;
$(function () {
	order.loadFromStorage();
	table = $("#coffee-table");
	$("#username")
		.change(function () {
			order.setUserName(this.value.trim());
		})
		.val(order.username);

	$("#reset").click(function() {
		order.clearItems();
		applyCoffeeList();
	});

	$("#submit-order").click(function() {
		var url = "/submit-order/";
		var data = order.getRequestData();
		$.post(url, data);
	});

	table
		.on("click", ".quantity .add", function () {
			addQuantity(this);
		})
		.on("click", ".quantity .substract", function () {
			substractQuantity(this);
		});

	$.getJSON("data.json").done(function (list) {
		order.applyCoffeeList(list);
		applyCoffeeList();
	});
});


function applyCoffeeList() {
	var list = order.coffeeList;

	var tbody = table.find("tbody");
	tbody.html("");

	for (var i = 0; i < list.length; i++) {
		var row = $("<tr/>");

		var coffee = list[i];
		var name = coffee.name;
		if (coffee.subName) {
			name += " (" + coffee.subName + ")";
		}

		row.append("<td><a href='" + coffee.link + "'>" + name + "</a></td>");
		for (var j = 0; j < order.weightsList.length; j++) {
			var weight = order.weightsList[j];
			row.append("<td class='price'>" + coffee.price[weight] + " р.</td>");
			row.append($("<td></td>").append(createQuantityContent(coffee, weight)));
		}
		tbody.append(row);
	}
	setTotal();
}

/**
 * @param {CoffeeModel} coffee
 * @param {number} weight
 * @returns {HTMLElement}
 */
function createQuantityContent(coffee, weight) {
	var orderItem = order.getItem(coffee, weight);
	var quantity = orderItem ? orderItem.quantity : 0;
	var content = $("<div class='quantity'></div>");
	content.attr("coffee-id", coffee.id);
	content.attr("weight", weight);
	content.append("<span>" + quantity + "</span>");
	content.append("<button class='add'>want it!</button>");
	if (quantity > 0) {
		content.append("<button class='substract'>fck it!</button>");
	}

	content.data("coffee", coffee);
	content.data("weight", weight);

	return content;
}

/** @param {HTMLElement} button */
function addQuantity(button) {
	var quantity = $(button).parents(".quantity");
	var coffee = quantity.data("coffee");
	var weight = quantity.data("weight");
	order.addQuantity(coffee, weight);
	redrawQuantity(coffee, weight);
}

/** @param {HTMLElement} button */
function substractQuantity(button) {
	var quantity = $(button).parents(".quantity");
	var coffee = quantity.data("coffee");
	var weight = quantity.data("weight");
	order.substractQuantity(coffee, weight);
	redrawQuantity(coffee, weight);
}

/**
 * @param {CoffeeModel} coffee
 * @param {number} weight
 */
function redrawQuantity(coffee, weight) {
	if (!coffee) {
		return;
	}
	var quantity = table.find(".quantity[coffee-id='" + coffee.id + "'][weight='" + weight + "']");
	quantity.replaceWith(createQuantityContent(coffee, weight));
	setTotal();
}

function setTotal() {
	$("#total").text(order.getTotal());
}

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
	/** @type {string} */
	this.id = "";
	/** @type {number} */
	this.weight = "";
	/** @type {number} */
	this.quantity = 0;
}

/** @class */
function OrderModel() {
	/** @type {string} */
	this.username = "";
	/** @type {OrderItem[]} */
	this.items = [];
	/** @type {CoffeeModel[]} */
	this.coffeeList = [];
}

/** @type {number[]} */
OrderModel.prototype.weightsList = [
	150,
	450
];

/** @param {string} username */
OrderModel.prototype.setUserName = function(username) {
	this.username = username;
	this.saveToStorage();
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
};

OrderModel.prototype.clearItems = function () {
	this.items = [];
	this.saveToStorage();
};

/**
 * @param {CoffeeModel} coffee
 * @param {number} weight
 * @returns {OrderItem}
 */
OrderModel.prototype.getItem = function (coffee, weight) {
	for (var i = 0; i < this.items.length; i++) {
		var orderItem = this.items[i];
		if (orderItem.id == coffee.id) {
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
		currentItem.id = coffee.id;
		currentItem.weight = weight;
		this.items.push(currentItem);
	}
	currentItem.quantity++;

	this.saveToStorage();
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
		this.items.push(item);
	}
};

OrderModel.prototype.saveToStorage = function() {
	var data = {};
	data["username"] = this.username;
	data["list"] = [];

	for (var i = 0; i < this.items.length; i++) {
		var item = this.items[i];
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

	for (var i = 0; i < this.items.length; i++) {
		var item = this.items[i];
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

OrderModel.prototype.getRequestData = function() {
	this.saveToStorage();
	var data = JSON.parse(localStorage.getItem("order"));
	return data;

};