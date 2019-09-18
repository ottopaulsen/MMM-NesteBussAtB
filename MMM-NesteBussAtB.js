
Module.register("MMM-NesteBussAtB", {
    // Default module config
    defaults: {
        showIcon: true,
        showNumber: true,
        showFrom: true,
        showTo: true,
        showMin: true,
        size: "medium",
        stopIds: [16011496, 16010496],
        maxCount: 2, // Max number of next buses per route
        maxMinutes: 45, // Do not show buses more then this minutes into the future
        stacked: true, // Show multiple buses on same row, if same route and destination
        showMonitored: false, //Write ca in front of mintues if bus isn't monitored (if not stacked)
        showTimeLimit: 45 //Show time of departure instead of minutes, if more than this limit until departure
    },

    start: function () {
        console.log(this.name + ' started.')
        this.buses = [];
        this.openBusConnection();
        var self = this;
        setInterval(function () {
            self.updateDom(0);
        }, 10000);
    },

    openBusConnection: function () {
        console.log('Sending NESTEBUSSATB_CONFIG with config: ', this.config);
        this.sendSocketNotification('NESTEBUSSATB_CONFIG', this.config);
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification == 'BUS_DATA') {
            if (payload != null) {
                this.buses = this.config.stacked ? this.stackBuses(payload) : payload;
                this.updateDom();
            } else {
                console.log(this.name + ': BUS_DATA - No payload');
            }
        }
    },

    stackBuses: function (buses) {
        stackedBuses = [];

        buses.sort(function (a, b) {
            // return (self.toDate(a.time) - self.toDate(b.time));
            return ('' + a.from + a.number + a.to + a.time).localeCompare('' + b.from + b.number + b.to + b.time);
        });

        var len = buses.length;
        var previousStackvalue = '';
        var stackedTimes = [];
        if (len > 0) {
            previousStackvalue = '' + buses[0].from + buses[0].number + buses[0].to;
            stackedTimes.push(buses[0].time);
            for (var i = 1; i < len; i++) {
                stackvalue = '' + buses[i].from + buses[i].number + buses[i].to;
                if (stackvalue == previousStackvalue) {
                    stackedTimes.push(buses[i].time);
                } else {
                    stackedBuses.push({
                        from: buses[i - 1].from,
                        number: buses[i - 1].number,
                        to: buses[i - 1].to,
                        times: stackedTimes
                    });
                    previousStackvalue = stackvalue;
                    stackedTimes = [];
                    stackedTimes.push(buses[i].time)
                }
            }
            stackedBuses.push({
                from: buses[len - 1].from,
                number: buses[len - 1].number,
                to: buses[len - 1].to,
                times: stackedTimes
            });
        }
        return stackedBuses;
    },

    getStyles: function () {
        return [
            'NesteBussAtB.css'
        ];
    },

    getDom: function () {
        self = this;
        var wrapper = document.createElement("table");
        wrapper.className = "medium";
        var first = true;

        if (self.buses.length === 0) {
            wrapper.innerHTML = (self.loaded) ? self.translate("EMPTY") : self.translate("LOADING");
            wrapper.className = "medium dimmed";
            console.log(self.name + ': No buses');
            return wrapper;
        }

        self.buses.forEach(function (bus) {
            var now = new Date();
            var minutes = '';
            if(self.config.stacked) {
                if(bus.times.length > 0) {
                    var busTime = self.toDate(bus.times[0]);
                    minutes = Math.round((busTime - now) / 60000);
                }
                for(var i=1; i < bus.times.length; i++){
                    var busTime = self.toDate(bus.times[i]);
                    minutes += ', ' + Math.round((busTime - now) / 60000);
                }
                minutes += " min";
            } else {
                var busTime = self.toDate(bus.time);
                minutes = Math.round((busTime - now) / 60000);
                if(minutes > self.config.showTimeLimit){
                    minutes = busTime.getHours() + ':' + (busTime.getMinutes() < 10 ? '0' : '') + busTime.getMinutes();
                }else if (self.config.showMin) {
                    minutes += " min";
                }
                if (self.config.showMonitored && !bus.monitored) {
                    minutes = 'ca ' + minutes;
                }
            }

            var busWrapper = document.createElement("tr");
            busWrapper.className = 'border_bottom ' + self.config.size + (first ? ' border_top' : '');
            first = false; // Top border only on the first row

            // Icon
            if (self.config.showIcon) {
                var iconWrapper = document.createElement("td");
                iconWrapper.innerHTML = '<i class="fa fa-bus" aria-hidden="true"></i>';
                iconWrapper.className = "align-right";
                busWrapper.appendChild(iconWrapper);
            }

            // Rute
            if (self.config.showNumber) {
                var numberWrapper = document.createElement("td");
                numberWrapper.innerHTML = bus.number;
                numberWrapper.className = "atb-number";
                busWrapper.appendChild(numberWrapper);
            }

            // Holdeplass
            if (self.config.showFrom) {
                var fromWrapper = document.createElement("td");
                fromWrapper.innerHTML = bus.from;
                fromWrapper.className = "align-left atb-from";
                busWrapper.appendChild(fromWrapper);
            }

            // Destinasjon
            if (self.config.showTo) {
                var toWrapper = document.createElement("td");
                toWrapper.className = "align-left atb-to";
                toWrapper.innerHTML = bus.to;
                busWrapper.appendChild(toWrapper);
            }

            // Minutter
            var minutesWrapper = document.createElement("td");
            minutesWrapper.className = "align-right atb-minutes";
            minutesWrapper.innerHTML = minutes;
            busWrapper.appendChild(minutesWrapper);

            wrapper.appendChild(busWrapper);
        });
        return wrapper;
    },

    toDate: function (s) {
        // Translate the API date to Date object
        year = s.substring(0, 4);
        month = parseInt(s.substring(5, 7)) - 1;
        day = s.substring(8, 10);
        hour = s.substring(11, 13);
        minute = s.substring(14, 16);
        time = new Date(year, month, day, hour, minute, 0, 0);
        return time;
    }
});