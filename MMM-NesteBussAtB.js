
Module.register("MMM-NesteBussAtB",{
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
        maxMinutes: 45 // Do not show buses more then this minutes into the future
    },

	start: function() {
        console.log(this.name + ' started.')
		this.buses = [];
		this.openBusConnection();
        var self = this;
        setInterval(function() {
            self.updateDom(1000);
        }, 10000);
	},

	openBusConnection: function() { 
		this.sendSocketNotification('SET_CONFIG', this.config);
	},

	socketNotificationReceived: function(notification, payload) {
		if(notification === 'BUS_DATA'){
			if(payload != null) {
				this.buses = payload;
                var count = this.buses.length;
				this.updateDom();
			} else {
                console.log(this.name + ': BUS_DATA - No payload');
            }
		}
	},

    getStyles: function() {
        return [
            'NesteBussAtB.css'
        ];
    },

    getDom: function() {
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
        
        self.buses.forEach(function(bus){
            var busTime = self.toDate(bus.time);
            var now = new Date();
            var minutes = Math.round((busTime - now) / 60000);

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
                busWrapper.appendChild(numberWrapper);
			}

            // Holdeplass
			if (self.config.showFrom) {
				var fromWrapper = document.createElement("td");
                fromWrapper.innerHTML = bus.from;
                busWrapper.appendChild(fromWrapper);
			}

            // Destinasjon
			if (self.config.showTo) {
				var toWrapper = document.createElement("td");
                toWrapper.className = "align-left";
                toWrapper.innerHTML = bus.to;
                busWrapper.appendChild(toWrapper);
			}

            // Minutter
            var minutesWrapper = document.createElement("td");
            minutesWrapper.className = "align-right";
            minutesWrapper.innerHTML = minutes;
            busWrapper.appendChild(minutesWrapper);

            // Min (text)
			if (self.config.showMin) {
				var minWrapper = document.createElement("td");
                minWrapper.className = "align-left";
                minWrapper.innerHTML = '&nbsp;min';
                busWrapper.appendChild(minWrapper);
			}

            wrapper.appendChild(busWrapper);
        });
        return wrapper;
    },

    toDate: function(s){
        // Translate the API date to Date object
        year = s.substring(6, 10);
        month = parseInt(s.substring(3, 5)) - 1;
        day = s.substring(0, 2);
        hour = s.substring(11, 13);
        minute = s.substring(14, 16);
        time = new Date(year, month, day, hour, minute, 0, 0);
        return time;
    }
});