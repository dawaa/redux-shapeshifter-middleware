# Changelog

## [Unreleased]
Future stuff...

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

[Unreleased]: https://github.com/dawaa/redux-shapeshifter-middleware/compare/v1.0.1...head
[1.0.1]: https://github.com/dawaa/redux-shapeshifter-middleware/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/dawaa/redux-shapeshifter-middleware/compare/v0.15.0...v1.0.0
