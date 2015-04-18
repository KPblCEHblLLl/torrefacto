/**
 * Created by d.lubimov on 03.04.2015.
 */

/** @type {OrderModel} */
var order = new OrderModel();
/** @type {jQuery} */
var table;

order.on("coffee-list-changed", drawCoffeeTable);
order.on("items-list-changed", drawCoffeeTable);
order.on("opinions-list-changed", applyOpinions);


$(function () {
	table = $("#coffee-table");
	order.loadFromStorage();
	$("#username")
		.change(function () {
			order.setUserName(this.value.trim());
		})
		.val(order.username);

	$("#reset").click(function() {
		order.clearItems();
	});

	$("#submit-order").click(function() {
		var url = "/submit-order/";
		var data = order.getRequestData();
		$.post(url, data);
	});

	$("#opinion")
		.on("click", ".cancel", function() {
			$("#opinion").hide();
		})
		.on("click", ".save", function() {
			saveOpinion();
		});

	table
		.on("click", ".quantity .add", function () {
			addQuantity(this);
		})
		.on("click", ".quantity .substract", function () {
			substractQuantity(this);
		})
		.on("click", ".opinion-holder", function () {
			showEditOpinion(this);
		});

	$.getJSON("./data/coffee.json").done(function (list) {
		order.applyCoffeeList(list);
	});
});


function drawCoffeeTable() {
	var list = order.coffeeList;

	var tbody = table.find("tbody");
	tbody.html("");

	for (var i = 0; i < list.length; i++) {
		/** @type {CoffeeModel} */
		var coffee = list[i];

		var row = $("<tr/>");
		row.data("coffee-id", coffee.id);
		row.attr("id", "row_" + coffee.id);

		var name = coffee.name;
		if (coffee.subName) {
			name += " (" + coffee.subName + ")";
		}

		row.append("<td><span class='opinion-holder'></span><a href='" + coffee.link + "'>" + name + "</a></td>");
		for (var j = 0; j < order.weightsList.length; j++) {
			var weight = order.weightsList[j];
			row.append("<td class='price'>" + coffee.price[weight] + " р.</td>");
			row.append($("<td></td>").append(createQuantityContent(coffee, weight)));
		}
		tbody.append(row);
	}
	setTotal();
	applyOpinions();
}

/**
 * @param {CoffeeModel} coffee
 * @param {number} weight
 * @param {OrderItem} [item]
 * @returns {HTMLElement}
 */
function createQuantityContent(coffee, weight, item) {
	item = item || order.getItem(coffee, weight);
	var quantity = item ? item.quantity : 0;
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
	var item = order.addQuantity(coffee, weight);
	redrawQuantity(item);
}

/** @param {HTMLElement} button */
function substractQuantity(button) {
	var quantity = $(button).parents(".quantity");
	var coffee = quantity.data("coffee");
	var weight = quantity.data("weight");
	var item = order.substractQuantity(coffee, weight);
	redrawQuantity(item);
}

function redrawAllQuantities() {
	for (var i = 0; i < order.itemsList.length; ++i) {
		var item = order.itemsList[i];
		redrawQuantity(item);
	}
}
/**
 * @param {OrderItem} item
 */
function redrawQuantity(item) {
	if (!item) {
		return;
	}
	var quantity = table.find(".quantity[coffee-id='" + item.coffee.id + "'][weight='" + item.weight + "']");
	quantity.replaceWith(createQuantityContent(item.coffee, item.weight));
	setTotal();
}

function setTotal() {
	$("#total").text(order.getTotal());
}

function applyOpinions() {
	var opinionsHash = order.getOpinionsGroupedByCoffee();
	for (var coffeId in opinionsHash) {
		if (!opinionsHash.hasOwnProperty(coffeId)) {
			continue;
		}
		var list = opinionsHash[coffeId];
		var opinionText = "";
		for (var i = 0; i < list.length; ++i) {
			var opinion = list[i];
			if (opinionText) {
				opinionText += "\n\n";
			}
			opinionText += opinion.user + ":\n";
			opinionText += opinion.text;
		}

		var row = table.find("#row_" + coffeId);
		var opinionHolder = row.find(".opinion-holder");
		opinionHolder.prop("title", opinionText);
		opinionHolder.toggleClass("has-opinion", !!opinionText);
	}
}

/** @param {HTMLElement} opinionHolder */
function showEditOpinion(opinionHolder) {
	var row = $(opinionHolder).parents("tr");
	var coffee = order.getCoffee(row.data("coffee-id"));
	var opinion = order.getUserOpinion(coffee);
	var text = opinion ? opinion.text : "";

	var popup = $("#opinion");
	popup.data("coffee", coffee);
	var textarea = popup.find(".opinion-input");
	textarea.val(text);

	popup.css("top", row.offset().top);
	popup.show();
}

function saveOpinion() {
	var popup = $("#opinion");
	var coffee = popup.data("coffee");

	var textarea = popup.find(".opinion-input");
	var text = textarea.val();

	order.saveUserOpinion(coffee, text);
	popup.hide();
}