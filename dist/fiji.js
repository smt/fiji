/*! fiji v0.1.1

The MIT License (MIT)

Copyright (c) 2014 Stephen Tudor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

;(function (root, factory) {
    'use strict';
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
    'use strict';

    var undef;  // this local intentionally left blank

    var locSto = window.localStorage;
    var sesSto = window.sessionStorage;

    var DEFAULT_TTL = 1000 * 60 * 60 * 24;      // a day
    var DEFAULT_LONG_TTL = DEFAULT_TTL * 30;    // a month
    var DEFAULT_NS = 'Fiji';

    var isDefined = function isDefined(obj) {
        return obj !== undef;
    };

    var isUndefined = function isUndefined(obj) {
        return obj === undef;
    };

    /**
     * Creates a new Fiji object
     * @class Fiji
     * @param {Object} [options]
     */
    var Fiji = function Fiji(options) {
        var self = this;

        // Ensure this was called with the 'new' keyword
        if (!(self instanceof Fiji)) {
            return new Fiji(options);
        }

        /** @private {Object} */
        var _options = Object.create(null, {
            ttl:     { value: (options && isDefined(options.ttl)) ?
                              options.ttl : DEFAULT_TTL },
            longTtl: { value: (options && isDefined(options.longTtl)) ?
                              options.longTtl : DEFAULT_LONG_TTL },
            ns:      { value: (options && isDefined(options.ns)) ?
                              options.ns : DEFAULT_NS }
        });

        /** @private {Object} */
        var _cache = {};

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
                    isDefined(item.id) &&
                    isDefined(item.value) &&
                    isDefined(item.expires) &&
                    isDefined(item.isLongTerm));
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
            var _value = isUndefined(value) ? null : value;
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
                return undef;
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
                return undef;
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
                return undef;
            }

            if (isDefined(_cache[key])) {
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
                return undef;
            }

            var item = _cache[key];

            // default to session storage
            var storeMechanism = (validateItem(item) && item.isLongTerm) ? locSto : sesSto;
            var storeObj = JSON.parse(storeMechanism.getItem(_options.ns));

            if (!storeObj) {
                return null;
            }

            item = isUndefined(storeObj[key]) ? null : storeObj[key];

            return item;
        };

        /**
         * Atomically update storage with the given cache item.
         * @private
         * @param {Object} item
         */
        var setStoreItem = function setStoreItem(item) {
            if (!validateItem(item)) {
                return undef;
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
                return undef;
            }

            var item = _cache[key];

            if (!validateItem(item)) {
                return undef;
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
                return undef;
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
        self.get = function get(key) {
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

            } else if (isExpired(item)) {

                // refresh expired cached item from storage
                storeObj = getStoreItem(key);
                if (validateItem(storeObj)) {
                    item.value = storeObj.value;
                }
                item.expires = calculateExpiresDate((item.isLongTerm ? _options.ttl : _options.longTtl));
                setStoreItem(item);
                setCacheItem(item);

            }

            return item.value;
        };

        /**
         * Set the value of a cache object, resetting the expire time.
         * @method
         * @param {String} key
         * @param {*} value
         * @param {Boolean} [isLongTerm]
         */
        self.set = function set(key, value, isLongTerm) {
            var now = new Date();
            var item = getCacheItem(key);

            if (!item) {

                item = createNewItem(key, value, isLongTerm);

            } else {

                item.value = value;
                item.expires = calculateExpiresDate((item.isLongTerm ? _options.ttl : _options.longTtl));

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
        self.del = function del(key, confirmDeleteAll) {
            // Provide the means to wipe the whole slate clean if desired.
            if (!key && confirmDeleteAll) {
                sesSto.removeItem(_options.ns);
                locSto.removeItem(_options.ns);
                _cache = null;
                _cache = {};
                return;
            }

            // Important to delete store item first so that the storage mechanism, if any, can be determined
            deleteStoreItem(key);
            deleteCacheItem(key);
        };

        /**
         * Return an object of all key-value pairs in the cache.
         * @method
         * @return {Object}
         */
        self.list = function list() {
            var valuesObj = {};
            var keys = Object.keys(_cache);
            for (var i = 0; i < keys.length; i++) {
                valuesObj[keys[i]] = self.get(keys[i]);
            }
            return valuesObj;
        };

    };

    return Fiji;

}));
