export interface Options {
	leading?: boolean;
	trailing?: boolean;
	accumulate?: boolean;
}

interface Deferred<PromiseReturn> {
	promise: Promise<Awaited<PromiseReturn>>;
	resolve: (value: unknown) => void;
	reject: (reason: unknown) => void;
}

type Wait = number | (() => number);

function debounce<
	FunctionType extends () => Array<unknown> | Promise<Array<unknown>>,
>(
	fn: FunctionType,
	wait?: Wait,
	opts?: Options & { accumulate: true },
): { flush: () => void; clear: () => void } & (() => Promise<
	Awaited<ReturnType<FunctionType>>[0]
>);

function debounce<
	ArgsType,
	FunctionType extends (
		args: ArgsType[],
	) => Array<unknown> | Promise<Array<unknown>>,
>(
	fn: FunctionType,
	wait?: Wait,
	opts?: Options & { accumulate: true },
): { flush: () => void; clear: () => void } & ((
	args: ArgsType,
) => Promise<Awaited<ReturnType<FunctionType>>[0]>);

function debounce<
	ArgType,
	FunctionType extends (...args: ArgType[]) => unknown | Promise<unknown>,
>(
	fn: FunctionType,
	wait?: Wait,
	opts?: Options & { accumulate?: false },
): { flush: () => void; clear: () => void } & ((
	...args: ArgType[]
) => Promise<Awaited<ReturnType<FunctionType>>>);

function debounce<
	ArgType,
	FunctionType extends (...args: ArgType[]) => unknown | Promise<unknown>,
>(
	fn: FunctionType,
	wait: Wait = 0,
	opts: Options = {},
): { flush: () => void; clear: () => void } & ((
	...args: ArgType[]
) => Promise<Awaited<ReturnType<FunctionType>>>) {
	let lastCallAt: number;
	let deferred: Deferred<
		ReturnType<FunctionType> | Array<ReturnType<FunctionType>>
	> | null = null;
	let firstPromise: Promise<Awaited<ReturnType<FunctionType>>>;
	let timer: NodeJS.Timeout;
	let pendingArgs: unknown[] = [];
	const options: Required<Options> = {
		leading: false,
		trailing: true,
		accumulate: false,
		...opts,
	};

	const ret = function debounced(
		...args: unknown[]
	): Promise<Awaited<ReturnType<FunctionType>>> {
		const currentWait = getWait(wait);
		const currentTime = new Date().getTime();

		const isCold =
			lastCallAt === undefined || currentTime - lastCallAt > currentWait;

		lastCallAt = currentTime;

		if (isCold && options.leading) {
			firstPromise = options.accumulate
				? Promise.resolve(fn.call(this, [args])).then((result) => result[0])
				: Promise.resolve(fn.call(this, ...args));
			return firstPromise;
		}

		if (deferred !== null) {
			clearTimeout(timer);
		} else {
			deferred = defer();
		}

		if (options.trailing) {
			pendingArgs.push(args);
			timer = setTimeout(flush.bind(this), currentWait);

			if (options.accumulate) {
				const argsIndex = pendingArgs.length - 1;
				return deferred.promise.then(
					(results: Array<Awaited<ReturnType<FunctionType>>>) =>
						results[argsIndex],
				);
			}
		} else {
			return firstPromise;
		}

		return deferred.promise as Promise<Awaited<ReturnType<FunctionType>>>;
	};

	function clear(): void {
		if (timer !== undefined) {
			clearTimeout(timer);
			pendingArgs = [];
		}
		deferred = null;
	}

	function flush(): void {
		clearTimeout(timer);

		const res = options.accumulate
				? fn.call(this, pendingArgs)
				: fn.apply(this, pendingArgs[pendingArgs.length - 1])

		if (deferred === null) {
			deferred = defer();
		}
		Promise.resolve(res).then(deferred.resolve, deferred.reject);

		pendingArgs = [];
		deferred = null;
	}

	ret.clear = clear;
	ret.flush = flush;

	return ret;
}

function getWait(wait: Wait): number {
	return typeof wait === "function" ? wait() : wait;
}

function defer<ReturnType>(): Deferred<ReturnType> {
	const deferred: Partial<Deferred<ReturnType>> = {};
	deferred.promise = new Promise((resolve, reject) => {
		deferred.resolve = resolve;
		deferred.reject = reject;
	});
	return deferred as Deferred<ReturnType>;
}

module.exports = debounce;
