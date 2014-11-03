fiji.js
=======

Fiji is a lightweight library for proxying localStorage and sessionStorage. Since we know accessing these storage mechanisms is slow, one way to realize a performance gain is to access a native JS data structure most of the time, only going back to the well if the data is considered old.

This library is more of a thought experiment than a tool that is inherently useful. However, Fiji is free to use as is. Constructive feedback and suggestions are most welcome.

Usage
-----

Create a new instance of Fiji on your page, passing in the desired options. All options are... optional. The default option values are shown below.

```javascript
var fiji = new Fiji({
  ns: 'Fiji',           // The name to use for the localStorage and sessionStorage items
  ttl: 86400000,        // Number of seconds till sessionStorage item expiry
  longTtl: 2592000000,  // Number of seconds till localStorage item expiry
  debug: false          // Turn debug mode on, which enables extra logging output
});
```

Cache objects are stored internally with the following structure:

```javascript
{
  "id": "KEY_STRING",
  "value": 12345,
  "expires": Fri Oct 31 2014 17:27:16 GMT-0400 (EDT)
  "isLongTerm": false
}
```

This an object for sessionStorage. The only difference for a localStorage object is that the `isLongTerm` property would have been set to true.

API
---

Once you have created an instance of Fiji, referred to henceforth as **fiji**, you may call the following methods on it:

### fiji.get(key)

Returns the value of a cache object with the given key/id.

### fiji.set(key, value, [isLongTerm])

Sets the value of a cache object with the given key/id, and optionally, the `isLongTerm` property to denote localStorage as opposed to the default, which is sessionStorage.

### fiji.del(key, [confirmDeleteAll])

Deletes the cache object with the given key/id, as well as its sessionStorage/localStorage cousin. If `true` is passed as the optional second argument, the entire Fiji cache is reset.
