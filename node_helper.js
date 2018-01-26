var NodeHelper = require("node_helper");
var request = require('request');
// var moment = require('moment');
var buses = [];
var requestCount = 0;
// var baseUrl = 'http://bybussen.api.tmn.io/rt/';
var baseUrl = 'http://bartebuss.no/api/unified/';

module.exports = NodeHelper.create({

	start: function() {
		console.log('Starting node helper for: ' + this.name);
        this.loaded = false;
        self = this;
        setInterval(function() {
            self.readBuses();
            setTimeout(function(){
                self.broadcastMessage();
            }, 4000);
        }, 30000);	
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
            }, 4000);
		}
	},

    readBuses: function() {
        if (this.loaded){
            console.log('Reading bus data');
            self = this;
            stops = self.config.stopIds;
            if (!requestCount) buses = [];
            requestCount = stops.length;
            stops.forEach(function(stopId){
                console.log('Bus stop: ' + stopId);
                url = baseUrl + stopId;
                request(url, function(error, response, body){
                    if(!error){
                        var data = JSON.parse(body);
                        console.log('Bus stop: ' + data.name);
                        if(data.name){
                            for(i in data.schedule){
                                var bus = data.schedule[i];
                                for(i = 0; i < self.config.maxCount; i++){
                                    if(bus.departures[i]){
                                        var minutes = Math.round((self.toDate(bus.departures[i].t) - (new Date())) / 60000);
                                        console.log('Pushing minutes = ' + minutes + ', maxMinutes = ' + self.config.maxMinutes);
                                        if(minutes <= self.config.maxMinutes){
                                            buses.push({
                                                number: bus.line,
                                                from: data.name,
                                                to: bus.destination,
                                                time: bus.departures[i].t
                                            });
                                        }
                                    }
                                }
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
        year = s.substring(0, 4);
        month = parseInt(s.substring(5, 7)) - 1;
        day = s.substring(8, 10);
        hour = s.substring(11, 13);
        minute = s.substring(14, 16);
        time = new Date(year, month, day, hour, minute, 0, 0);
        return time;
    }
});