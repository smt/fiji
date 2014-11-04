(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(function () {
            return (root.Fiji = factory());
        });
    } else if (typeof exports === 'object') {
        // Node.js
        module.exports = root.Fiji = factory();
    } else {
        // Browser globals
        root.Fiji = factory();
    }
}(this, function() {
    "use strict";

    var locSto = window.localStorage;
    var sesSto = window.sessionStorage;

    var DEFAULT_TTL = 1000*60*60*24;
    var DEFAULT_LONG_TTL = 1000*60*60*24*30;
    var DEFAULT_NS = 'Fiji';
    var DEFAULT_DEBUG = false;

    /**
     * Creates a new Fiji object
     * @class Fiji
     * @param {Object} [options]
     */
    var Fiji = function Fiji(options) {
        // Ensure this was called with the 'new' keyword
        if (!(this instanceof Fiji)) {
            return new Fiji(options);
        }

        /** @private {Object} */
        var _options = Object.create(null, {
            ttl:     { value: (options && typeof options.ttl !== 'undefined') ?
                              options.ttl : DEFAULT_TTL },
            longTtl: { value: (options && typeof options.longTtl !== 'undefined') ?
                              options.longTtl : DEFAULT_LONG_TTL },
            ns:      { value: (options && typeof options.ns !== 'undefined') ?
                              options.ns : DEFAULT_NS },
            debug:   { value: (options && typeof options.debug !== 'undefined') ?
                              !!options.debug : DEFAULT_DEBUG }
        });

        /** @private {Object} */
        var _cache = {};

        if (_options.debug) {
            console.log('Cleaning localStorage and sessionStorage (for testing only)');
            locSto.removeItem(_options.ns);
            sesSto.removeItem(_options.ns);
        }

        /**
         * Validate a well-formed cache/storage object (used internally).
         * @private
         * @param {Object} item
         * @returns {Boolean}
         */
        var validateItem = function validateItem(item) {
            return (item &&
                    item.hasOwnProperty('id') &&
                    item.hasOwnProperty('value') &&
                    item.hasOwnProperty('expires') &&
                    item.hasOwnProperty('isLongTerm') &&
            typeof item.id         !== 'undefined' &&
            typeof item.value      !== 'undefined' &&
            typeof item.expires    !== 'undefined' &&
            typeof item.isLongTerm !== 'undefined')
        };

        /**
         * Add a TTL value to a date and return a new date to use as expiry value.
         * @private
         * @param {Number} [ttl]
         * @param {Date} [now]
         * @returns {Date}
         */
        var calculateExpiresDate = function calculateExpiresDate(ttl, now) {
            var _now = (typeof now === 'object' && now.toDateString) ? now : new Date();
            var _ttl = ttl || _options.ttl;
            return new Date(_now.valueOf() + _ttl);
        };

        /**
         * Create a new well-formed cache/storage object (used internally).
         * @private
         * @param {String} key
         * @param {*} value
         * @param {Boolean} [isLongTerm]
         * @returns {Object}
         */
        var createNewItem = function createNewItem(key, value, isLongTerm) {
            var _value = (typeof value === 'undefined') ? null : value;
            var _isLongTerm = !!isLongTerm;
            return {
                id: key,
                value: _value,
                expires: calculateExpiresDate((isLongTerm ? _options.ttl : _options.longTtl)),
                isLongTerm: _isLongTerm
            };
        };

        /**
         * Retrieve a value from the cache by the given key. If the resulting output is not a valid cache object, return null.
         * @private
         * @param {String} key
         * @returns {Object}
         */
        var getCacheItem = function getCacheItem(key) {
            if (!key) {
                if (_options.debug) console.warn('Please provide a key');
                return;
            }

            var item = _cache[key];
            return validateItem(item) ? item : null;
        };

        /**
         * Update the cache with the given cache item.
         * @private
         * @param {Object} item
         */
        var setCacheItem = function setCacheItem(item) {
            if (!validateItem(item)) {
                if (_options.debug) console.warn('Item was not set or properly formed: ', item);
                return;
            }

            _cache[item.id] = item;
        };

        /**
         * Remove an item from the cache by the given key.
         * @private
         * @param {String} key
         */
        var deleteCacheItem = function deleteCacheItem(key) {
            if (!key) {
                if (_options.debug) console.warn('Please provide a key');
                return;
            }

            if (typeof _cache[key] !== 'undefined') {
                _cache[key] = null;
                delete _cache[key];
            }
        };

        /**
         * Retrieve a cache object from storage by the given key.
         * @private
         * @param {String} key
         * @returns {Object}
         */
        var getStoreItem = function getStoreItem(key) {
            if (!key) {
                if (_options.debug) console.warn('Please provide a key');
                return;
            }

            var item = _cache[key];

            // default to session storage
            var storeMechanism = (validateItem(item) && item.isLongTerm) ? locSto : sesSto;
            var storeObj = JSON.parse(storeMechanism.getItem(_options.ns));

            if (!storeObj) {
                return null;
            }

            item = (typeof storeObj[key] === 'undefined') ? null : storeObj[key];

            return item;
        };

        /**
         * Atomically update storage with the given cache item.
         * @private
         * @param {Object} item
         */
        var setStoreItem = function setStoreItem(item) {
            if (!validateItem(item)) {
                if (_options.debug) console.warn('Item was not set or properly formed: ', item);
                return;
            }

            var storeMechanism = item.isLongTerm ? locSto : sesSto;
            var storeObj = JSON.parse(storeMechanism.getItem(_options.ns));

            if (!storeObj) {
                storeObj = {};
            }
            storeObj[item.id] = item;

            storeMechanism.setItem(_options.ns, JSON.stringify(storeObj));
        };

        /**
         * Remove an item from storage by the given key.
         * @private
         * @param {String} key
         */
        var deleteStoreItem = function deleteStoreItem(key) {
            if (!key) {
                if (_options.debug) console.warn('Please provide a key');
                return;
            }

            var item = _cache[key];

            if (!validateItem(item)) {
                if (_options.debug) console.warn('Item was not set or properly formed: ', item);
                return;
            }

            var storeMechanism = item.isLongTerm ? locSto : sesSto;
            var storeObj = JSON.parse(storeMechanism.getItem(_options.ns));

            storeObj[item.id] = null;
            delete storeObj[item.id];

            storeMechanism.setItem(_options.ns, JSON.stringify(storeObj));
        };

        /**
         * Determine whether a cache item is expired.
         * @private
         * @param {Object} item
         * @returns {Boolean}
         */
        var isExpired = function isExpired(item) {
            if (!item) {
                if (_options.debug) console.warn('Please provide an item');
                return;
            }

            var now = new Date();

            return new Date(item.expires.valueOf()) < now;
        };

        /**
         * Return the value of a cache object with the given key as an ID.
         * @method
         * @param {String} key
         * @returns {*}
         */
        this.get = function get(key) {
            var now = new Date();
            var storeObj;
            var item = getCacheItem(key);

            if (!item) {

                // prime cache
                storeObj = getStoreItem(key);
                if (!storeObj) {
                    storeObj = createNewItem(key, null);
                }
                setCacheItem(storeObj);
                item = getCacheItem(key);

                if (_options.debug) {
                    console.log('Initialized new cache item because blank "' + key + '"');
                    console.table(_cache);
                }

            } else if (isExpired(item)) {

                // refresh expired cached item from storage
                storeObj = getStoreItem(key);
                if (validateItem(storeObj)) {
                    item.value = storeObj.value;
                }
                item.expires = calculateExpiresDate((item.isLongTerm ? _options.ttl : _options.longTtl));
                setStoreItem(item);
                setCacheItem(item);

                if (_options.debug) {
                    console.log('Updated cache item because expired "' + key + '" (' + item.value + ')');
                    console.table(_cache);
                }

            } else {

                if (_options.debug) {
                    console.log('No cache init or update required, our data is still fresh.');
                    console.table(_cache);
                }

            }

            if (_options.debug) console.log('It is now ' + now.toString() + ' and _cache[' + key + '] expires at ', item.expires.toString());

            return item.value;
        };

        /**
         * Set the value of a cache object, resetting the expire time.
         * @method
         * @param {String} key
         * @param {*} value
         * @param {Boolean} [isLongTerm]
         */
        this.set = function set(key, value, isLongTerm) {
            var now = new Date();
            var item = getCacheItem(key);

            if (!item) {

                item = createNewItem(key, value, isLongTerm);
                if (_options.debug) {
                    console.log('Initialized new cache item because blank "' + key + '"');
                    console.table(_cache);
                }

            } else {

                item.value = value;
                item.expires = calculateExpiresDate((item.isLongTerm ? _options.ttl : _options.longTtl));
                if (_options.debug) {
                    console.log('Updated existing cache item "' + key + '" (' + value + ') : ' + now.toString());
                    console.table(_cache);
                }

            }

            // Ensure we never save the same key to two different types of storage.
            // If a different isLongTerm option is passed, delete the existing storage item.
            if (item.isLongTerm !== !!isLongTerm) {
                deleteStoreItem(key);
                item.isLongTerm = isLongTerm;
            }

            setStoreItem(item);
            setCacheItem(item);
        };

        /**
         * Destroy a cache item by key everywhere. If null is passed as the key and
         * true is passed as the optional second argument, the cache is completely reset.
         * @method
         * @param {String} key
         * @param {Boolean} [confirmDeleteAll]
         */
        this.del = function del(key, confirmDeleteAll) {
            // Provide the means to wipe the whole slate clean if desired.
            if (!key && confirmDeleteAll) {
                sesSto.removeItem(_options.ns);
                locSto.removeItem(_options.ns);
                _cache = null;
                _cache = {};
                if (_options.debug) console.log('Nuked the Fiji, kaboom!');
                return;
            }

            // Important to delete store item first so that the storage mechanism, if any, can be determined
            deleteStoreItem(key)
            deleteCacheItem(key)
        };

        /**
         * Return an object of all key-value pairs in the cache.
         * @method
         * @return {Object}
         */
        this.list = function list() {
            var valuesObj = {};
            var keys = Object.keys(_cache);
            for (var i = 0; i < keys.length; i++) {
                valuesObj[keys[i]] = this.get(keys[i]);
            }
            return valuesObj;
        };

    };

    return Fiji;

}));
