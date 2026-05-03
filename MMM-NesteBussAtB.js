
Module.register("MMM-NesteBussAtB", {
    // Default module config
    defaults: {
        showIcon: true,
        showNumber: true,
        showFrom: true,
        showTo: true,
        showMin: true,
        size: "medium",
        stopIds: [43243, 42915],
        maxCount: 2, // Max number of next buses per route
        maxMinutes: 45, // Do not show buses more then this minutes into the future
        stacked: true, // Show multiple buses on same row, if same route and destination
        showMonitored: false, //Write ca in front of mintues if bus isn't monitored (if not stacked)
        showTimeLimit: 45, //Show time of departure instead of minutes, if more than this limit until departure
        lineFilter: [], // Only show these line numbers, e.g. ["1", "22"]. Empty = show all.
        destinationFilter: [], // Only show destinations starting with these strings, e.g. ["Ranheim", "Kattem"]. Empty = show all.
        delayDisplay: [] // Color the minutes by delay, e.g. [{minutes: 2, color: "orange"}, {minutes: 5, color: "red"}]
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
            return ('' + a.from + a.number + a.to + a.time).localeCompare('' + b.from + b.number + b.to + b.time);
        });

        var len = buses.length;
        var previousStackvalue = '';
        var stackedTimes = [];
        var groupStart = 0;
        if (len > 0) {
            previousStackvalue = '' + buses[0].from + buses[0].number + buses[0].to;
            stackedTimes.push({ time: buses[0].time, delay: buses[0].delay });
            for (var i = 1; i < len; i++) {
                stackvalue = '' + buses[i].from + buses[i].number + buses[i].to;
                if (stackvalue == previousStackvalue) {
                    stackedTimes.push({ time: buses[i].time, delay: buses[i].delay });
                } else {
                    stackedBuses.push({
                        from: buses[groupStart].from,
                        number: buses[groupStart].number,
                        to: buses[groupStart].to,
                        times: stackedTimes,
                        monitored: buses[groupStart].monitored,
                        delay: buses[groupStart].delay
                    });
                    groupStart = i;
                    previousStackvalue = stackvalue;
                    stackedTimes = [];
                    stackedTimes.push({ time: buses[i].time, delay: buses[i].delay })
                }
            }
            stackedBuses.push({
                from: buses[groupStart].from,
                number: buses[groupStart].number,
                to: buses[groupStart].to,
                times: stackedTimes,
                monitored: buses[groupStart].monitored,
                delay: buses[groupStart].delay
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
                var parts = bus.times.map(function(entry) {
                    var busTime = self.toDate(entry.time);
                    var mins = Math.round((busTime - now) / 60000);
                    var color = self.getDelayColor(entry.delay || 0);
                    return color
                        ? '<span style="color:' + color + '">' + mins + '</span>'
                        : '' + mins;
                });
                minutes = parts.join(', ') + ' min';
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
                var realtimeClass = bus.monitored ? "atb-realtime" : "atb-not-realtime";
                iconWrapper.innerHTML = '<i class="fa fa-bus ' + realtimeClass + '" aria-hidden="true"></i>';
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
            if (!self.config.stacked) {
                var delayColor = self.getDelayColor(bus.delay || 0);
                if (delayColor) {
                    minutesWrapper.style.color = delayColor;
                }
            }
            busWrapper.appendChild(minutesWrapper);

            wrapper.appendChild(busWrapper);
        });
        return wrapper;
    },

    getDelayColor: function (delay) {
        var color = null;
        var highest = -1;
        (this.config.delayDisplay || []).forEach(function (entry) {
            if (delay >= entry.minutes && entry.minutes > highest) {
                highest = entry.minutes;
                color = entry.color;
            }
        });
        return color;
    },

    toDate: function (s) {
        return new Date(s);
    }
});