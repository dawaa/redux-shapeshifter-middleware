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
## Action properties
We will explore what properties there are to be used for our new actions..



##### `type <string>`
Nothing unusual here, just what type we send out to the system.. For the middleware to pick it up, a classy 'API' would do, unless you specified otherwise in the set up of shapeshifter.

```js
{
    type: 'API' // or API if you're using a constant
}
```

##### `payload <function>`
This property and its value is what actually defines the API call we want to make. The value must be of type 'function' and also return an object. Which we easily can do with a fat arrow function `() => ({})`.
* store - The function receives an argument, which is the store.dispatch and also our current state, store.state.


```js
{
    type: 'API',
    payload: store => ({
    })
}

// or.. if you're a fan of destructuring

{
    type: 'API',
    payload: ({ dispatch, state }) => ({
    })
}
```

_________________________
##### Payload properties
Acceptable properties to be used by the returned object from `payload`

* `url <string>`
* `types <array>`
 
An array containing your WHATEVER_ACTION, WHATEVER_ACTION_SUCCESS and WHATEVER_ACTION_FAILED
* `tapBeforeCall <function>`

Is called before the API request is made, also the function receives an object argument.. Containing `params <object>`, `dispatch <function>`, `state <object>` and `getState <function>`


* `success <function>`


If the request successfully goes through and no error was returneed by the back-end. Then this function will run.

`success()` is called with 3 or 4 arguments, depending on if you set a `meta` property in your action or not.

`success(type, payload, store)`

`success(type, payload, meta, store)`



* `failure <function>`

If the request fails this function will be called.
* `tapAfterCall <function>`

Same as `tapBeforeCall <function>` but is called **after** the API request was made.

##### `meta <object>`
This would ultimately result in the success call e.g. be called like this `success(type, payload, meta, store)`. Notice how the `store` is now at 4th position and not in 3rd any longer. If we don't set a `meta` property in our action the success call omits the `meta`  and instead uses `store` in its place.

```js
const success = (type, payload, meta, store) => ({
    type,
    statement: `Heelies are so cool -- ${ meta.passInRandomStuff.heeliesAreCool }`
})

const deleteUserByEmail = email => ({
    type: API,
    payload: ({ state }) => ({
        url: '/user/delete',
        params: {
            email
        },
        success
    }),
    meta: {
        passInRandomStuff: {
            heeliesAreCool: 'they are!'
        }
    }
})
```

##### `meta <object> . mergeParams <boolean> : default 'false'`
Like it states, if you have any parameters you pass to your back-end through `payload.params <object>` which you also would like to use in either the success or failure calls, you can pass in true here.

```js
const success = (type, payload, meta, store) => ({
    type,
    message: `User was deleted by their email.. ${ meta.params.email }`
})

const deleteUserByEmail = email => ({
    type: API,
    payload: ({ state }) => ({
        url: '/user/delete',
        params: {
            email
        }
        success
    }),
    meta: {
        mergeParams: true
    }
})
```

## How to use?

#### Normal
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

#### Generator
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
