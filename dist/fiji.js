
/*! fiji v0.2.0

The MIT License (MIT)

Copyright (c) 2015 Stephen Tudor

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


(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require, exports, module);
  } else {
    root.Fiji = factory();
  }
}(this, function(require, exports, module) {

'use strict';
var locSto = localStorage;
var sesSto = sessionStorage;
var DEFAULT_TTL = 1000 * 60 * 60 * 24; // a day
var DEFAULT_LONG_TTL = DEFAULT_TTL * 30; // a month
var DEFAULT_NS = 'Fiji';
var isDefined = function isDefined(obj) {
    return typeof obj !== 'undefined';
};
/**
 * Creates a new Fiji object
 * @class Fiji
 * @param {Object} [options]
 */
var Fiji = (function () {
    function Fiji(options) {
        /** @private {Object} */
        this.cache = {};
        /** @private {Object} */
        this.options = {
            ttl: (options && isDefined(options.ttl)) ? options.ttl : DEFAULT_TTL,
            longTtl: (options && isDefined(options.longTtl)) ? options.longTtl : DEFAULT_LONG_TTL,
            ns: (options && isDefined(options.ns)) ? options.ns : DEFAULT_NS
        };
    }
    /**
     * Add a TTL value to a date and return a new date to use as expiry value.
     * @private
     * @param {Number} [ttl]
     * @param {Date} [now]
     * @returns {Date}
     */
    Fiji.prototype._calculateExpiresDate = function (ttl, now) {
        var _now = (typeof now === 'object' && now.toDateString) ? now : new Date();
        var _ttl = ttl || this.options.ttl;
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
    Fiji.prototype._createNewItem = function (key, value, isLongTerm) {
        var ttl = isLongTerm ? this.options.ttl : this.options.longTtl;
        var expires = this._calculateExpiresDate(ttl);
        return {
            id: key,
            value: value || null,
            expires: expires || null,
            isLongTerm: isLongTerm || false
        };
    };
    /**
     * Retrieve a value from the cache by the given key. If the resulting output is not a valid cache object, return null.
     * @private
     * @param {String} key
     * @returns {Object}
     */
    Fiji.prototype._getCacheItem = function (key) {
        return this.cache[key] || null;
    };
    /**
     * Update the cache with the given cache item.
     * @private
     * @param {Object} item
     */
    Fiji.prototype._setCacheItem = function (key, item) {
        this.cache[key] = item;
    };
    /**
     * Remove an item from the cache by the given key.
     * @private
     * @param {String} key
     */
    Fiji.prototype._delCacheItem = function (key) {
        if (isDefined(this.cache[key])) {
            this.cache[key] = null;
            delete this.cache[key];
        }
    };
    /**
     * Retrieve a cache object from storage by the given key.
     * @private
     * @param {String} key
     * @returns {Object}
     */
    Fiji.prototype._getStoreItem = function (key) {
        // default to session storage
        var storeMechanism = (isDefined(this.cache[key]) && this.cache[key].isLongTerm) ? locSto : sesSto;
        var storeObj = JSON.parse(storeMechanism.getItem(this.options.ns)) || {};
        return storeObj[key] || null;
    };
    /**
     * Atomically update storage with the given cache item.
     * @private
     * @param {Object} item
     */
    Fiji.prototype._setStoreItem = function (key, item) {
        var storeMechanism = item.isLongTerm ? locSto : sesSto;
        var storeObj = JSON.parse(storeMechanism.getItem(this.options.ns)) || {};
        storeObj[key] = item;
        storeMechanism.setItem(this.options.ns, JSON.stringify(storeObj));
    };
    /**
     * Remove an item from storage by the given key.
     * @private
     * @param {String} key
     */
    Fiji.prototype._delStoreItem = function (key) {
        var storeMechanism = (isDefined(this.cache[key]) && this.cache[key].isLongTerm) ? locSto : sesSto;
        var storeObj = JSON.parse(storeMechanism.getItem(this.options.ns)) || {};
        if (storeObj[key]) {
            storeObj[key] = null;
            delete storeObj[key];
            storeMechanism.setItem(this.options.ns, JSON.stringify(storeObj));
        }
    };
    /**
     * Determine whether a cache item is expired.
     * @private
     * @param {Object} item
     * @returns {Boolean}
     */
    Fiji.prototype._isExpired = function (item) {
        var now = new Date();
        return new Date(item.expires.valueOf()) < now;
    };
    /**
     * Return the value of a cache object with the given key as an ID.
     * @method
     * @param {String} key
     * @returns {*}
     */
    Fiji.prototype.get = function (key) {
        // const now = new Date();
        var item = this._getCacheItem(key);
        var storeObj;
        var ttl;
        if (!item) {
            // prime cache
            storeObj = this._getStoreItem(key);
            if (!storeObj) {
                storeObj = this._createNewItem(key, null);
            }
            this._setCacheItem(key, storeObj);
            item = this._getCacheItem(key);
        }
        else if (this._isExpired(item)) {
            // refresh expired cached item from storage
            storeObj = this._getStoreItem(key);
            if (storeObj) {
                item.value = storeObj.value;
            }
            ttl = item.isLongTerm ? this.options.ttl : this.options.longTtl;
            item.expires = this._calculateExpiresDate(ttl);
            this._setStoreItem(key, item);
            this._setCacheItem(key, item);
        }
        return item.value;
    };
    /**
     * Set the value of a cache object, resetting the expire time.
     * @method
     * @param {String}  key          The cache key associated with the data.
     * @param {*}       value        The data to cache.
     * @param {Boolean} [isLongTerm] Optionally indicate storage mechanism.
     *                               Defaults to false(y) for sessionStorage.
     *                               Pass true to save to localStorage instead.
     */
    Fiji.prototype.set = function (key, value, isLongTerm) {
        // const now: Date = new Date();
        var item = this._getCacheItem(key) ||
            this._createNewItem(key, null, isLongTerm || false);
        var ttl;
        item.value = value;
        ttl = item.isLongTerm ? this.options.ttl : this.options.longTtl;
        item.expires = this._calculateExpiresDate(ttl);
        // Ensure we never save the same key to two different types of storage.
        // If a different isLongTerm option is passed, delete the existing
        // item from the current store mechanism before saving to the new one.
        if (item.isLongTerm !== !!isLongTerm) {
            this._delStoreItem(key);
            item.isLongTerm = isLongTerm;
        }
        this._setStoreItem(key, item);
        this._setCacheItem(key, item);
    };
    /**
     * Destroy a cache item by key everywhere. If null is passed as the key and
     * true is passed as the optional second argument, the cache is reset.
     * @method
     * @param {String}  key                The key of the cache item to delete.
     * @param {Boolean} [confirmDeleteAll] When a null key is provided, this
     *                                     optional param must be true to
     *                                     delete the cache data.
     */
    Fiji.prototype.del = function (key, confirmDeleteAll) {
        // Provide the means to wipe the whole slate clean if desired.
        if (!key && confirmDeleteAll) {
            sesSto.removeItem(this.options.ns);
            locSto.removeItem(this.options.ns);
            this.cache = null;
            this.cache = {};
            return;
        }
        // Important to delete store item first so that the storage mechanism, if any, can be determined
        this._delStoreItem(key);
        this._delCacheItem(key);
    };
    /**
     * Return an object of all key-value pairs in the cache.
     * @method
     * @return {Object}
     */
    Fiji.prototype.list = function () {
        var _this = this;
        var keys = Object.keys(this.cache);
        return keys.reduce(function (obj, key) {
            obj[key] = _this.get(key);
            return obj;
        }, {});
    };
    return Fiji;
})();

return Fiji;

}));
