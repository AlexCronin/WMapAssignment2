//var HOST = "http://mf1.dit.ie:8511";
//var HOST = "http://localhost:8000";
var HOST = "http://192.168.1.9:8000";
var HOST = "http://147.252.146.243:8000";
var GEOSERVER_HOST = "http://mf2.dit.ie:8080/geoserver/";
// var HOST = "http://localhost:8002";
// var GEOSERVER_HOST = "http://mf1.dit.ie:82/geoserver/";

var URLS = {
    login: "/rest/tokenlogin/",
    userme: "/rest/userme/",
    updateposition: "/rest/updateposition/",
    getamenities: "/rest/getamenities/",
    getpoi: "/rest/getpoi/",
    getfavpoi: "/rest/fav/"

};

var map;
var posMarker;
var geojsonLayer;
var boundariesLayer;
var routingControl;

var markers = [];
//Layer group var
var markerLayer;

var curIcon = L.ExtraMarkers.icon({
    icon: 'fa-crosshairs',
    iconColor: 'white',
    markerColor: 'blue',
    shape: 'square',
    prefix: 'fa'
});

var amenityIcon = L.ExtraMarkers.icon({
    icon: 'fa-info',
    iconColor: 'white',
    markerColor: 'orange',
    shape: 'circle',
    prefix: 'fa'
});

var poiIcon = L.ExtraMarkers.icon({
    icon: 'fa-info',
    iconColor: 'white',
    markerColor: 'red',
    shape: 'circle',
    prefix: 'fa'
});

var locationWatchId;

function onLoad() {
    console.log("In onLoad.");
    document.addEventListener('deviceready', onDeviceReady, false);
}

function onDeviceReady() {
    console.log("In onDeviceReady.");
    loadPOI();
    $("#btn-login").on("touchstart", loginPressed);
    $("#sp-logout").on("touchstart", logoutPressed);

    if (localStorage.lastUserName && localStorage.lastUserPwd) {
        $("#in-username").val(localStorage.lastUserName);
        $("#in-password").val(localStorage.lastUserPwd);
    }
    // Buttons
    $("#amenity-search-button").on("touchstart", amenitySearch);
    $("#btn-fav").on("touchstart", favouriteList);

    $(document).on("pagecreate", "#map-page", function (event) {
        console.log("In pagecreate. Target is " + event.target.id + ".");

        $("#goto-currentlocation").on("touchstart", function () {
            getCurrentlocation();
        });

        $("#map-page").enhanceWithin();

        makeBasicMap();
        getCurrentlocation();

    });

    $(document).on("pageshow", function (event) {
        console.log("In pageshow. Target is " + event.target.id + ".");
        if (!localStorage.authtoken) {
            $.mobile.navigate("#login-page");
        }
        setUserName();
    });

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

    watchID = navigator.geolocation.watchPosition(
        function (pos) {
            console.log("Watch ID: " + watchID + ": Got position -> " + JSON.stringify(pos));
        },
        function (err) {
            console.log("Watch ID: " + watchID + ": Location error: " + JSON.stringify(err));
        },
        {
            timeout: 10000
        }
    );
}

function stopWatch() {
    console.log("Cleared Watch ID " + watchID);
    navigator.geolocation.clearWatch(watchID);
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
    // $.ajax({
    //     type: "GET",
    //     headers: {"Authorization": localStorage.authtoken}
    //     // url: HOST + URLS["logout"]
    // }).always(function () {
    //     localStorage.removeItem("authtoken");
    //     $.mobile.navigate("#login-page");
    // });
}

function showOkAlert(message) {
    navigator.notification.alert(message, null, "WMAP 2018", "OK");
}

function getCurrentlocation() {
    console.log("In getCurrentlocation.");
    var myLatLon;
    var myPos;

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            console.log("Got location")
            // myLatLon = L.latLng(pos.coords.latitude, pos.coords.longitude);
            myPos = new myGeoPosition(pos);
            localStorage.lastKnownCurrentPosition = JSON.stringify(myPos);

            setMapToCurrentLocation();
            updatePosition();
        },
        function (err) {
            console.log("Location error: " + err.message);
        },
        {
            enableHighAccuracy: true,
            // maximumAge: 60000,
            timeout: 30000
        }
    );
}

function setMapToCurrentLocation() {
    console.log("In setMapToCurrentLocation.");
    if (localStorage.lastKnownCurrentPosition) {
        var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
        var myLatLon = L.latLng(myPos.coords.latitude, myPos.coords.longitude);

        if (map.hasLayer(posMarker)) {
            posMarker.remove();
        }

        posMarker = L.marker(myLatLon, {icon: curIcon});
        posMarker.addTo(map);
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

function createButton(label, container) {
    var btn = L.DomUtil.create('button', '', container);
    btn.setAttribute('type', 'button');
    btn.setAttribute('class', 'ui-btn ui-corner-all ui-mini ui-btn-inline');
    btn.setAttribute('style', 'color: white; background-color: forestgreen');
    btn.innerHTML = "<span class='fa fa-map-marker fa-lg' style='color:white'></span> " + label;
    return btn;
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

    routingControl = L.Routing.control({
        waypoints: [],
        routeWhileDragging: true
    });
    routingControl.addTo(map);

    map.on("moveend", function () {
        boundarySearch("cso:edgeom");
    });

    map.on("click", function (evt) {
        if (localStorage.lastKnownCurrentPosition) {
            var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
            var myStartPoint = L.latLng(myPos.coords.latitude, myPos.coords.longitude);
        }
        console.log("in click")
        var container = L.DomUtil.create('div'),
            destBtn = createButton('Directions to Here', container);

        L.popup()
            .setContent(container)
            .setLatLng(evt.latlng)
            .openOn(map);

        L.DomEvent.on(destBtn, 'click', function () {
            routingControl.setWaypoints([myStartPoint, evt.latlng]);
            map.closePopup();
        });

    });

    $("#leaflet-copyright").html("Leaflet | Map Tiles &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors");
    loadPOI();
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
function favouriteList()
{
    console.log("In favourites.");
    $.ajax({
    url: HOST + URLS["getfavpoi"],
    dataType:'json',
    //data: data,
    success: function(data) {

        console.log(data);

    }
    });
}
function amenitySearch() {
    if (!$("#amenity-search-text").val()) {
        showOkAlert("Empty search");
        return
    }
    if (!map) {
        showOkAlert("Cannot find map object");
    }

    var bboxString = map.getBounds().getSouth() + ", " + map.getBounds().getWest() + ", " + map.getBounds().getNorth() + ", " + map.getBounds().getEast();

    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["getamenities"],
        data: {
            amenity: $("#amenity-search-text").val(),
            bbox: bboxString
        }
    }).done(function (data, status, xhr) {
        if (map.hasLayer(geojsonLayer)) {
            geojsonLayer.remove();
        }
        geojsonLayer = L.geoJSON(data, {
            onEachFeature: popUp,
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {icon: amenityIcon});
            }
        });
        geojsonLayer.addTo(map);
    }).fail(function (xhr, status, error) {
        showOkAlert(error);
    }).always(function () {
        $.mobile.navigate("#map-page");
    });
}

function popUp(feature, layer) {
    console.log("In popUp.");
    var out = [];
    if (feature.properties) {
        for (key in feature.properties) {
            out.push(key + ": " + feature.properties[key]);
        }
        layer.bindPopup(out.join("<br />"));
    }
    console.log(out);
}

function boundarySearch(dataset) {
    /*
    * http://mf1.dit.ie:81/geoserver/cso/ows?
    * service=WFS&version=1.1.0
    * &request=GetFeature
    * &bbox=51.0,-9.0,53.5,-7.0,urn:ogc:def:crs:EPSG:4326
    * &typeName=cso:gageom
    * &outputFormat=application%2Fjson
    *
    * */

    if (!map) {
        showOkAlert("Cannot find map object");
    }

    var bboxString = map.getBounds().getSouth() + ", " + map.getBounds().getWest() + ", " + map.getBounds().getNorth() + ", " + map.getBounds().getEast();
    var urlString = GEOSERVER_HOST +
        "ows?service=WFS&version=1.1.0&request=GetFeature&bbox=" +
        bboxString + ",urn:ogc:def:crs:EPSG:4326&typeName=" +
        dataset +
        "&srsName=EPSG:4326&outputFormat=application%2Fjson";

    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: urlString
    }).done(function (data, status, xhr) {
        if (map.hasLayer(boundariesLayer)) {
            boundariesLayer.remove();
        }
        boundariesLayer = L.geoJSON(data, {
            style: function (feature) {
                return {
                    fill: false,
                    weight: 2,
                    opacity: 0.5,
                    color: 'blue'
                };
            }
        });
        boundariesLayer.addTo(map);
    }).fail(function (xhr, status, error) {
        showOkAlert(error);
    }).always(function () {
        $.mobile.navigate("#map-page");
    });
}

function loadPOI() {
    console.log("In loadPOI.");
    $.ajax({
    //url: 'http://147.252.146.180:8000/rest/show_locations/?format=json',
    url: HOST + URLS["getpoi"],
    dataType:'json',
    //data: data,
    success: function(data) {

        console.log(data);
        //console.log(data.data[0].address);

        /*
        if (map.hasLayer(markerLayer)) {
            markerLayer.remove();
            }
            markerLayer = L.geoJSON(data.data, {
            onEachFeature: popUp,
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {icon: amenityIcon});
            }
            });
            markerLayer.addTo(map);
        */
        for (var i=0;i<data.data.length;i++)
        {
            var myLatLon = L.latLng(data.data[i].latitude,data.data[i].longitude );
            var lat = data.data[i].latitude;
            var lng = data.data[i].longitude;
            var popupContent = "Name: " + data.data[i].name + "<br>Address: " + data.data[i].address + "<br> Phone No: " + data.data[i].contactNumber;
            //var popupContent = "Name: " + data.data[i].name + "<br>Address: " + data.data[i].address + "<br> Description: " + data.data[i].description  + "<br> Phone No: " + data.data[i].contactNumber;


            //L.marker([data.data[i].latitude, data.data[i].longitude], {icon: poiIcon}).addTo(map);
            var marker = L.marker([data.data[i].latitude, data.data[i].longitude], {icon: poiIcon}).addTo(map).bindPopup(popupContent);
            markers.push(marker);
        }
    }
    });


}



