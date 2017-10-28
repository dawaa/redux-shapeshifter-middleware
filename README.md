# redux-shapeshifter-middleware

Redux middleware that will empower your _actions_ to become your go-to guy whenever there is a need for ajax calls ... and have you say, [**...!**](https://youtu.be/nm6DO_7px1I?t=9)

__________________
#### Documentation is still a work in progress...
__________________


## Installation
```
$ npm|yarn install|add redux-shapeshifter-middleware
```
#### Implementation
A very basic implementation.
```js
import { createStore, applyMiddleware } from 'redux'
import shapeshifter                     from 'redux-shapeshifter-middleware'

const apiMiddleware = shapeshifter({ base: 'http://api.url/v1/' })

const store = createStore(
    reducers,
    applyMiddleware(
        // ... other middlewares
        someMiddleware,
        apiMiddleware
    )
)
```

A more detailed set up of shapeshifter.
```js
import { createStore, applyMiddleware } from 'redux'
import shapeshifter                     from 'redux-shapeshifter-middleware'

const shapeshifterOpts = {
    base: 'http://api.url/v1/',
    
    /**
     * constants.API
     *  Tells the middleware what action type it should act on
     * 
     * constants.API_ERROR
     *  If back-end responds with an error or call didn't go through,
     *  middleware will emit 'API_ERROR'.. Unless you specified your own
     *  custom 'failure'-method within the 'payload'-key in your action.
     *  ```
     *  return {
     *      type: API_ERROR,
     *      message: "API/FETCH_ALL_USERS failed.. lol",
     *      error: error // error from back-end
     *  }
     *  ```
     *
     * constants.API_VOID
     *  Mainly used within generator functions, if we don't end
     *  the generator function with a `return { type: SOME_ACTION }`.
     *  Then the middleware will emit the following:
     *  ```
     *  return {
     *      type: API_VOID,
     *      LAST_ACTION: 'API/FETCH_ALL_USERS' // e.g...
     *  }
     *  ```
     */
    constants: {
        API: 'API_CONSTANT', // default: 'API'
        API_ERROR: 'API_ERROR_RESPONSE', // default: 'API_ERROR'
        API_VOID: 'API_NO_RESPONSE' // default: 'API_VOID'
    }
}
const apiMiddleware = shapeshifter( shapeshifterOpts )

const store = createStore(
    reducers,
    applyMiddleware(
        // ... other middlewares
        someMiddleware,
        apiMiddleware
    )
)
```


## How to use?

A normal case where we have both dispatch and our current state for our usage.
```js
// internal
import { API } from '__actions__/consts'

export const FETCH_ALL_USERS         = 'API/FETCH_ALL_USERS'
export const FETCH_ALL_USERS_SUCCESS = 'API/FETCH_ALL_USERS_SUCCESS'
export const FETCH_ALL_USERS_FAILED  = 'API/FETCH_ALL_USERS_FAILED'

// @param {string} type This is our _SUCCESS constant
// @param {object} payload The response from our back-end
const success = (type, payload) => ({
    type,
    users: payload.items
})

// @param {string} type This is our _FAILED constnat
// @param {object} error The error response from our back-end
const failure = (type, error) => ({
    type,
    message: 'Failed to fetch all users.',
    error
})

export const fetchAllUsers = () => ({
    type: API,
    payload: ({ dispatch, state }) => ({
        url: '/users/all',
        types: [
            FETCH_ALL_USERS,
            FETCH_ALL_USERS_SUCCESS,
            FETCH_ALL_USERS_FAILED
        ],
        success,
        failure
    })
})
```

A case where we make us of a generator function.
```js
// internal
import { API } from '__actions__/consts'

export const FETCH_USER         = 'API/FETCH_USER'
export const FETCH_USER_SUCCESS = 'API/FETCH_USER_SUCCESS'
export const FETCH_USER_FAILED  = 'API/FETCH_USER_FAILED'

// @param {string} type This is our _SUCCESS constant
// @param {object} payload The response from our back-end
// @param {object} store - { dispatch, state, getState }
const success = function* (type, payload, { dispatch, state }) {
    // Get the USER id
    const userId = payload.user.id
    
    // Fetch name of user
    const myName = yield new Promise((resolve, reject) => {
        axios.get('some-weird-url', { id: userId })
            .then((response) => {
                // Pretend all is fine and we get our name...
                resolve( response.name );
            })
    })
    
    dispatch({ type: 'MY_NAME_IS_WHAT', name: myName })
    
    // Conditionally if we want to emit to the
    // system that the call is done.
    return {
        type
    }
    // Otherwise the middleware itself would emit
    return {
        type: 'API_VOID',
        LAST_ACTION: 'FETCH_USER'
    }
}

// @param {string} type This is our _FAILED constnat
// @param {object} error The error response from our back-end
const failure = (type, error) => ({
    type,
    message: 'Failed to fetch all users.',
    error
})

export const fetchAllUsers = userId => ({
    type: API,
    payload: ({ dispatch, state }) => ({
        url: '/fetch-user-without-their-name',
        params: {
            id: userId
        },
        types: [
            FETCH_USER,
            FETCH_USER_SUCCESS,
            FETCH_USER_FAILED
        ],
        success,
        failure
    })
})
```
