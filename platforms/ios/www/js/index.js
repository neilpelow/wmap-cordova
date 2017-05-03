var HOST = "http://178.62.74.54:8000";

var URLS = {
    get_road_data: "/rest/get_road_data/",
    get_station_data: "/rest/get_station_data/",
    login: "/rest/tokenlogin/",
    userme: "/rest/userme/",
    updateposition: "/rest/updateposition/"
};

var map;

var showIncidents = false;

var curIcon = L.ExtraMarkers.icon({
    icon: 'fa-user',
    iconColor: 'white',
    markerColor: 'blue',
    shape: 'square',
    prefix: 'fa'
});

var bikeIcon = L.ExtraMarkers.icon({
    icon: 'fa-bicycle',
    iconColor: 'black',
    markerColor: 'red',
    shape: 'square',
    prefix: 'fa'
});

var roadIcon = L.ExtraMarkers.icon({
    icon: 'fa-exclamation-triangle',
    iconColor: 'black',
    markerColor: 'yellow',
    shape: 'square',
    prefix: 'fa'
});

function onLoad() {
    console.log("In onLoad.");
    document.addEventListener('deviceready', onDeviceReady, false);
}

function onDeviceReady() {
    console.log("In onDeviceReady.");

    $("#btn-login").on("touchstart", loginPressed);
    $("#sp-logout").on("touchstart", logoutPressed);
    $("#btn-clear").on("touchstart", refreshMap);
    $("#btn-show").on("touchstart", showIncidentsButton);

    if (localStorage.lastUserName && localStorage.lastUserPwd) {
        $("#in-username").val(localStorage.lastUserName);
        $("#in-password").val(localStorage.lastUserPwd);
    }

    $(document).on("pagecreate", "#map-page", function (event) {
        console.log("In pagecreate. Target is " + event.target.id + ".");

        $("#goto-currentlocation").on("touchstart", function () {
            getCurrentlocation();
        });

        $("#map-page").enhanceWithin();
    });

    $(document).on("pageshow", function (event) {
        console.log("In pageshow. Target is " + event.target.id + ".");
        if (!localStorage.authtoken) {
            $.mobile.navigate("#login-page");
        }
        setUserName();
    });

    makeBasicMap();
    getCurrentlocation();
    setMapToCurrentLocation();

    $(document).on("pageshow", "#map-page", function () {
        console.log("In pageshow / #map-page.");
        map.invalidateSize();
    });

    $('div[data-role="page"]').page();

    console.log("TOKEN: " + localStorage.authtoken);
    if (localStorage.authtoken) {
        $.mobile.navigate("#map-page");
    } else {
        $.mobile.navigate("#login-page");
    }
}

function loginPressed() {
    console.log("In loginPressed.");
    $.ajax({
        type: "GET",
        url: HOST + URLS["login"],
        data: {
            username: $("#in-username").val(),
            password: $("#in-password").val()
        }
    }).done(function (data, status, xhr) {
        localStorage.authtoken = localStorage.authtoken = "Token " + xhr.responseJSON.token;
        localStorage.lastUserName = $("#in-username").val();
        localStorage.lastUserPwd = $("#in-password").val();

        $.mobile.navigate("#map-page");
        getCurrentlocation();
    }).fail(function (xhr, status, error) {
        var message = "Login Failed\n";
        if ((!xhr.status) && (!navigator.onLine)) {
            message += "Bad Internet Connection\n";
        }
        message += "Status: " + xhr.status + " " + xhr.responseText;
        showOkAlert(message);
        logoutPressed();
    });
}

function logoutPressed() {
    console.log("In logoutPressed.");
    localStorage.removeItem("authtoken");
    $.mobile.navigate("#login-page");
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["logout"]
     }).always(function () {
         localStorage.removeItem("authtoken");
         $.mobile.navigate("#login-page");
     });
}

function showOkAlert(message) {
    navigator.notification.alert(message, null, "WMAP 2017", "OK");
}

function getCurrentlocation() {
    console.log("In getCurrentlocation.");
    var myLatLon;
    var myPos;

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            myLatLon = L.latLng(pos.coords.latitude, pos.coords.longitude);
            myPos = new myGeoPosition(pos);
            localStorage.lastKnownCurrentPosition = JSON.stringify(myPos);

            setMapToCurrentLocation();
            getStationLocations();
            getRoadLocations();
        },
        function (err) {
        },
        {
            enableHighAccuracy: true,
            maximumAge: 60000,
            timeout: 5000
        }
    );
}

function getStationLocations() {
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["get_station_data"]
    }).done(function (data, status, xhr) {
        console.log(data);
        var myData = JSON.parse(data.data);
        for (item in myData) {
            var station = myData[item];
            var name = station.name;
            var pos = station.position;

            var bikeStands = station.bike_stands;
            var availableStands = station.available_bike_stands;
            var availableBikes = station.available_bikes;

            var myLat = pos.lat;
            var myLng = pos.lng;
            var latLng = L.latLng(myLat, myLng);
            
            var popupContent = "<b>" + name + "</b><br>"
            + "Bike Stands: <b>" + bikeStands + "</b><br>"
            + "Free Stands: <b>" + availableStands + "</b><br>"
            + "Bikes: <b>" + availableBikes + "</b><br>"
            L.marker(latLng, {icon: bikeIcon}).addTo(map).bindPopup(popupContent);
        } // end for
    }).fail(function (xhr, status, error) {
        $(".sp-username").html("");
    });
}

function getRoadLocations() {
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["get_road_data"]
    }).done(function (data, status, xhr) {
        console.log("In road data");
        var myData = data.data
        var myData = JSON.parse(myData);
        var myPayload = myData.payload;
        var myIncidents = myPayload.incidents;
        console.log(myIncidents);

        for(item in myIncidents) {
            var myIncident = myIncidents[item]
            var incident = myIncident.incident;

            var date = incident.incidentdate;
            var desc = incident.incidentdescription;
            var title = incident.incidenttitle;

            var lat = incident.locationlatitude;
            var lng = incident.locationlongitude;
            var latLng = L.latLng(lat, lng);

            if(showIncidents === true) {
                if(lng > -6.318005 && lat < 53.363402 && lat > 53.328232){
                    var popupContent = "<b>" + title + "</b><br>"
                    + "Date: <b>" + date + "</b><br>"
                    + "Desc: <b>" + desc + "</b><br>"
                    L.marker(latLng, {icon: roadIcon}).addTo(map).bindPopup(popupContent);
                }
            }
        }

    }).fail(function (xhr, status, error) {
        $(".sp-username").html("");
    });
}

function setMapToCurrentLocation() {
    console.log("In setMapToCurrentLocation.");
    if (localStorage.lastKnownCurrentPosition) {
        var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
        var myLatLon = L.latLng(myPos.coords.latitude, myPos.coords.longitude);
        L.marker(myLatLon, {icon: curIcon}).addTo(map);
        map.flyTo(myLatLon, 15);
    }
}

function updatePosition() {
    console.log("In updatePosition.");
    if (localStorage.lastKnownCurrentPosition) {
        var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
        $.ajax({
            type: "PATCH",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": localStorage.authtoken
            },
            url: HOST + URLS["updateposition"],
            data: {
                lat: myPos.coords.latitude,
                lon: myPos.coords.longitude
            }
        }).done(function (data, status, xhr) {
            showOkAlert("Position Updated");
        }).fail(function (xhr, status, error) {
            var message = "Position Update Failed\n";
            if ((!xhr.status) && (!navigator.onLine)) {
                message += "Bad Internet Connection\n";
            }
            message += "Status: " + xhr.status + " " + xhr.responseText;
            showOkAlert(message);
        }).always(function () {
            $.mobile.navigate("#map-page");
        });
    }
}

function makeBasicMap() {
    console.log("In makeBasicMap.");
    map = L.map("map-var", {
        zoomControl: false,
        attributionControl: false
    }).fitWorld();
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        useCache: true
    }).addTo(map);

    $("#leaflet-copyright").html("Leaflet | Map Tiles &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors");
}

function myGeoPosition(p) {
    this.coords = {};
    this.coords.latitude = p.coords.latitude;
    this.coords.longitude = p.coords.longitude;
    this.coords.accuracy = (p.coords.accuracy) ? p.coords.accuracy : 0;
    this.timestamp = (p.timestamp) ? p.timestamp : new Date().getTime();
}

function setUserName() {
    console.log("In setUserName.");
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["userme"]
    }).done(function (data, status, xhr) {
        $(".sp-username").html(xhr.responseJSON.properties.username);
    }).fail(function (xhr, status, error) {
        $(".sp-username").html("");
    });
}

// Removes map and creates new one. 
function refreshMap() {
    console.log("Map refresh.");
    map.remove();
    map = L.map("map-var", {
        zoomControl: false,
        attributionControl: false
    }).fitWorld();
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        useCache: true
    }).addTo(map);

    if(localStorage.lastKnownCurrentPosition){
        var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
        var myLatLon = L.latLng(myPos.coords.latitude, myPos.coords.longitude);
        L.Routing.control({
            waypoints: [
                L.latLng(myPos.coords.latitude, myPos.coords.longitude),
                L.latLng(53.338912, -6.2748327)
            ],
            routeWhileDragging: true
        }).addTo(map);
    }

    $("#leaflet-copyright").html("Leaflet | Map Tiles &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors");
    getCurrentlocation();
    setMapToCurrentLocation();
    updatePosition();
}

//Boolean toggle for showing road incidents
function showIncidentsButton() {
    if(showIncidents === false) {
        showIncidents = true;
        refreshMap();
    } else {
        showIncidents = false;
        refreshMap();
    }
}

//This doesnt work for absolutely no reason.
function addWaypoints() {
    if(localStorage.lastKnownCurrentPosition){
        var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
        var myLatLon = L.latLng(myPos.coords.latitude, myPos.coords.longitude);
        L.Routing.control({
            waypoints: [
                L.latLng(myPos.coords.latitude, myPos.coords.longitude),
                L.latLng(53.338912, -6.2748327)
            ],
            routeWhileDragging: true
        }).addTo(map);
    }
}
