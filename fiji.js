(function (window, document, undefined) {
    "use strict";

    var _cache;
    var _local = window.localStorage;
    var _session = window.sessionStorage;

    /**
     * Validate a well-formed cache/storage object (used internally).
     * @function
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
     * Creates a new Fiji object
     * @class Fiji
     * @param {Object} [options]
     */
    var Fiji = function Fiji(options) {
        var _options = options;
        if (!_options) {
            _options = {};
        }

        // Ensure this was called with the 'new' keyword
        if (!(this instanceof Fiji)) {
            return new Fiji(options);
        }

        if (_cache) {
            console.warn('There can only be one Fiji cache');
            return this;
        }

        _cache = {};

        /** @member {Number} */
        this.ttl = _options.ttl || 1000*60*60*24;

        /** @member {Number} */
        this.longTtl = _options.longTtl || 1000*60*60*24*30;

        /** @member {String} */
        this.ns = _options.ns || 'Fiji';

        if (_options.debug) {
            console.log('Cleaning localStorage and sessionStorage (for testing only)');
            _local.removeItem(this.ns);
            _session.removeItem(this.ns);
        }
    };

    /**
     * Add a TTL value to a date and return a new date to use as expiry value.
     * @private
     * @param {Number} [ttl]
     * @param {Date} [now]
     * @returns {Date}
     */
    Fiji.prototype._calculateExpiresDate = function _getNewExpiresDate(ttl, now) {
        var _now = (typeof now === 'object' && now.toDateString) ? now : new Date();
        var _ttl = ttl || this.ttl;
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
    Fiji.prototype._createNewItem = function _createNewItem(key, value, isLongTerm) {
        var _value = (typeof value === 'undefined') ? null : value;
        var _isLongTerm = !!isLongTerm;
        return {
            id: key,
            value: _value,
            expires: this._calculateExpiresDate((isLongTerm ? this.ttl : this.longTtl)),
            isLongTerm: _isLongTerm
        };
    };

    /**
     * @private
     * @param {String} key
     * @returns {Object}
     */
    Fiji.prototype._getCacheItem = function _getCacheItem(key) {
        if (!key) {
            console.warn('Please provide a key');
            return;
        }

        var item = _cache[key];
        return validateItem(item) ? item : null;
    };

    /**
     * @private
     * @param {Object} item
     */
    Fiji.prototype._setCacheItem = function _setCacheItem(item) {
        if (!validateItem(item)) {
            console.warn('Item was not set or properly formed: ', item);
            return;
        }

        _cache[item.id] = item;
    };

    /**
     * @private
     * @param {String} key
     */
    Fiji.prototype._deleteCacheItem = function _deleteCacheItem(key) {
        if (!key) {
            console.warn('Please provide a key');
            return;
        }

        if (typeof _cache[key] !== 'undefined') {
            _cache[key] = null;
            delete _cache[key];
        }
    };

    /**
     * @private
     * @param {String} key
     * @returns {Object}
     */
    Fiji.prototype._getStoreItem = function _getStoreItem(key) {
        if (!key) {
            console.warn('Please provide a key');
            return;
        }

        var item = _cache[key];

        // default to session storage
        var storeMechanism = (validateItem(item) && item.isLongTerm) ? _local : _session;
        var storeObj = JSON.parse(storeMechanism.getItem(this.ns));

        if (!storeObj) {
            return null;
        }

        item = (typeof storeObj[key] === 'undefined') ? null : storeObj[key];

        return item;
    };

    /**
     * @private
     * @param {Object} item
     */
    Fiji.prototype._setStoreItem = function _setStoreItem(item) {
        if (!validateItem(item)) {
            console.warn('Item was not set or properly formed: ', item);
            return;
        }

        var storeMechanism = item.isLongTerm ? _local : _session;
        var storeObj = JSON.parse(storeMechanism.getItem(this.ns));

        if (!storeObj) {
            storeObj = {};
        }
        storeObj[item.id] = item;

        storeMechanism.setItem(this.ns, JSON.stringify(storeObj));
    };

    /**
     * @private
     * @param {String} key
     */
    Fiji.prototype._deleteStoreItem = function _deleteStoreItem(key) {
        if (!key) {
            console.warn('Please provide a key');
            return;
        }

        var item = _cache[key];

        if (!validateItem(item)) {
            console.warn('Item was not set or properly formed: ', item);
            return;
        }

        var storeMechanism = item.isLongTerm ? _local : _session;
        var storeObj = JSON.parse(storeMechanism.getItem(this.ns));

        storeObj[item.id] = null;
        delete storeObj[item.id];

        storeMechanism.setItem(this.ns, JSON.stringify(storeObj));
    };

    /**
     * @private
     * @param {Object} item
     * @returns {Boolean}
     */
    Fiji.prototype._isExpired = function _isExpired(item) {
        if (!item) {
            console.warn('Please provide an item');
            return;
        }

        var now = new Date();

        return new Date(item.expires.valueOf()) < now;
    };

    /**
     * @method
     * @param {String} key
     * @returns {*}
     */
    Fiji.prototype.get = function get(key) {
        var now = new Date();
        var storeObj;
        var item = this._getCacheItem(key);

        if (!item) {

            // prime cache
            storeObj = this._getStoreItem(key);
            if (!storeObj) {
                storeObj = this._createNewItem(key, null);
            }
            this._setCacheItem(storeObj);
            item = this._getCacheItem(key);

            console.log('Initialized new cache item because blank "' + key + '"');
            console.table(_cache);

        } else if (this._isExpired(item)) {

            // refresh expired cached item from storage
            storeObj = this._getStoreItem(key);
            if (validateItem(storeObj)) {
                item.value = storeObj.value;
            }
            item.expires = this._calculateExpiresDate((item.isLongTerm ? this.ttl : this.longTtl));
            this._setStoreItem(item);
            this._setCacheItem(item);

            console.log('Updated cache item because expired "' + key + '" (' + item.value + ')');
            console.table(_cache);

        } else {

            console.log('No cache init or update required, our data is still fresh.');
            console.table(_cache);

        }

        console.log('It is now ' + now.toString() + ' and _cache[' + key + '] expires at ', item.expires.toString());

        return item.value;
    };

    /**
     * @method
     * @param {String} key
     * @param {*} value
     * @param {Boolean} [isLongTerm]
     */
    Fiji.prototype.set = function set(key, value, isLongTerm) {
        var now = new Date();
        var item = this._getCacheItem(key);

        if (!item) {

            item = this._createNewItem(key, value, isLongTerm);
            console.log('Initialized new cache item because blank "' + key + '"');
            console.table(_cache);

        } else {

            item.value = value;
            item.expires = this._calculateExpiresDate((isLongTerm ? this.ttl : this.longTtl));
            console.log('Updated existing cache item "' + key + '" (' + value + ') : ' + now.toString());
            console.table(_cache);

        }

        // Ensure we never save the same key to two different types of storage.
        // If a different isLongTerm option is passed, delete the existing storage item.
        if (item.isLongTerm !== !!isLongTerm) {
            this._deleteStoreItem(key);
            item.isLongTerm = isLongTerm;
        }

        this._setStoreItem(item);
        this._setCacheItem(item);
    };

    /**
     * @method
     * @param {String} key
     * @param {Boolean} [confirmDeleteAll]
     */
    Fiji.prototype.del = function del(key, confirmDeleteAll) {
        // Provide the means to wipe the whole slate clean if desired.
        if (!key && confirmDeleteAll) {
            _session.removeItem(this.ns);
            _local.removeItem(this.ns);
            _cache = null;
            _cache = {};
            console.log('Nuked the Fiji, kaboom!');
            return;
        }

        // Important to delete store item first so that the storage mechanism, if any, can be determined
        this._deleteStoreItem(key)
        this._deleteCacheItem(key)
    };

    return window.Fiji = Fiji;

}(this, this.document));
