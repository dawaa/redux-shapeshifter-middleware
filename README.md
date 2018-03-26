# redux-shapeshifter-middleware

Redux middleware that will empower your _actions_ to become your go-to guy whenever there is a need for ajax calls ... and have you say, [**...!**](https://youtu.be/nm6DO_7px1I?t=9)


## Table of Contents
* [Installation](https://github.com/dawaa/redux-shapeshifter-middleware#installation)
    * [Implementation](https://github.com/dawaa/redux-shapeshifter-middleware#implementation)
        * [Basic set up](https://github.com/dawaa/redux-shapeshifter-middleware#a-very-basic-implementation)
        * [Detailed set up](https://github.com/dawaa/redux-shapeshifter-middleware#a-more-detailed-set-up-of-shapeshifter)
        * [Header authentication](https://github.com/dawaa/redux-shapeshifter-middleware#header-authentication)
* [Middleware configuration](https://github.com/dawaa/redux-shapeshifter-middleware#middleware-configuration)
    * [base](https://github.com/dawaa/redux-shapeshifter-middleware#base-string)
    * [constants](https://github.com/dawaa/redux-shapeshifter-middleware#constants-object)
    * [auth](https://github.com/dawaa/redux-shapeshifter-middleware#auth-object)
    * [handleStatusResponses](https://github.com/dawaa/redux-shapeshifter-middleware#handlestatusresponses-function)
    * [fallbackToAxiosStatusResponse](https://github.com/dawaa/redux-shapeshifter-middleware#fallbacktoaxiosstatusresponse-boolean)
    * [customSuccessResponses](https://github.com/dawaa/redux-shapeshifter-middleware#customsuccessresponses-array)
* [Action properties](https://github.com/dawaa/redux-shapeshifter-middleware#action-properties)
    * [type](https://github.com/dawaa/redux-shapeshifter-middleware#type-string)
    * [types](https://github.com/dawaa/redux-shapeshifter-middleware#types-array)
    * [payload](https://github.com/dawaa/redux-shapeshifter-middleware#payload-function)
        * [payload properties](https://github.com/dawaa/redux-shapeshifter-middleware#inside-payload-properties)
            * [url](https://github.com/dawaa/redux-shapeshifter-middleware#url-string)
            * [tapBeforeCall](https://github.com/dawaa/redux-shapeshifter-middleware#tapbeforecall-function)
            * [success](https://github.com/dawaa/redux-shapeshifter-middleware#success-function)
            * [failure](https://github.com/dawaa/redux-shapeshifter-middleware#failure-function)
            * [tapAfterCall](https://github.com/dawaa/redux-shapeshifter-middleware#tapaftercall-function)
            * [auth](https://github.com/dawaa/redux-shapeshifter-middleware#auth-boolean)
    * [meta](https://github.com/dawaa/redux-shapeshifter-middleware#meta-object)
        * [mergeParams](https://github.com/dawaa/redux-shapeshifter-middleware#metamergeparams-boolean)
    * [axios](https://github.com/dawaa/redux-shapeshifter-middleware#axios-object)
* [How to use?](https://github.com/dawaa/redux-shapeshifter-middleware#how-to-use)
    * [Normal example](https://github.com/dawaa/redux-shapeshifter-middleware#normal-example)
    * [Generator example](https://github.com/dawaa/redux-shapeshifter-middleware#generator-example)

______________________________________________________

## Installation
```
$ npm|yarn install|add redux-shapeshifter-middleware
```
#### Implementation

##### A very basic implementation.
```js
import { createStore, applyMiddleware } from 'redux';
import shapeshifter                     from 'redux-shapeshifter-middleware';

const apiMiddleware = shapeshifter({
    base: 'http://api.url/v1/',
    /**
     * If payload.auth is set to `true` this will kick in and add the
     * properties added here to the API request.
     *
     * Note: These values will be taken from Redux store
     * e.g. below would result in:
     *  Store {
     *    user: {
     *      sessionid: '1234abcd'
     *    }
     *  }
     */
    auth: {
        user: 'sessionid'
    },
    fallbackToAxiosStatusResponse: true, // default is: true
    // Above tells the middleware to fallback to Axios status response if
    // the data response from the API call is missing the property `status`.
    // 
    // If you however would like to deal with the status responses yourself you might
    // want to set this to false and then in the response object from your back-end
    // always provide a `status` property.
})

const store = createStore(
    reducers,
    applyMiddleware(
        // ... other middlewares
        someMiddleware,
        apiMiddleware
    )
)
```
______________________________________________________

##### A more detailed set up of shapeshifter and authentication.
```js
import { createStore, applyMiddleware } from 'redux';
import shapeshifter                     from 'redux-shapeshifter-middleware';

const shapeshifterOpts = {
    base: 'http://api.url/v1/',


    auth: {
        user: {
            sessionid: true
            // If you wish to make sure a property is NOT present
            // you may pass `false` instead.. note that this means
            // the back-end would have to deal with the incoming data.
        }
    },
    
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
        API       : 'API_CONSTANT',       // default: 'API'
        API_ERROR : 'API_ERROR_RESPONSE', // default: 'API_ERROR'
        API_VOID  : 'API_NO_RESPONSE',    // default: 'API_VOID'
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
______________________________________________________

##### Header authentication
```js
import { createStore, applyMiddleware } from 'redux';
import shapeshifter                     from 'redux-shapeshifter-middleware';

const shapeshifterOpts = {
    base: 'http://api.url/v1/',
    auth: {
        headers: {
            'Authorization': 'Bearer #user.token'
            // Above will append the key ("Authorization") to each http request being made
            // that has the `payload.auth` set to true.
            // The value of the key has something weird in it, "#user.token". What this means is
            // that when the request is made this weird part will be replaced with the actual
            // value from the Redux store.
            //
            // e.g. this could be used more than once, or it could also be just for deeper values
            // 'Bearer #user.data.private.token'.
        }
    },
    // .. retracted code, because it's the same as above.
}    
// .. retracted code, because it's the same as above.
```


## Middleware configuration
All options that the middleware can take.

#### `base <string>`
_`default: ''`_
This sets the base url for all API calls being made through this middleware. Could be overwritten by using the `axios.baseURL` property on the Action.

#### `constants <object>`
* API `<string>` _default: 'API'_
  This is the **type** this middleware will look for when actions are being dispatched.
* API_ERROR `<string>` _default: 'API_ERROR'_
  When an http request fails, this is the type that will be dispatched and could be used to return a visual response to the end-user e.g. on a failed login attempt.
* API_VOID `<string>` _default: 'API_VOID'_
  Upon success of a __generator__ function we have the choice to pass a type of our own, if the return statement is omitted or if there is no returned object with a key `type` then this will be dispatched as the `type` inside an object, along with another key `LAST_ACTION` which references the type that initiated the process.

#### `auth <object>`
_`default: undefined`_
When making a request you can pass the `auth <boolean>` property to [`payload <object>`](https://github.com/dawaa/redux-shapeshifter-middleware#payload-function), doing this will activate this object which in return will pass the value as a parameter to the request being made.

> Note that any properties or values passed within the auth {} object are connected to the Store.

> It is not possible to mix __Example 1 and 2__ with __Example 3__

__Example 1__ with a shallow value to check:
```js
const apiMiddleware = shapeshifter({
  // .. retracted code
  auth: {
    user: 'sessionid'
  }
})
```
Looking at __Example 1__ it would on any HTTP request being made with `ACTION.payload.auth = true` would check the Store for the properties `user` and within that `sessionid` and pass the value found to the request as a parameter.

__Example 2__ with a shallow value to disallow:
```js
const apiMiddleware = shapeshifter({
  // .. retracted code
  auth: {
    user: 'sessionid',
    profile: {
      account: {
        freeMember: false
      }
    }
  }
})
```
Passing a `boolean` as the value will check that the property does not exist on the current Store, if it does a warning will be emitted and the request will not be made. Could be done the other way around, if you pass `true` it would be required to have that property in the Store.. although it would be up to the back-end to evaluate the value coming from the Store in that case.

__Example 3__ with a nested property and headers authorization:
```js
const apiMiddleware = shapeshifter({
  // .. retracted code
  auth: {
    headers: {
      'Authorization': 'Bearer #user.token',
      
      // or even deepter
      'Authorization': 'Bearer #user.data.private.token',
      
      // or even multiple values
      'cusotm-header': 'id=#user.id name=#user.private.name email=#user.private.data.email',
    }
  }
})
```
__Example 3__ allows us to pass headers for authorization on requests having the `ACTION.payload.auth` set to __true__.

#### `handleStatusResponses <function>`
_`default: null`_
* Arguments
    * [response](https://github.com/axios/axios#response-schema) `<object>` The Axios response object.
    * store `<object>`
        * `#dispatch() <function>`
        * `#getState <function>`
        * `#state <object>`

**NOTE** that this method __must__ return either `Promise.resolve()` or `Promise.reject()` depending on your own conditions.. 

Defining this method means that any `customSuccessResponses` defined or any error handling done by the middleware will be ignored.. It's now up to you to deal with that however you like. So by returning a `Promise.reject()` the `*_FAILURE` Action would be dispatched or vice versa if you would return `Promise.resolve()`..

Example
```js
const apiMiddleware = shapeshifter({
    // .. retracted code
    handleStatusResponses(response, store) {
      if ( response.data && response.data.errors ) {
        // Pass the error message or something similar along with the failed Action.
        return Promise.reject( response.data.errors )
      }

      // No need to pass anything here since the execution will continue as per usual.
      return Promise.resolve()
    }
})
```


#### `fallbackToAxiosStatusResponse <boolean>`
_`default: true`_
If you've built your own REST API and want to determine yourself what's right or wrong then setting this value to false would help you with that. Otherwise this would check the response object for a `status` key and if none exists it falls back to what Axios could tell from the request made.

#### `customSuccessResponses <array>`
_`default: null`_
In case you are more "wordy" in your responses and your response object might look like:
```json
{
  user: { name: 'DAwaa' },
  status: 'success'
}
```

Then you might want to consider adding 'success' to the array when initializing the middleware to let it know about your custom success response.



## Action properties
We will explore what properties there are to be used for our new actions..



#### `type <string>`
Nothing unusual here, just what type we send out to the system.. For the middleware to pick it up, a classy 'API' would do, unless you specified otherwise in the set up of shapeshifter.

```javascript
const anActionFn = () => ({
    type: 'API' // or API (without quotation marks) if you're using a constant
})
```
______________________________________________________

#### `types <array>`
An array containing your actions

```javascript
const anActionFn = () => ({
    type: 'API',
    types: [
        WHATEVER_ACTION,
        WHATEVER_ACTION_SUCCESS,
        WHATEVER_ACTION_FAILED
    ]
})
```

______________________________________________________

#### `payload <function>`
* Arguments
    * store `<object>`
        * `#dispatch() <function>`
        * `#state <object>`

This property and its value is what actually defines the API call we want to make. 

**Note**
Payload **must** return an object. Easiest done using a fat-arrow function like below.

```javascript
const anActionFn = () => ({
    type: 'API',
    types: [
        WHATEVER_ACTION,
        WHATEVER_ACTION_SUCCESS,
        WHATEVER_ACTION_FAILED
    ],
    payload: store => ({
    })
    // or if you fancy destructuring
    // payload: ({ dispatch, state }) => ({})
```

### Inside payload properties
Acceptable properties to be used by the returned object from `payload`

```javascript
const anActionFn = () => ({
    type: 'API',
    types: [
        WHATEVER_ACTION,
        WHATEVER_ACTION_SUCCESS,
        WHATEVER_ACTION_FAILED
    ],
    payload: store => ({
        // THE BELOW PROPERTIES GO IN HERE <<<<<<
    })
```

#### `url <string>`

#### `tapBeforeCall <function>`
* Arguments
    * `obj <object>`
        * `params <object>`
        * `dispatch <function>`
        * `state <object>`
        * `getState <function>` 


Is called before the API request is made, also the function receives an object argument.

#### `success <function>`
* Arguments
    * `type <string>`
    * `payload <object>`
    * `meta|store <object>`
        * If `meta` key is missing from the first level of the API action, then this 3rd argument will be replaced with `store`.
    * `store <object>` -- Will be 'null' if no `meta` key was defined in the first level of the API action.

This method is run if the API call went through successfully with no errors.

#### `failure <function>`
* Arguments
    * `type <string>`
    * `error <mixed>`

This method is run if the API call responds with an error from the back-end.

#### `tapAfterCall <function>`
* Arguments
    * `obj <object>`
        * `params <object>`
        * `dispatch <function>`
        * `state <object>`
        * `getState <function>` 

Same as `tapBeforeCall <function>` but is called **after** the API request was made.

#### `auth <boolean>`
Default is **false**.

If the API call is constructed with `auth: true` and the middleware set up was initialized with an `auth` key pointing to the part of the store you want to use for authorization in your API calls. Then what you set up in the initialization will be added to the requests parameters automatically for you.
______________________________________________________


#### `meta <object>`
This is our jack-in-the-box prop, you can probably think of lots of cool stuff to do with this, but below I will showcase what I've used it for.

Basically this allows to bridge stuff between the action and the `success()` method.

**Note**
Check [`Payload > "Inside payload properties" > success()`](https://github.com/dawaa/redux-shapeshifter-middleware#success-function) above to understand where these meta tags will be available.

```javascript
const success = (type, payload, meta, store) => ({
    // We can from here reach anything put inside `meta` property
    // inside the action definition.
    type: type,
    heeliesAreCool: meta.randomKeyHere.heeliesAreCool
})

const fetchHeelies = () => ({
    type: 'API',
    types: [
        FETCH_HEELIES,
        FETCH_HEELIES_SUCCESS,
        FETCH_HEELIES_FAILED
    ],
    payload: store => ({
        url: '/fetch/heelies/',
        params: {
            color: 'pink'
        },
        success: success
    }),
    meta: {
        randomKeyHere: {
            heeliesAreCool: true
        }
    }
```

#### `meta.mergeParams <boolean>`
Default is **false**.

Just like this property states, it will pass anything you have under the property `payload.params` to the `meta` parameter passed to `success()` method.

#### `axios <object>`
This parameter allows us to use any Axios Request Config property that you can
find under their docs.. [here](https://github.com/axios/axios#request-config).

Anything added under the `ACTION.axios<object>` will have higher priority, meaning
that it will override anything set before in the payload object that has the
same property name.

______________________________________________________

## How to use?

### Normal example
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
    type  : type,
    users : payload.items
})

// @param {string} type This is our _FAILED constnat
// @param {object} error The error response from our back-end
const failure = (type, error) => ({
    type    : type,
    message : 'Failed to fetch all users.',
    error   : error
})

export const fetchAllUsers = () => ({
    type: API,
    types: [
        FETCH_ALL_USERS,
        FETCH_ALL_USERS_SUCCESS,
        FETCH_ALL_USERS_FAILED
    ],
    payload: ({ dispatch, state }) => ({
        url: '/users/all',
        success: success,
        failure: failure
    })
})
```

______________________________________________________

### Generator example
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
    type    : type,
    message : 'Failed to fetch all users.',
    error   : error
})

export const fetchAllUsers = userId => ({
    type: API,
    types: [
        FETCH_USER
        FETCH_USER_SUCCESS,
        FETCH_USER_FAILED
    ],
    payload: ({ dispatch, state }) => ({
        url: '/fetch-user-without-their-name',
        params: {
            id: userId
        },
        success: success,
        failure: failure
    })
})
```
