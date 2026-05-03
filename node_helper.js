const NodeHelper = require("node_helper");

const ENTUR_API = "https://api.entur.io/journey-planner/v3/graphql";
const ENTUR_CLIENT = "MMM-NesteBussAtB";

module.exports = NodeHelper.create({

    start() {
        console.log(`${this.name}: Starting node helper`);
    },

    socketNotificationReceived(notification, payload) {
        if (notification === "NESTEBUSSATB_CONFIG") {
            console.log(`${this.name}: AtB connection started`);
            this.config = payload;
            this.buses = new Map();
            this.readBuses();
            setInterval(() => this.readBuses(), 30000);
        }
    },

    async readBuses() {
        for (const stopId of this.config.stopIds) {
            try {
                const stopBuses = await this.getEnturStopTimes(stopId);
                this.buses.set(stopId, stopBuses);
            } catch (err) {
                console.error(`${this.name}: Error fetching stop NSR:StopPlace:${stopId}: ${err}`);
            }
        }
        this.broadcastMessage(this.buses);
    },

    async getEnturStopTimes(stopId) {
        const { maxMinutes, maxCount } = this.config;
        const query = `{
            stopPlace(id: "NSR:StopPlace:${stopId}") {
                name
                estimatedCalls(timeRange: ${maxMinutes * 60}, numberOfDepartures: ${maxCount * 20}) {
                    realtime
                    aimedDepartureTime
                    expectedDepartureTime
                    destinationDisplay { frontText }
                    serviceJourney { journeyPattern { line { publicCode } } }
                    quay { name }
                }
            }
        }`;

        const response = await fetch(ENTUR_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ET-Client-Name": ENTUR_CLIENT
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const stopPlace = json.data?.stopPlace;

        if (!stopPlace) {
            console.warn(`${this.name}: No data for stop "NSR:StopPlace:${stopId}". Is the NSR stop ID correct?`);
            return [];
        }

        const routes = new Map();
        const result = [];

        for (const call of (stopPlace.estimatedCalls || [])) {
            const line = call.serviceJourney?.journeyPattern?.line?.publicCode || "";
            const destination = call.destinationDisplay?.frontText || "";
            const quayName = call.quay?.name || "";
            const key = `${line}|${quayName}|${destination}`;
            const routeCount = routes.get(key) || 0;
            const time = call.realtime ? call.expectedDepartureTime : call.aimedDepartureTime;
            const minutes = Math.round((new Date(time) - new Date()) / 60000);

            if (routeCount < maxCount && minutes <= maxMinutes) {
                routes.set(key, routeCount + 1);
                result.push({
                    number: line,
                    from: quayName,
                    to: destination,
                    time,
                    monitored: call.realtime
                });
            }
        }

        return result;
    },

    broadcastMessage(buses) {
        const busArr = [];
        buses.forEach(stop => stop.forEach(bus => busArr.push(bus)));
        busArr.sort((a, b) => new Date(a.time) - new Date(b.time));
        const filtered = busArr.filter((el, i, a) => !this.duplicateBuses(el, a[i - 1]));
        this.sendSocketNotification("BUS_DATA", filtered);
    },

    duplicateBuses(a, b) {
        if (!a || !b) return false;
        return a.number === b.number && a.from === b.from && a.to === b.to && a.time === b.time;
    }

});