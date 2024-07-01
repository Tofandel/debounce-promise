# @tofandel/debounce-promise



[![test](https://img.shields.io/github/actions/workflow/status/Tofandel/debounce-promise/tests.yml?label=Tests)](https://github.com/Tofandel/debounce-promise/actions/workflows/tests.yml)
[![npm downloads](https://img.shields.io/npm/dt/@tofandel/debounce-promise.svg)](https://www.npmjs.com/package/@tofandel/debounce-promise)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://standardjs.com/)
[![license](https://img.shields.io/github/license/Tofandel/debounce-promise.svg)](https://github.com/Tofandel/debounce-promise/blob/master/LICENSE.md)

[![NPM](https://nodei.co/npm/@tofandel/debounce-promise.png)](https://nodei.co/npm/@tofandel/debounce-promise/)

Create a debounced version of a promise returning function

## Install

    npm i -S @tofandel/debounce-promise


## Usage example

```js

var debounce = require('@tofandel/debounce-promise')

function expensiveOperation(value) {
  return Promise.resolve(value)
}

var saveCycles = debounce(expensiveOperation, 100);

[1, 2, 3, 4].forEach(num => {
  return saveCycles('call no #' + num).then(value => {
    console.log(value)
  })
})

// Will only call expensiveOperation once with argument `4` and print:
//=> call no #4
//=> call no #4
//=> call no #4
//=> call no #4
```

### With leading=true

```js
var debounce = require('@tofandel/debounce-promise')

function expensiveOperation(value) {
  return Promise.resolve(value)
}

var saveCycles = debounce(expensiveOperation, 100, {leading: true});

[1, 2, 3, 4].forEach(num => {
  return saveCycles('call no #' + num).then(value => {
    console.log(value)
  })
})

//=> call no #1
//=> call no #4
//=> call no #4
//=> call no #4
```

### With leading=true and trailing=false

```js
var debounce = require('@tofandel/debounce-promise')

function expensiveOperation(value) {
  return Promise.resolve(value)
}

var saveCycles = debounce(expensiveOperation, 100, {leading: true, trailing: false});

[1, 2, 3].forEach(num => {
  return saveCycles('call no #' + num).then(value => {
    console.log(value)
  })
})
setTimeout(() => {
  saveCycles('call no #' + num).then(value => {
    console.log(value)
  })
}, 110)

//=> call no #1
//=> call no #1
//=> call no #1
//=> call no #4
```

### With accumulate=true

```js
var debounce = require('@tofandel/debounce-promise')

function squareValues (argTuples) {
  return Promise.all(argTuples.map(args => args[0] * args[0]))
}

var square = debounce(squareValues, 100, {accumulate: true});

[1, 2, 3, 4].forEach(num => {
  return square(num).then(value => {
    console.log(value)
  })
})

//=> 1
//=> 4
//=> 9
//=> 16
```

## Api
`debounce(func, [wait=0], [{leading: true|false, accumulate: true|false})`

Returns a debounced version of `func` that delays invoking until after `wait` milliseconds.

Set `leading: true` if you
want to call `func` and return its promise immediately.

Set `accumulate: true` if you want the debounced function to be called with an array of all the arguments received while waiting.

Supports passing a function as the `wait` parameter, which provides a way to lazily or dynamically define a wait timeout.


## Example timeline illustration

```js
function refresh() {
  return fetch('/my/api/something')
}
const debounced = debounce(refresh, 100)
```

```
time (ms) ->   0 ---  10  ---  50  ---  100 ---
-----------------------------------------------
debounced()    | --- P(1) --- P(1) --- P(1) ---
refresh()      | --------------------- P(1) ---
```

```js
const debounced = debounce(refresh, 100, {leading: true})
```
```
time (ms) ->   0 ---  10  ---  50  ---  100 ---  110 ---
--------------------------------------------------------
debounced()    | --- P(1) --- P(2) --- P(2) --- P(2) ---
refresh()      | --- P(1) --------------------- P(2) ---
```
