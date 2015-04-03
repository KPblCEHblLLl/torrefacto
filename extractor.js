JSON.stringify(
	$(".catalog-tags").children("li").map(function () {
		var el = $(this);
		var title = el.find("h3")[0];

		var data = {
			id: this.id,
			name: title.childNodes[0].textContent.trim(),
			subName: $(title).find(".smaller").text().trim(),
			price: {},
			link: el.find(".more-hold").prop("href"),
		};

		el.find(".weight").each(function () {
			var weight = parseInt($(this).text().trim());
			var price = parseInt($(this).next().text().trim());
			data.price[weight] = price;
		});

		return data;
	}).filter(function () {
		return !!this["price"]["150"];
	}).get(), null, 2);