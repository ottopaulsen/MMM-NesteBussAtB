var NodeHelper = require("node_helper");
var request = require('request');
var convert = require('xml-js');

module.exports = NodeHelper.create({

    start: function () {
        console.log(this.name + ': Starting node helper');
    },

    socketNotificationReceived: function (notification, payload) {
        console.log(this.name + ': Received socket notification ' + notification);
        var self = this;
        var buses = new Map();
        if (notification == 'NESTEBUSSATB_CONFIG') {
            console.log(self.name + ': AtB Connection started');

            self.readBuses(payload, buses);
            setInterval(function () {
                self.readBuses(payload, buses);
            }, 30000);
        }
    },

    readBuses: function (config, buses) {
        var self = this;
        stops = config.stopIds;
        stops.forEach(function (stopId) {
            var stopBuses = [];
            self.getAtbStopTimes(config, stopId, function (error, data) {
                if (!error) {
                    var routes = new Map();
                    for (i = 0; i < data.buses.length; i++) {
                        var bus = data.buses[i];
                        var key = bus.line.trim() + bus.name.trim();
                        var routeCount = routes.has(key) ? routes.get(key) : 0;
                        var minutes = Math.round((self.toDate(bus.time) - (new Date())) / 60000);
                        if (routeCount < config.maxCount && minutes <= config.maxMinutes) {
                            routeCount++;
                            routes.set(key, routeCount);
                            stopBuses.push({
                                number: bus.line.trim(),
                                from: bus.name.trim(),
                                to: bus.destination.trim(),
                                time: bus.time.trim()
                            });
                        }
                    }
                    buses.set(stopId, stopBuses);
                    self.broadcastMessage(buses);
                } else {
                    console.error(self.name + ': Request error: ' + error);
                }
            });
        });
    },

    broadcastMessage: function (buses) {
        self = this;
        busArr = [];
        buses.forEach(function (stop) {
            stop.forEach(function(bus) {
                busArr.push(bus);
            });
        });
        busArr.sort(function (a, b) {
            return (self.toDate(a.time) - self.toDate(b.time));
        });
        filteredBuses = busArr.filter(function (el, i, a) {
            return !self.duplicateBuses(el, a[i - 1]); // Seems that some times AtB returns duplicated buses
        });
        self.sendSocketNotification('BUS_DATA', filteredBuses);
    },

    printBuses(label, b) {
        console.log(label);
        for (i = 0; i < b.length; i++) {
            console.log('Bus ' + i + ': Line ' + b[i].number + ' from ' + b[i].from + ' to ' + b[i].to + ' time ' + b[i].time);
        }
    },

    duplicateBuses: function (a, b) {
        if (!a) return false;
        if (!b) return false;
        if (a.number != b.number) return false;
        if (a.from != b.from) return false;
        if (a.to != b.to) return false;
        if (a.time != b.time) return false;
        return true;
    },

    toDate: function (s) {
        year = s.substring(0, 4);
        month = parseInt(s.substring(5, 7)) - 1;
        day = s.substring(8, 10);
        hour = s.substring(11, 13);
        minute = s.substring(14, 16);
        time = new Date(year, month, day, hour, minute, 0, 0);
        return time;
    },

    createAtbSmsXml: function (config, stopId) {
        var currentTime = new Date();
        var requestTime = currentTime.getFullYear() + '-'
            + (((currentTime.getMonth() + 1) < 10) ? '0' : '')
            + (currentTime.getMonth() + 1) + '-'
            + ((currentTime.getDate() < 10) ? '0' : '')
            + currentTime.getDate() + 'T'
            + ((currentTime.getHours() < 10) ? '0' : '')
            + currentTime.getHours() + ':'
            + ((currentTime.getMinutes() < 10) ? '0' : '')
            + currentTime.getMinutes() + ':'
            + ((currentTime.getSeconds() < 10) ? '0' : '')
            + currentTime.getSeconds() + '.'
            + currentTime.getMilliseconds() + 'Z';
        var requestor = 'github.com/ottopaulsen/MMM-NesteBussAtB';
        var previewInterval = 'PT' + config.maxMinutes + 'M';
        var xml = `
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:siri="http://www.siri.org.uk/siri">
        <soapenv:Header/>
        <soapenv:Body>
            <siri:GetStopMonitoring>
                <ServiceRequestInfo>
                    <siri:RequestTimestamp>` + requestTime + `</siri:RequestTimestamp>
                    <siri:RequestorRef>` + requestor + `</siri:RequestorRef>
                </ServiceRequestInfo>
                <Request version="1.4">
                    <siri:RequestTimestamp>` + requestTime + `</siri:RequestTimestamp>
                    <siri:PreviewInterval>` + previewInterval + `</siri:PreviewInterval>
                    <siri:MonitoringRef>` + stopId + `</siri:MonitoringRef>
                </Request>
                <RequestExtension></RequestExtension>
            </siri:GetStopMonitoring>
        </soapenv:Body>
        </soapenv:Envelope>
        `;
        return xml;
    },

    getAtbStopTimes: function (config, stopId, handleResponse) {
        var self = this;
        request({
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SoapAction': 'GetStopMonitoring'
            },
            uri: 'http://st.atb.no:90/SMWS/SMService.svc?WSDL',
            body: self.createAtbSmsXml(config, stopId),
            method: 'POST'
        }, function (err, res, body) {
            result = {
                timestamp: '',
                buses: []
            }
            if (err) {
                console.error('Error ' + err);
            } else {
                if (res.statusCode == 200) {
                    xmlResult = convert.xml2js(body, { compact: true, spaces: 3 });
                    //console.log(convert.xml2json(body, {compact: true, spaces: 3}));

                    xmlBody = xmlResult['s:Envelope']['s:Body'];
                    getStopMonitoringResponse = xmlBody['GetStopMonitoringResponse'];
                    serviceDeliveryInfo = getStopMonitoringResponse['ServiceDeliveryInfo'];
                    responseTimestamp = serviceDeliveryInfo['ResponseTimestamp']['_text'];
                    answer = getStopMonitoringResponse['Answer'];
                    stopMonitoringDelivery = answer['StopMonitoringDelivery'];
                    monitoredStopVisit = stopMonitoringDelivery['MonitoredStopVisit'];
                    if (monitoredStopVisit) {
                        result.timestamp = responseTimestamp;
                        for (i = 0; i < monitoredStopVisit.length; i++) {
                            monitored = monitoredStopVisit[i]['MonitoredVehicleJourney']['Monitored']['_text'];
                            if (monitored == 'true') {
                                time = monitoredStopVisit[i]['MonitoredVehicleJourney']['MonitoredCall']['ExpectedDepartureTime']['_text'];
                            } else {
                                time = monitoredStopVisit[i]['MonitoredVehicleJourney']['MonitoredCall']['AimedDepartureTime']['_text'];
                            }
                            result.buses[i] = {
                                line: monitoredStopVisit[i]['MonitoredVehicleJourney']['PublishedLineName']['_text'],
                                destination: monitoredStopVisit[i]['MonitoredVehicleJourney']['MonitoredCall']['DestinationDisplay']['_text'],
                                time: time,
                                name: monitoredStopVisit[i]['MonitoredVehicleJourney']['MonitoredCall']['StopPointName']['_text']
                            }
                        }
                    }
                } else {
                    console.log('The AtB SMService returned status code ' + res.statusCode);
                }
            }
            handleResponse(err, result);
        });
    }

});