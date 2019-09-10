# Changelog

## [Unreleased]
Future stuff...

## [1.3.0] - 2019-09-10
### Added
- New middleware option `middleware.throwOnError` that will throw the errors from within `shapeshifter` and let the user manually handle them. Setting this to `true` will affect all `shapeshifter`-actions.
- New ACTION option `ACTION.payload.throwOnError` that will throw any error resulting from the specific action dispatched and let the user manually handle it.

## [1.2.0] - 2019-08-31
### Added
- New middleware option `middleware.axios` that allows for global configuration of all shapeshifter actions. However `ACTION.axios` will override any property set through the middleware set up with the same name.

## [1.1.1] - 2019-08-28
### Changed
- Accidentally published using `yarn`, silly me

## [1.1.0] - 2019-08-28
### Added
- Added `defined()` utility function
- Added `optional()` utility function, based on `defined()`
- Added `lowerCaseObjectKeys()` utility function
- Added tests to `handleStatusResponse()`
- Added tests to `handleResponse()`
- Added tests to `handleRepeater()`
- Added dependency: axios-mock-adapter
- Added `"resolutions"` key to `package.json` to let `yarn` enforce the dependencies of dependencies to use versions that resolve vulnerability issues
- Added dependencies: `eslint`, `eslint-config-airbnb-base` & `eslint-plugin-import`
- Added script command `lint`
- Added script command `lint` to `prepublish` hook with `--max-warning=0`, meaning it exits on warnings too
- Added `.eslintrc.js`
- Added `.eslintignore` to ignore build directory

### Changed
- Moved from using monads to validate middleware options to instead make use of `defined()` and `optional()` to determine if options are invalid, required and missing or simply optional
- Moved from using monads to validate action options to instead make use of `defined()` and `optional()` to determine if options are invalid, required and missing or simply optional
- Moved definition of request payload to its own module
- Moved handling of ETag to its own module, where we make use of the added `lowerCaseObjectKeys()` utility function
- Moved default options to its own module
- Refactored `handleStatusResponse()`
- Refactored `handleResponse()`
- Moved repeater functionality to its own module
- Upgraded `@babel` scoped dependencies to deal with vulnerability issues
- Upgraded test dependencies to deal with vulnerability issues
- Upgraded `npm` dependency to deal with vulnerability issues
- From not having enforced code-style to having applied linting rules and done changes to the entire project

### Removed
- Dependency: folktale

## [1.0.1] - 2019-06-25
### Changed
- Only `console.error` the message of a canceled call to avoid double-arrows in the console

## [1.0.0] - 2019-06-24
### Added
- This `CHANGELOG.md`
- Added own custom errors, `ResponseWithErrors`, `ResponseWithError`, `ResponseWithBadStatusCode`, `ResponseRepeatReject`, `ResponseNotModified`, `ResponseErrorMessage`, `ResponseErrorMessage`
- Added helper method to recognize shapeshifter errors, `src/utils/isShapeshifterError.js`

### Changed
- Only dispatch `failure()` on axios errors or on shapeshifter errors
- Not throwing anymore in the `.catch()`-handler, instead `console.error` it
- Changed from anonymous to named callback function in the `.catch()`-handler for a more readable stack trace
- Replace where applicable with new introduced errors
- Started replacing e.g. `deepEqual`'s with sinon assertions
- Started making heavier use of mocks to disable the `console.error` or `console.warn` in tests and at the same time verify their usage
- Corrected typo in test title

### Removed
- Bubbling `error` from within the shapeshifter `.catch()`-handler, instead it just logs the error

### Fixed
- Swallowing errors. Added test case that checks if e.g. a `SyntaxError` after `success()` has been called and logs the error. At the same time we shouldn't call `failure()` neither call `dispatch()` in the `.catch()`-handler
- Added test case that ensures if response is `304` ("Not Modified") that we won't call `dispatch()` and that we won't log it as an error

[Unreleased]: https://github.com/dawaa/redux-shapeshifter-middleware/compare/v1.3.0...head
[1.3.0]: https://github.com/dawaa/redux-shapeshifter-middleware/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/dawaa/redux-shapeshifter-middleware/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/dawaa/redux-shapeshifter-middleware/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/dawaa/redux-shapeshifter-middleware/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/dawaa/redux-shapeshifter-middleware/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/dawaa/redux-shapeshifter-middleware/compare/v0.15.0...v1.0.0
