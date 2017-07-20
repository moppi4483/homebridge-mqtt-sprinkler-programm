// MQTT Sprinkler Accessory plugin for HomeBridge
//
// Remember to add accessory to config.json. Example:
// "accessories": [
//         {
//             "accessory"		        : "mqtt-sprinkler-programm",
//             "name"			        : "PUT THE NAME OF YOUR SWITCH HERE",
//             "url"			        : "PUT URL OF THE BROKER HERE",
//             "username"		        : "OPTIONALLY PUT USERNAME OF THE BROKER HERE",
//             "password"		        : "OPTIONALLY PUT PASSWORD OF THE BROKER HERE",
//             "qos"		            : "QOS OF THE MESSAGES (DEFAULT 0)",
//             "caption"		        : "OPTIONALLY PUT THE LABEL OF YOUR SWITCH HERE",
//             "serialNumberMAC"	    : "OPTIONALLY PUT THE LABEL OF YOUR SWITCH HERE",
//             "displayNameDate"	    : "DISPLAY-NAME OF THE LABEL WHICH SHOWS THE LAST RUNTIME OF THE SPRINKLER",
//             "displayNameLastTime"	: "DISPLAY-NAME OF THE LABEL WHICH SHOWS THE LAST THE GAUGE OF THE LAST RUNTIME OF THE SPRINKLER",
//             "displayNameLastDay"	    : "DISPLAY-NAME OF THE LABEL WHICH SHOWS THE LAST THE GAUGE OF THE PAST 24 HOURS OF THE SPRINKLER",
//             "topicGet"		    	: "PUT THE MQTT TOPIC FOR THE GETTING THE STATUS OF YOUR SPRINKLER ACCESSORY HERE",
//             "onValue"		        : "OPTIONALLY PUT THE VALUE THAT MEANS ON HERE (DEFAULT true)",
//             "offValue"		        : "OPTIONALLY PUT THE VALUE THAT MEANS OFF HERE (DEFAULT false)",
//			   "topicStatusGet"	    	: "PUT THE MQTT TOPIC FOR REQUESTING THE STATUS OF YOUR SPRINKLER ACCESSORY HERE",
//             "statusCmd"		        : "OPTIONALLY PUT THE STATUS COMMAND HERE",
//             "integerValue"	        : "OPTIONALLY SET THIS TRUE TO USE 1/0 AS VALUES",
//         }
//     ]
//
// When you attempt to add a device, it will ask for a "PIN code".
// The default code for all HomeBridge accessories is 031-45-154.

'use strict';

var Service, Characteristic;

var inherits = require('util').inherits;
var mqtt = require("mqtt");
var bpService;

var displayNameRasenWasserNotwendig, displayNameRegnerLaufzeit, displayNamePflanzenWasserNotwendig, displayNameTropferLaufzeit;


module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  fixInheritance(BeregnungsanlageProgrammAccessory.BPRasenWasser, Characteristic);
  fixInheritance(BeregnungsanlageProgrammAccessory.BPRegnerLaufzeit, Characteristic);
  fixInheritance(BeregnungsanlageProgrammAccessory.BPPflanzenWasser, Characteristic);
  fixInheritance(BeregnungsanlageProgrammAccessory.BPTropferLaufzeit, Characteristic);

  homebridge.registerAccessory("homebridge-mqtt-sprinkler-programm", "mqtt-sprinkler-programm", BeregnungsanlageProgrammAccessory);
}

// Necessary because Accessory is defined after we have defined all of our classes
function fixInheritance(subclass, superclass) {
    var proto = subclass.prototype;
    inherits(subclass, superclass);
    subclass.prototype.parent = superclass.prototype;
    for (var mn in proto) {
        subclass.prototype[mn] = proto[mn];
    }
}


BeregnungsanlageProgrammAccessory.BPRasenWasser = function() {
	Characteristic.call(this, displayNameRasenWasserNotwendig, '00001001-0000-1000-8000-775D67EC4111');
	this.setProps({
		format: Characteristic.Formats.FLOAT,
		unit: "mm",
		maxValue: 1000,
		minValue: 0,
		minStep: 0.01,
		perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
	});
	this.value = this.getDefaultValue();
};

BeregnungsanlageProgrammAccessory.BPRegnerLaufzeit = function() {
	Characteristic.call(this, displayNameRegnerLaufzeit, '00001001-0000-1000-8000-775D67EC4112');
	this.setProps({
		format: Characteristic.Formats.FLOAT,
		unit: "min",
		maxValue: 1000,
		minValue: 0,
		minStep: 1,
		perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
	});
	this.value = this.getDefaultValue();
};

BeregnungsanlageProgrammAccessory.BPPflanzenWasser = function() {
	Characteristic.call(this, displayNamePflanzenWasserNotwendig, '00001001-0000-1000-8000-775D67EC4113');
	this.setProps({
		format: Characteristic.Formats.FLOAT,
		unit: "mm",
		maxValue: 1000,
		minValue: 0,
		minStep: 0.01,
		perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
	});
	this.value = this.getDefaultValue();
};

BeregnungsanlageProgrammAccessory.BPTropferLaufzeit = function() {
	Characteristic.call(this, displayNameTropferLaufzeit, '00001001-0000-1000-8000-775D67EC4114');
	this.setProps({
		format: Characteristic.Formats.FLOAT,
		unit: "min",
		maxValue: 1000,
		minValue: 0,
		minStep: 1,
		perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
	});
	this.value = this.getDefaultValue();
};


function BeregnungsanlageProgrammAccessory(log, config) {
    this.log 				= log;
	this.name 				= config["name"] || "Beregnungsprogramm";
  	this.manufacturer 		= "moppi4483";
	this.model 				= "Eigenbau";
	this.serialNumber 		= "0004";
	this.serialNumberMAC 	= config['serialNumberMAC'] || "";
	this.publish_options 	= {
		qos: ((config["qos"] !== undefined)? config["qos"]: 0)
								};
	
	this.caption			= config["caption"];
    this.url				= config['url'];
	this.client_Id 			= 'mqttjs_' + Math.random().toString(16).substr(2, 8);
	this.options 			= {
	    keepalive			: 10,
    	clientId			: this.client_Id,
	    protocolId			: 'MQTT',
    	protocolVersion		: 4,
    	clean				: true,
    	reconnectPeriod		: 1000,
    	connectTimeout		: 30 * 1000,
		will				: {
			topic	: 'WillMsg',
			payload	: 'Connection Closed abnormally..!',
			qos		: 0,
			retain	: false
		},
	    username			: config["username"],
	    password			: config["password"],
    	rejectUnauthorized	: false
	};

    displayNameRasenWasserNotwendig = config["displayNameWasserNotwendig"]; 
    displayNameRegnerLaufzeit  = config["displayNameRegnerLaufzeit"]; 
	displayNamePflanzenWasserNotwendig = config["displayNamePflanzenWasserNotwendig"];
	displayNameTropferLaufzeit = config["displayNameTropferLaufzeit"];

	this.topicStatusGet		= config["topicGet"];
	this.topicStatusRequest	= config["topicStatusGet"];
	this.statusCmd 			= config["statusCmd"];
	
    
    
    this.informationService = new Service.AccessoryInformation();
	this.informationService
		.setCharacteristic(Characteristic.Name, this.name)
        .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
        .setCharacteristic(Characteristic.Model, this.model)
        .setCharacteristic(Characteristic.SerialNumber, this.serialNumber);
        
    this.onValue = (config["onValue"] !== undefined) ? config["onValue"]: "true";
    this.offValue = (config["offValue"] !== undefined) ? config["offValue"]: "false";
	if (config["integerValue"]) {
		this.onValue = "1";
		this.offValue = "0";
	}

    this.programmStatus = false;  

    this.bpService = new Service.Label(this.name);
    this.bpService
    	.getCharacteristic(Characteristic.On)
    	.on('get', this.getStatus.bind(this));
                
    this.bpService.addCharacteristic(BeregnungsanlageProgrammAccessory.BPRasenWasser);
  	this.bpService.addCharacteristic(BeregnungsanlageProgrammAccessory.BPRegnerLaufzeit);
  	this.bpService.addCharacteristic(BeregnungsanlageProgrammAccessory.BPPflanzenWasser);
  	this.bpService.addCharacteristic(BeregnungsanlageProgrammAccessory.BPTropferLaufzeit);

	// connect to MQTT broker
	this.client = mqtt.connect(this.url, this.options);
	var that = this;
	
	this.client.on('error', function () {
		that.log('Error event on MQTT');
	});

	this.client.on('message', function (topic, message) {
		that.log(this.name, " -  New Message");
		if (topic == that.topicStatusGet) {
			var programm = "";
			
			if (message.toString() == that.onValue || message.toString() == that.offValue) {
				programm = message.toString();
			} else {
				var msgJSON = JSON.parse(message.toString());
			
				var rasenWasser = msgJSON.RasenWasser;
				var rengerLaufzeit = msgJSON.RegnerLaufzeit;
				var pflanzenWasser = msgJSON.PflanzenWasser;
				var tropferLaufzeit = msgJSON.TropferLaufzeit;
			
				if (rasenWasser !== undefined) {
					that.bpService.setCharacteristic(BeregnungsanlageProgrammAccessory.BPRasenWasser, msgJSON.RasenWasser);
				}
				
				if (rengerLaufzeit !== undefined) {
					that.bpService.setCharacteristic(BeregnungsanlageProgrammAccessory.BPRegnerLaufzeit, msgJSON.RegnerLaufzeit);
				}
			
				if (pflanzenWasser !== undefined) {
					that.bpService.setCharacteristic(BeregnungsanlageProgrammAccessory.BPPflanzenWasser, msgJSON.PflanzenWasser);
				}
			
				if (tropferLaufzeit !== undefined) {
					that.bpService.setCharacteristic(BeregnungsanlageProgrammAccessory.BPTropferLaufzeit, msgJSON.TropferLaufzeit);
				}

				programm = msgJSON.Programm;
			}
			
			if (programm == that.onValue || programm == that.offValue) {
			    that.programmStatus = (programm == that.onValue) ? true : false;
		   	    that.bpService.getCharacteristic(Characteristic.On).setValue(that.programmStatus, undefined, 'fromSetValue');
		   	 }
		}
	});
    this.client.subscribe(this.topicStatusGet);
}


BeregnungsanlageProgrammAccessory.prototype.getStatus = function(callback) {
    if (this.statusCmd !== undefined) {
    	this.client.publish(this.topicStatusRequest, this.statusCmd, this.publish_options);
    }
    callback(null, this.programmStatus);
};
	
BeregnungsanlageProgrammAccessory.prototype.getServices = function () {
	return [this.informationService, this.bpService];
};