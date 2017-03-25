var NodeHelper = require("node_helper");
var request = require('request');
// var moment = require('moment');
var buses = [];
var requestCount = 0;
var baseUrl = 'http://bybussen.api.tmn.io/rt/';

module.exports = NodeHelper.create({

	start: function() {
		console.log('Starting node helper for: ' + this.name);
        this.loaded = false;
        self = this;
        setInterval(function() {
            self.readBuses();
            setTimeout(function(){
                self.broadcastMessage();
            }, 2000);
        }, 10000);	
    },

	socketNotificationReceived: function(notification, payload) {
		if (notification === 'SET_CONFIG') {
            this.config = payload;
            this.loaded = true;
            console.log(this.name + ': Connection started');

            // Read it immediately once
            self.readBuses();
            setTimeout(function(){
                self.broadcastMessage();
            }, 2000);
		}
	},

    readBuses: function() {
        if (this.loaded){
            // console.log('Reading bus data');
            self = this;
            stops = self.config.stopIds;
            if (!requestCount) buses = [];
            requestCount = stops.length;
            stops.forEach(function(stopId){
                // console.log('Bus stop: ' + stopId);
                url = baseUrl + stopId;
                request(url, function(error, response, body){
                    if(!error){
                        var data = JSON.parse(body);
                        var routes = new Map();
                        // console.log('Bus stop: ' + data.name);
                        for(i = 0; i < data.next.length; i++){
                            var bus = data.next[i];
                            var key = bus.l + bus.d;
                            var routeCount = routes.has(key) ? routes.get(key) : 0; 
                            var minutes = Math.round((self.toDate(bus.t) - (new Date())) / 60000);
                            if(routeCount < self.config.maxCount && minutes <= self.config.maxMinutes){
                                routeCount++;
                                routes.set(key, routeCount);
                                buses.push({
                                    number: bus.l,
                                    from: data.name,
                                    to: bus.d,
                                    time: bus.t
                                });
                                // console.log('Bus nr. ' + bus.l + ' til ' + bus.d + ' går kl. ' + bus.t);
                            }
                        }
                    } else {
                        console.log(self.name + ': Request error: ' + error);
                    }
                    requestCount--;
                });
            });
        }
    },

	broadcastMessage: function() {
        // console.log('broadcastMessage with ' + buses.length + ' buses');
        self = this;
        buses.sort(function(a, b){
            return (self.toDate(a.time) - self.toDate(b.time));
        });
		this.sendSocketNotification('BUS_DATA', buses);
	},

toDate: function(s){
        year = s.substring(6, 10);
        month = parseInt(s.substring(3, 5)) - 1;
        day = s.substring(0, 2);
        hour = s.substring(11, 13);
        minute = s.substring(14, 16);
        time = new Date(year, month, day, hour, minute, 0, 0);
        return time;
    }
});