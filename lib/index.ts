'use strict';

const locSto:IStorage = localStorage;
const sesSto:IStorage = sessionStorage;

const DEFAULT_TTL = 1000 * 60 * 60 * 24;      // a day
const DEFAULT_LONG_TTL = DEFAULT_TTL * 30;    // a month
const DEFAULT_NS = 'Fiji';

const isDefined = function isDefined(obj) {
    return typeof obj !== 'undefined';
};

interface IStorage {
    getItem(key: string): string;
    setItem(key: string, value?: string): void;
    removeItem(key: string): void;
}

interface IFijiOptions {
    ttl?: number;
    longTtl?: number;
    ns?: string;
}

interface IFijiStatic {
    new (options?: IFijiOptions);
}

interface IFiji {
    get(key: string): string | void;
    set(key: string, value: string | void, isLongTerm?: boolean): void;
    del(key: string, confirmDeleteAll?: boolean): void;
    list(): Object;
}

interface IItem {
    id: string;
    value: string | void;
    expires: Date;
    isLongTerm: boolean;
}

interface IItemFactory {
    (key: string, value: string | void, isLongTerm?: boolean): IItem;
}

interface IGetItem {
    (key: string): IItem;
}

interface IGetItemValue {
    (key: string): string;
}

interface ISetItem {
    (key: string, value: IItem | string, isLongTerm?): void;
}

interface IDelItem {
    (key: string, confirmDeleteAll?: boolean): void;
}

/**
 * Creates a new Fiji object
 * @class Fiji
 * @param {Object} [options]
 */
class Fiji implements IFiji {
    private cache:Object;
    private options:IFijiOptions;

    constructor(options?: IFijiOptions) {
        /** @private {Object} */
        this.cache = {};

        /** @private {Object} */
        this.options = <IFijiOptions>{
            ttl:     (options && isDefined(options.ttl))     ? options.ttl     : DEFAULT_TTL,
            longTtl: (options && isDefined(options.longTtl)) ? options.longTtl : DEFAULT_LONG_TTL,
            ns:      (options && isDefined(options.ns))      ? options.ns      : DEFAULT_NS
        };
    }

    /**
     * Add a TTL value to a date and return a new date to use as expiry value.
     * @private
     * @param {Number} [ttl]
     * @param {Date} [now]
     * @returns {Date}
     */
    private _calculateExpiresDate(ttl: number, now?: Date) {
        const _now: Date = (typeof now === 'object' && now.toDateString) ? now : new Date();
        const _ttl: number = ttl || this.options.ttl;
        return new Date(_now.valueOf() + _ttl);
    }

    /**
     * Create a new well-formed cache/storage object (used internally).
     * @private
     * @param {String} key
     * @param {*} value
     * @param {Boolean} [isLongTerm]
     * @returns {Object}
     */
    private _createNewItem <IItemFactory> (key: string, value: string | void, isLongTerm?: boolean) {
        const ttl = isLongTerm ? this.options.ttl : this.options.longTtl;
        const expires = this._calculateExpiresDate(ttl);
        return <IItem>{
            id: key,
            value: value || null,
            expires: expires || null,
            isLongTerm: isLongTerm || false
        };
    }

    /**
     * Retrieve a value from the cache by the given key. If the resulting output is not a valid cache object, return null.
     * @private
     * @param {String} key
     * @returns {Object}
     */
    private _getCacheItem <IGetItemFunc> (key: string) {
        return this.cache[key] || null;
    }

    /**
     * Update the cache with the given cache item.
     * @private
     * @param {Object} item
     */
    private _setCacheItem <ISetItem> (key: string, item: IItem) {
        this.cache[key] = item;
    }

    /**
     * Remove an item from the cache by the given key.
     * @private
     * @param {String} key
     */
    private _delCacheItem <IDelItem> (key: string) {
        if (isDefined(this.cache[key])) {
            this.cache[key] = null;
            delete this.cache[key];
        }
    }

    /**
     * Retrieve a cache object from storage by the given key.
     * @private
     * @param {String} key
     * @returns {Object}
     */
    private _getStoreItem <IGetItemFunc> (key: string) {
        // default to session storage
        const storeMechanism = (isDefined(this.cache[key]) && this.cache[key].isLongTerm) ? locSto : sesSto;
        const storeObj: Object = JSON.parse(storeMechanism.getItem(this.options.ns)) || {};

        return storeObj[key] || null;
    }

    /**
     * Atomically update storage with the given cache item.
     * @private
     * @param {Object} item
     */
    private _setStoreItem <ISetItem> (key: string, item: IItem) {
        const storeMechanism = item.isLongTerm ? locSto : sesSto;
        let storeObj: Object = JSON.parse(storeMechanism.getItem(this.options.ns)) || {};

        storeObj[key] = item;

        storeMechanism.setItem(this.options.ns, JSON.stringify(storeObj));
    }

    /**
     * Remove an item from storage by the given key.
     * @private
     * @param {String} key
     */
    private _delStoreItem <IDelItem> (key: string) {
        const storeMechanism = (isDefined(this.cache[key]) && this.cache[key].isLongTerm) ? locSto : sesSto;
        let storeObj: Object = JSON.parse(storeMechanism.getItem(this.options.ns)) || {};

        if (storeObj[key]) {
            storeObj[key] = null;
            delete storeObj[key];
            storeMechanism.setItem(this.options.ns, JSON.stringify(storeObj));
        }
    }

    /**
     * Determine whether a cache item is expired.
     * @private
     * @param {Object} item
     * @returns {Boolean}
     */
    private _isExpired(item: IItem) {
        const now = new Date();
        return new Date(item.expires.valueOf()) < now;
    }

    /**
     * Return the value of a cache object with the given key as an ID.
     * @method
     * @param {String} key
     * @returns {*}
     */
    get <IGetItemValue> (key: string) {
        // const now = new Date();
        let item = this._getCacheItem(key);
        let storeObj;
        let ttl;

        if (!item) {
            // prime cache
            storeObj = this._getStoreItem(key);
            if (!storeObj) {
                storeObj = this._createNewItem(key, null);
            }
            this._setCacheItem(key, storeObj);
            item = this._getCacheItem(key);
        } else if (this._isExpired(item)) {
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
    }

    /**
     * Set the value of a cache object, resetting the expire time.
     * @method
     * @param {String}  key          The cache key associated with the data.
     * @param {*}       value        The data to cache.
     * @param {Boolean} [isLongTerm] Optionally indicate storage mechanism.
     *                               Defaults to false(y) for sessionStorage.
     *                               Pass true to save to localStorage instead.
     */
    set <ISetItem> (key: string, value: string, isLongTerm?: boolean) {
        // const now: Date = new Date();
        let item: IItem = this._getCacheItem(key) ||
                          this._createNewItem(key, null, isLongTerm || false);
        let ttl: number;

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
    }

    /**
     * Destroy a cache item by key everywhere. If null is passed as the key and
     * true is passed as the optional second argument, the cache is reset.
     * @method
     * @param {String}  key                The key of the cache item to delete.
     * @param {Boolean} [confirmDeleteAll] When a null key is provided, this
     *                                     optional param must be true to
     *                                     delete the cache data.
     */
    del <IDelItem> (key: string, confirmDeleteAll?: boolean) {
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
    }

    /**
     * Return an object of all key-value pairs in the cache.
     * @method
     * @return {Object}
     */
    list() {
        const keys = Object.keys(this.cache);
        return keys.reduce((obj, key) => {
            obj[key] = this.get(key);
            return obj;
        }, {});
    }
}
