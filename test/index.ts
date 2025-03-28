import tap from "tap";
import debounce from "@tofandel/debounce-promise";

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

tap.test("returns the result of a single operation ", async (t) => {
	const debounced = debounce(async (value) => value, 100);
	const promise = debounced("foo");
	const result = await promise;

	t.equal(result, "foo");
});

tap.test("returns the result of the latest operation ", async (t) => {
	const debounced = debounce(async (value) => value, 100);
	const promises = ["foo", "bar", "baz", "qux"].map(debounced);
	const results = await Promise.all(promises);

	t.same(results, ["qux", "qux", "qux", "qux"]);
});

tap.test(
	"if leading=true, the value from the first promise is used",
	async (t) => {
		const debounced = debounce(async (value) => value, 100, { leading: true });
		const promises = ["foo", "bar", "baz", "qux"].map(debounced);
		const date = Date.now();
		await promises[0];
		t.equal(Date.now() - date < 2, true);
		await promises[1];
		t.equal(Date.now() - date > 98, true);
		const results = await Promise.all(promises);

		t.same(results, ["foo", "qux", "qux", "qux"]);
	},
);

tap.test(
	"if trailing=false, the value from the first promise is used on subsequent calls and resolves at the same time",
	async (t) => {
		const debounced = debounce(async (value) => value, 100, {
			leading: true,
			trailing: false,
		});
		const promises = ["foo", "bar", "baz"].map(debounced);
		const c = setTimeout(() => {
			throw new Error("Failed resolving within 10ms");
		}, 10);

		const date = Date.now();
		await promises[0];
		t.equal(Date.now() - date < 2, true);
		await promises[1];
		t.equal(Date.now() - date < 2, true);

		clearTimeout(c);

		await sleep(110);
		promises.push(debounced("qux"));

		const results = await Promise.all(promises);

		t.same(results, ["foo", "foo", "foo", "qux"]);
	},
);

tap.test("do not call the given function repeatedly", async (t) => {
	let callCount = 0;
	const debounced = debounce(async () => callCount++, 100);
	await Promise.all([1, 2, 3, 4].map(debounced));
	t.equal(callCount, 1);
});

tap.test(
	"does not call the given function again after the timeout when leading=true if executed only once",
	async (t) => {
		let callCount = 0;
		const debounced = debounce(async () => callCount++, 100, { leading: true });
		await debounced();
		await sleep(200);
		t.equal(callCount, 1);
	},
);

tap.test(
	"calls the given function again after the timeout when leading=true if executed multiple times",
	async (t) => {
		let callCount = 0;
		const debounced = debounce(async () => callCount++, 100, { leading: true });
		await Promise.all([1, 2, 3, 4].map(debounced));
		await sleep(200);
		t.equal(callCount, 2);
	},
);

tap.test("waits until the wait time has passed", async (t) => {
	let callCount = 0;
	const debounced = debounce(async () => callCount++, 10);
	debounced();
	debounced();
	debounced();
	t.equal(callCount, 0);
	await sleep(20);
	t.equal(callCount, 1);
});

tap.test("clear", async (t) => {
	let callCount = 0;
	const debounced = debounce(async () => callCount++, 10, {trailing: true});
	debounced.clear();
	debounced();
	debounced.clear();
	t.equal(callCount, 0);
	await sleep(20);
	t.equal(callCount, 0);
});


tap.test("clearing while flushing", async (t) => {
	let callCount = 0;
	const debounced = debounce(async () => callCount++ && debounced.clear(), 10, {trailing: true});
	debounced();
	await sleep(20);
	t.equal(callCount, 1);
});

tap.test("supports passing function as wait parameter", async (t) => {
	let callCount = 0;
	let getWaitCallCount = 0;
	const debounced = debounce(
		async () => callCount++,
		() => {
			getWaitCallCount++;
			return 100;
		},
	);
	debounced();
	debounced();
	debounced();
	await sleep(90);
	t.equal(callCount, 0);
	await sleep(20);
	t.not(getWaitCallCount, 0);
	t.equal(callCount, 1);
});

tap.test(
	"calls the given function again if wait time has passed",
	async (t) => {
		let callCount = 0;
		const debounced = debounce(async () => callCount++, 10);
		debounced();

		await sleep(20);
		t.equal(callCount, 1);

		debounced();

		await sleep(20);
		t.equal(callCount, 2);
	},
);

tap.test("maintains the context of the original function", async (t) => {
	const context = {
		foo: 1,
		debounced: debounce(async function () {
			this.foo++;
		}),
	};

	context.debounced();

	await sleep(20);
	t.equal(context.foo, 2);
});

tap.test(
	"maintains the context of the original function when leading=true",
	async (t) => {
		const context = {
			foo: 1,
			debounced: debounce(
				async function () {
					this.foo++;
				},
				10,
				{ leading: true },
			),
		};

		await context.debounced();

		t.equal(context.foo, 2);
	},
);

tap.test(
	"Converts the return value from the producer function to a promise",
	async (t) => {
		let callCount = 0;
		const debounced = debounce(() => ++callCount, 10);

		debounced();
		debounced();
		await debounced();

		t.equal(callCount, 1);
	},
);

tap.test("calls debounced function and accumulates arguments", async (t) => {
	async function squareBatch(args) {
		t.same(args, [[1], [2], [3]]);
		return await Promise.resolve(args.map((arg) => arg * arg));
	}

	const square = debounce(squareBatch, 10, { accumulate: true });

	const one = square(1);
	const two = square(2);
	const three = square(3);

	await sleep(20);

	t.equal(await one, 1);
	t.equal(await two, 4);
	t.equal(await three, 9);
});

tap.test("accumulate works with leading=true", async (t) => {
	let callNo = 1;
	async function squareBatch(args: Array<number>) {
		if (callNo === 1) {
			t.same(args, [[1]]);
		}
		if (callNo === 2) {
			t.same(args, [[2], [3]]);
		}
		callNo++;
		return await Promise.resolve(args.map((arg) => arg * arg));
	}

	const square = debounce(squareBatch, 10, { leading: true, accumulate: true });

	const one = square(1);
	const two = square(2);
	const three = square(3);

	t.equal(await one, 1);
	t.equal(await two, 4);
	t.equal(await three, 9);
});

tap.test("accumulate works with non-promise return value", async (t) => {
	let callNo = 1;
	function squareBatch(args: Array<number>): Array<number> {
		if (callNo === 1) {
			t.same(args, [[1]]);
		}
		if (callNo === 2) {
			t.same(args, [[2], [3]]);
		}
		callNo++;
		return args.map((arg) => arg * arg);
	}

	const square = debounce(squareBatch, 10, { leading: true, accumulate: true });

	const one = square(1);
	const two = square(2);
	const three = square(3);

	one satisfies Promise<number>;

	t.equal(await one, 1);
	t.equal(await two, 4);
	t.equal(await three, 9);
});

tap.test("nesting call", async (t) => {
	const debounced = debounce(
		(a1, a2) =>
			shouldIterate ? callIterate(a1, a2) : Promise.resolve([a1, a2]),
		10,
		{ leading: false },
	);

	let shouldIterate = true;
	let deb2: Promise<unknown> | null = null;
	const callIterate = (a1, a2) => {
		shouldIterate = false;
		debounced(3, 4).then((r) => t.same(r, [1, 2]));
		setTimeout(() => {
			deb2 = debounced(3, 4).then((r) => t.same(r, [3, 4]));
		}, 15);

		return Promise.resolve([a1, a2]);
	};

	const test = await debounced(1, 2);
	t.same(test, [1, 2]);

	await sleep(15);
	await deb2;
});

tap.test("typescript type inference", async (t) => {
	const deb = debounce(() => 1);

	const ty = await deb();
	ty satisfies number;
	t.equal(ty, 1);

	const deb2 = debounce(() => Promise.resolve("abc"));

	const ty2 = await deb2();
	ty2 satisfies string;
	t.equal(ty2, "abc");

	const deb3 = debounce(() => Promise.resolve(["abc"]), 10, {
		accumulate: true,
	});

	const ty3 = await deb3();
	ty3 satisfies string;

	const deb4 = debounce((abc: string, def: number) => abc + def);

	const ty4 = await deb4("abc", 2);
	ty4 satisfies string;
	t.equal(ty4, "abc2");


	const deb5 = debounce((args: number[]) => args.map(() => args[0] * args[1]), 10, {
		accumulate: true,
	});

	deb5(2);
	const ty5 = await deb5(3);
	ty5 satisfies number;
	t.equal(ty5, 6);

	const deb6 = debounce((abc: number) => abc);

	const ty6 = await deb6(2);
	ty6 satisfies number;
	t.equal(ty6, 2);

});
