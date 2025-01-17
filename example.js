import debounce from "@tofandel/debounce-promise";

function expensiveOperation(value) {
	return Promise.resolve(value);
}

// Simple example
{
	const saveCycles = debounce(expensiveOperation, 100);

	[1, 2, 3, 4].forEach((num) => {
		return saveCycles(`call no #${num}`).then((value) => {
			console.log(value);
		});
	});
}

// With leading=true & trailing=false
{
	const saveCycles = debounce(expensiveOperation, 100, {
		leading: true,
		trailing: false,
	});

	[1, 2, 3, 4].forEach((num) => {
		return saveCycles(`call no #${num}`).then((value) => {
			console.log(value);
		});
	});
}

// With accumulate=true
{
	function squareValues(values) {
		return Promise.all(values.map((val) => val * val));
	}

	const square = debounce(squareValues, 100, { accumulate: true });

	[1, 2, 3, 4].forEach((num) => {
		return square(num).then((value) => {
			console.log(value);
		});
	});
}
