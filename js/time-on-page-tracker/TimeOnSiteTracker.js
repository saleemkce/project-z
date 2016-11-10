/**
 * TimeOnSiteTracker.js
 *
 * Time on Site Tracker (TOS)
 * This file tracks time spent on page by user session.
 * It exposes getTimeOnPage() API which gives back time spent so far on page. Call any time to get current page's TOS
 * Provides suppport for blacklisting URL from tracking TOS
 * Measure your user's interaction with site directly and accurately.
 * 
 */

var TimeOnSiteTracker = function(config) {
    
    this.sitePageStart = new Date();
    this.pageEntryTime = (new Date()).toISOString();
    this.totalTimeSpent = 0;
    this.returnInSeconds = false;
    this.isTimeOnSiteAllowed = true;
    this.callback = null;
    this.timeSpentArr = [];
    this.trackHashBasedRouting = false;
    this.storeInLocalStorage = false;

    // TOS activity object
    this.activity = {};
    this.activity.activityStarted = false;

    this.config = config;
    console.log('Time at page entry: ' + this.sitePageStart);

    this.initialize(this.config);

};

TimeOnSiteTracker.prototype.initialize = function(config) {

    // bind to window close event
    this.bindWindowUnload();

    // bind to focus/blur window state
    this.bindWindowFocus();

    if(config && config.trackBy && (config.trackBy.toLowerCase() === 'seconds')) {
         this.returnInSeconds = true;
    }

    if(config && config.callback) {
        this.callback = config.callback;
    }

    this.initBlacklistUrlConfig(config);

    if(config && config.trackHashBasedRouting && (config.trackHashBasedRouting === true)) {
        this.trackHashBasedRouting = true;

        // bind to URL change event (without page refresh)
        this.bindURLChange();
    }

    if(config && config.storeInLocalStorage && (config.storeInLocalStorage === true) && (this.callback === null)) {
        this.storeInLocalStorage = true;
    }

    if(config && config.storeInLocalStorage && (config.storeInLocalStorage === true) && this.callback) {
        console.warn('Both callback and local storage options given. Give either one!');
    }
};

TimeOnSiteTracker.prototype.getTimeDiff = function(startTime, endTime) {
    var diff;
    diff = endTime - startTime;
    return diff;
};

TimeOnSiteTracker.prototype.addTimeSpent = function(a, b) {
    return a + b;
};

TimeOnSiteTracker.prototype.arrayAggregate = function(arr) {
    var sum = 0;
    for (var i = 0; i < arr.length; i++) {
        sum = sum +  arr[i];
    }

    return sum;
};

TimeOnSiteTracker.prototype.getTOSId = function() {
    return Math.floor(new Date().valueOf() * Math.random());
};

TimeOnSiteTracker.prototype.initBlacklistUrlConfig = function(config) {
    if(config && config.blacklistUrl) {

        if(!((config.blacklistUrl) instanceof Array)) {
            console.warn('blacklistUrl configuration must be of type array');
        }

        if(((config.blacklistUrl) instanceof Array) && (config.blacklistUrl).length) {
            if(!this.checkBlacklistUrl(config.blacklistUrl)) {
               this.isTimeOnSiteAllowed = false;
            }
        }
    }
};

// URL blacklisting from tracking in "Time on site"
TimeOnSiteTracker.prototype.checkBlacklistUrl = function(blacklistUrl) {
    var currentPage = document.URL;

    for(var i = 0; i < blacklistUrl.length; i++) {
        if(blacklistUrl[i] === currentPage) {
            return false;
        }
    }

    return true;
};

TimeOnSiteTracker.prototype.getTimeOnPage = function() {
    if(this.timeSpentArr.length) {
        this.totalTimeSpent =  this.arrayAggregate(this.timeSpentArr);
    }
    var currentTime = new Date(),
        newTimeSpent = 0;

    if(this.returnInSeconds) {
        newTimeSpent = this.totalTimeSpent + ((this.getTimeDiff(this.sitePageStart, currentTime))/1000);
    } else {
        newTimeSpent = this.totalTimeSpent + (this.getTimeDiff(this.sitePageStart, currentTime));
    }

    var page = {};
        page.TOSId = this.getTOSId();
        page.URL = document.URL;
        page.title = document.title;
        page.entryTime = this.pageEntryTime;
        page.currentTime = (new Date()).toISOString();
        page.timeOnPage = Math.round(newTimeSpent);
        page.timeOnPageTrackedBy = ((this.returnInSeconds === true) ? 'second' : 'millisecond');

    return page;
    
};

/**
 * [resetActivity It is used for both initializing and resetting activity varibales]
 */
TimeOnSiteTracker.prototype.resetActivity = function() {
    this.activity.startTime = new Date();
    this.activity.totalTimeSpent = 0;
    this.activity.totalTimeSpentArr = [];
};

TimeOnSiteTracker.prototype.startActivity = function(activityDetails) {
    if(activityDetails && Object.keys(activityDetails).length) {
        this.activityDetails = activityDetails;
    }
    //this.activity.startTime = new Date();
    this.activity.activityStarted = true;
    this.resetActivity();
    console.log('activity started at : ' + this.activity.startTime)
};

TimeOnSiteTracker.prototype.endActivity = function() {
    var page = {};

    if(this.activity.activityStarted) {console.log(this.activity.startTime);
        var endActivityTime = new Date(),
            activityDuration = 0;

        if((this.activity.totalTimeSpentArr).length) {
            this.activity.totalTimeSpent =  this.arrayAggregate(this.activity.totalTimeSpentArr);
        }

        if(this.returnInSeconds) {
            activityDuration = this.activity.totalTimeSpent + ((this.getTimeDiff(this.activity.startTime, endActivityTime))/1000);
        } else {
            activityDuration = this.activity.totalTimeSpent + this.getTimeDiff(this.activity.startTime, endActivityTime);
        }console.log('totalSpent : ' + this.activity.totalTimeSpent + ' in array: '+ ((this.getTimeDiff(this.activity.startTime, endActivityTime))/1000));
        
        page.TOSId = this.getTOSId();
        page.URL = document.URL;
        page.title = document.title;
        page.activityStart = (this.activity.startTime).toISOString();
        page.activityEnd = (new Date()).toISOString();
        page.activityDuration = Math.round(activityDuration);
        page.activityDurationTrackedBy = ((this.returnInSeconds === true) ? 'second' : 'millisecond');

        // set activity details in response if given during activity initialization
        for(var key in this.activityDetails) {
            page[key] = this.activityDetails[key]
        }

        this.activity.activityStarted = false;
        this.resetActivity();
        console.log('activity ends at ' + new Date());

    } else {
        console.warn('Please start activity before finishing it!');
    }

    return page;
};

TimeOnSiteTracker.prototype.bindURLChange = function() {
    var self = this;
    window.onhashchange = function() {
        alert('URL changes!!!');
        self.processTOSData();
        self.initBlacklistUrlConfig(self.config);
    }
};

// save time on site data to Local storage.
TimeOnSiteTracker.prototype.saveToLocalStorage = function() {

    if (typeof(Storage) !== 'undefined') {

        var dateObj = (new Date()),
            currentDayKey = 'TOS_' + (dateObj.getMonth() + 1) + '_' + dateObj.getDate() + '_' + dateObj.getFullYear(),
            data = this.getTimeOnPage(),
            keyFound = false,
            keyName = 'TimeOnSiteDateKeys',
            keyArr;
        
        keyArr = localStorage.getItem(keyName);
        if(keyArr) {
            var dateKeys = JSON.parse(keyArr);
            
            for(var j = 0; j < dateKeys.length; j++) {
                if(dateKeys[j].indexOf(currentDayKey) > -1) {
                    keyFound = true;
                    break; 
                }
            }

            if(!keyFound) {
                dateKeys.push(currentDayKey);
                localStorage.setItem(keyName, JSON.stringify(dateKeys));
            }
        } else {
            keyArr = [];
            keyArr.push(currentDayKey); 
            localStorage.setItem(keyName, JSON.stringify(keyArr));
        }


        var item = localStorage.getItem(currentDayKey);
        if(item) {
            //console.log('TOS available!');
            var oldItem = JSON.parse(item);
            oldItem.push(data)
            //console.log(oldItem);
            localStorage.setItem(currentDayKey, JSON.stringify(oldItem));
        } else {
            //console.log('new TOS added!');
            var dataArr = [];
            dataArr.push(data);
            localStorage.setItem(currentDayKey, JSON.stringify(dataArr));
        }
    }
};

TimeOnSiteTracker.prototype.bindWindowFocus = function() {
    var self = this;

    // check the visiblility of the page
    var hidden, visibilityState, visibilityChange;

    if (typeof document.hidden !== 'undefined') {
        hidden = 'hidden', visibilityChange = 'visibilitychange',
        visibilityState = 'visibilityState';
    }
    else if (typeof document.mozHidden !== 'undefined') {
        hidden = 'mozHidden', visibilityChange = 'mozvisibilitychange',
        visibilityState = 'mozVisibilityState';
    }
    else if (typeof document.msHidden !== 'undefined') {
        hidden = 'msHidden', visibilityChange = 'msvisibilitychange',
        visibilityState = 'msVisibilityState';
    }
    else if (typeof document.webkitHidden !== 'undefined') {
        hidden = 'webkitHidden', visibilityChange = 'webkitvisibilitychange',
        visibilityState = 'webkitVisibilityState';
    }

    if (typeof document.addEventListener === 'undefined' || typeof hidden === 'undefined') {
        // not supported
        console.log('Browser unsupported!');
    }
    else {
        document.addEventListener(visibilityChange, function() {
            if(document[visibilityState] == 'visible') {
                console.log('on visible');
                self.sitePageStart = new Date();
                self.totalTimeSpent = self.arrayAggregate(self.timeSpentArr);
                console.log('Time spent on site so far : ' + self.totalTimeSpent);

                // compute time duratation for activity if it was started.
                if(self.activity.activityStarted) {
                    self.activity.startTime = new Date();
                    self.activity.totalTimeSpent = self.arrayAggregate(self.activity.totalTimeSpentArr);
                    console.log('Time spent on ACTIVITY so far : ' + self.activity.totalTimeSpent);
                }

            } else if(document[visibilityState] == 'hidden') {
                console.log('on Invisible');
                var currentTime = new Date();
                console.log(self.timeSpentArr);
                if(self.returnInSeconds) {
                    (self.timeSpentArr).push(((self.getTimeDiff(self.sitePageStart, currentTime))/1000));
                } else {
                    (self.timeSpentArr).push(self.getTimeDiff(self.sitePageStart, currentTime));
                }

                // compute time duratation for activity if it was started.
                if(self.activity.activityStarted) {
                    console.log(self.activity.totalTimeSpentArr);
                    if(self.returnInSeconds) {
                        (self.activity.totalTimeSpentArr).push(((self.getTimeDiff(self.activity.startTime, currentTime))/1000));
                    } else {
                        (self.activity.totalTimeSpentArr).push(self.getTimeDiff(self.activity.startTime, currentTime));
                    }
                }
                
            }

        }, false);
    }

};

/**
 * [bindWindowUnload]
 *
 * A cross browser solution for window unload event.
 * 
 */
TimeOnSiteTracker.prototype.bindWindowUnload = function() {
    var self = this,
        windowAttachEventListener = window.attachEvent || window.addEventListener;
        unloadEvent = window.attachEvent ? 'onbeforeunload' : 'beforeunload'; // make IE7, IE8 compitable

    windowAttachEventListener(unloadEvent, function(event) { // For >=IE7, Chrome, Firefox
        var message = 'Important: Please click on \'Save\' button to leave this page.';
        if (typeof event == 'undefied') {
            event = window.event;
        }
        if (event) {event.returnValue = message;

            self.processTOSData();

        }
        return message;
    });

};

TimeOnSiteTracker.prototype.processTOSData = function() {

    if(this.timeSpentArr.length) {
        this.totalTimeSpent = this.arrayAggregate(this.timeSpentArr);
        console.log('time so far : ' + this.totalTimeSpent);
    }

    console.log('Time at page exit: ' + new Date());
    /**
     * execute callback if given in config
     */
    if(typeof this.callback === 'function') {
        var data = this.getTimeOnPage();
        data.exitTime = (new Date()).toISOString();
        if(this.isTimeOnSiteAllowed) {
            this.callback(data);
        } else {
            data = {};
            this.callback(data);
        }
        
    } else if(this.isTimeOnSiteAllowed && this.storeInLocalStorage) {
        this.saveToLocalStorage();
    }

    // Initialize variables on URL change.
    this.sitePageStart = new Date(),
    this.pageEntryTime = (new Date()).toISOString(),
    this.totalTimeSpent = 0,
    this.timeSpentArr = [];

    //Reset activity variables
    if(this.activity.activityStarted) {
        this.activity.activityStarted = false;
        this.resetActivity();
    }
};
