
var HOST = "http://192.168.1.8:8000";   // Local Network
//var HOST = "http://147.252.146.180:8000"; // College Local Network
//var HOST = "http://142.93.34.200";
var HOST = "http://104.248.91.181";   // Digital Ocean Droplet

var URLS = {
    login: "/rest/tokenlogin/",
    userme: "/rest/userme/",
    updateposition: "/rest/updateposition/",
    getpoi: "/rest/getpoi/",
    getfavpoi: "/rest/fav/",
    register: "/rest/register/"

};
// Map
var map;

// My position marker
var posMarker;

// For routes and navigating
var routingControl;

// Arrays for Markers on map
var poimarkers = [];
var favmarkers = [];

//Layers For Markers on map
var markerLayerPOI;
var markerLayerFav;

var curIcon = L.ExtraMarkers.icon({
    icon: 'fa-crosshairs',
    iconColor: 'white',
    markerColor: 'blue',
    shape: 'square',
    prefix: 'fa'
});

var poiIcon = L.ExtraMarkers.icon({
    icon: 'fa-info',
    iconColor: 'white',
    markerColor: 'red',
    shape: 'circle',
    prefix: 'fa'
});

var favIcon = L.ExtraMarkers.icon({
    icon: 'fa-info',
    iconColor: 'white',
    markerColor: 'yellow',
    shape: 'circle',
    prefix: 'fa'
});

function onLoad() {
    console.log("In onLoad.");
    document.addEventListener('deviceready', onDeviceReady, false);
}

function onDeviceReady() {
    console.log("In onDeviceReady.");

    // Buttons
    $("#btn-navigate").on("touchstart", getRoute)

    $("#btn-home").on("touchstart", function () {
        $.mobile.navigate("#main-page");
    });
    $("#btn-addfav").on("touchstart", function () {
        $.mobile.navigate("#addfav-page");                  // Opens the Add Favourites page
    });
    $("#btn-login-main").on("touchstart", function () {
        $.mobile.navigate("#login-page");                  // Opens the Login page
    });
    $("#btn-reg-main").on("touchstart", function () {
        $.mobile.navigate("#register-page");                // Opens the Register page
    });

    $("#btn-regsubmit").on("touchstart", registerUser)
    $("#btn-favsubmit").on("touchstart", addFavourite);     // Add Favourites submit button
    $("#btn-login").on("touchstart", loginPressed);
    $("#sp-logout").on("touchstart", logoutPressed);

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

        makeBasicMap();
        getCurrentlocation();
        loadPOI();
        favouriteList();
        //showLayerGroup();

    });

    $(document).on("pageshow", function (event) {
        console.log("In pageshow. Target is " + event.target.id + ".");
        if (!localStorage.authtoken) {
            console.log("(1) No Token Redirect: In pageshow. Target is " + event.target.id + ".");
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
        console.log("(2) No Token Redirect:")
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
    showOkAlert("Successfully Logged Out");
    $.mobile.navigate("#main-page");
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
            console.log("Got current location")
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

    function createButton(label, container) {
        var btn = L.DomUtil.create('button', '', container);
        btn.setAttribute('type', 'button');
        btn.innerHTML = label;
        return btn;
    }
/*
    map.on('click', function(e) {
    var container = L.DomUtil.create('div'),
        startBtn = createButton('Start from this location', container),
        destBtn = createButton('Go to this location', container);

    L.popup()
        .setContent(container)
        .setLatLng(e.latlng)
        .openOn(map);

    L.DomEvent.on(startBtn, 'click', function() {
        routingControl.spliceWaypoints(0, 1, e.latlng);
        map.closePopup();
    });

    L.DomEvent.on(destBtn, 'click', function() {
        console.log("in dest");
        routingControl.spliceWaypoints(routingControl.getWaypoints().length - 1, 1, e.latlng);
        map.closePopup();
    });
    });
*/


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
function favouriteList()
{
    console.log("In favourites.");

    $.ajax({
    url: HOST + URLS["getfavpoi"],
    dataType:'json',
    //data: data,
    success: function(data) {

        console.log(data);
        //console.log(data[0]);
        //console.log(data.length);
        //console.log(data.data[0].address);
        for (var i=0;i<data.length;i++)
        {
            var myLatLon = L.latLng(data[i].latitude,data[i].longitude );
            var lat = data[i].latitude;
            var lng = data[i].longitude;
            var popupContent = "Name: " + data[i].name + "<br>Address: " + data[i].address + "<br> Phone No: " + data[i].contactNumber + "<br> Last Update: " + data[i].lastUpdate;
            //var popupContent = "Name: " + data.data[i].name + "<br>Address: " + data.data[i].address + "<br> Description: " + data.data[i].description  + "<br> Phone No: " + data.data[i].contactNumber;

            var favmarker = L.marker([data[i].latitude, data[i].longitude], {icon: favIcon}).bindPopup(popupContent).on('click', markerOnClick);
            favmarkers.push(favmarker);
        }
        map.removeLayer(markerLayerPOI);
        map.removeLayer(markerLayerFav);
        showLayerGroup();
    }
    });
}

function addFavourite() {

    navigator.geolocation.getCurrentPosition(
    function(position) {
        localStorage.longitude = position.coords.longitude
        localStorage.latitude = position.coords.latitude;
        //alert(position.coords.latitude + ',' + position.coords.longitude);
    },
    function() {
        alert('Error getting location');
    });


    var csrftoken = $.cookie('csrftoken');

    function csrfSafeMethod(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|POST|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });

    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0
    var yyyy = today.getFullYear();

    if(dd<10) {
        dd = '0'+dd
    }
    if(mm<10) {
        mm = '0'+mm
    }
    today = dd + '/' + mm + '/' + yyyy;

    $.ajax({
    type: "POST",
    headers: {"Authorization": localStorage.authtoken},
    url: HOST + URLS["getfavpoi"],
    dataType:'json',
    data: {
        csrfmiddlewaretoken: '{{ csrf_token }}',
        name: $("#in-name").val(),
        latitude: localStorage.latitude,
        longitude: localStorage.longitude,
        address: $("#in-address").val(),
        description: $("#in-description").val(),
        contactNumber: $("#in-contactNumber").val(),
        imageFileName: $("#in-imageFileName").val(),
        lastUpdate:  today
    },
    }).done(function (data, status, xhr) {
        $.mobile.navigate("#map-page");
        alert("Favourite Added");
        favouriteList();
    }).fail(function (xhr, status, error) {
        var message = "Failed\n";
        if ((!xhr.status) && (!navigator.onLine)) {
            message += "Bad Internet Connection\n";
        }
        message += "Status: " + xhr.status + " " + xhr.responseText;
        alert(message);
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


function loadPOI() {

    console.log("In loadPOI.");
    $.ajax({
    url: HOST + URLS["getpoi"],
    dataType:'json',
    //data: data,
    success: function(data) {

        console.log(data);
        //console.log(data.data[0].address);

        for (var i=0;i<data.data.length;i++)
        {
            var myLatLon = L.latLng(data.data[i].latitude,data.data[i].longitude );
            var lat = data.data[i].latitude;
            var lng = data.data[i].longitude;
            var popupContent = "Name: " + data.data[i].name + "<br>Address: " + data.data[i].address + "<br> Phone No: " + data.data[i].contactNumber;

            //L.marker([data.data[i].latitude, data.data[i].longitude], {icon: poiIcon}).addTo(map);
            var marker = L.marker([data.data[i].latitude, data.data[i].longitude], {icon: poiIcon}).bindPopup(popupContent).on('click', markerOnClick);
            poimarkers.push(marker);
        }
        showLayerGroup();
    }
    });

}

function showLayerGroup() {
    console.log("In showLayerGroup.");
    console.log(poimarkers);
    console.log(favmarkers);
    //map.removeLayer(markerLayerPOI);
    //map.removeLayer(markerLayerFav);
    //map.removeLayer(myoverlays);
    markerLayerPOI = L.layerGroup(poimarkers);
    markerLayerFav = L.layerGroup(favmarkers);
    var myoverlays = { "Attractions": markerLayerPOI, "User Added": markerLayerFav};
    console.log("The overlays: " + myoverlays);
    //var overlayPOI = { "Attractions": markerLayerPOI};
    //var overlayFav = { "User Added": markerLayerFav};
    //L.control.layers(null, myoverlays, {position: 'bottomright'}).addTo(map);
    L.control.layers(null, myoverlays).addTo(map);
}

function markerOnClick(e)
{
    console.log("marker on click");
    //alert("hi. you clicked the marker at " + e.latlng);
    //alert("name: " + e.name);
    //console.log(attributes.toString());

    $("#btn-navigate").on("touchstart", navigate(e.latlng));
    //navigate(e.latlng);
    
}

function navigate(dest) {
    console.log("In navigate");
    console.log(dest);

    removeRoutingControl();

    var mynewPos = JSON.parse(localStorage.lastKnownCurrentPosition);
    var mynewLatLon = L.latLng(mynewPos.coords.latitude, mynewPos.coords.longitude);
    console.log(mynewLatLon);

    routingControl = L.Routing.control({
        createMarker: function() { return null; }
    });
    //routingControl.addTo(map);

    routingControl.setWaypoints([mynewLatLon, dest]);

}

function getRoute() {
    routingControl.addTo(map);
}
function registerUser() {

    var csrftoken = $.cookie('csrftoken');

    function csrfSafeMethod(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|POST|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });

    $.ajax({
    type: "POST",
    //headers: {"Authorization": localStorage.authtoken},
    url: HOST + URLS["register"],
    dataType:'json',
    data: {
        csrfmiddlewaretoken: '{{ csrf_token }}',
        username: $("#in-regusername").val(),
        email: $("#in-regemail").val(),
        first_name: $("#in-regfirst").val(),
        last_name: $("#in-reglast").val(),
        password: $("#in-regpassword").val(),
    },

    }).done(function (data, status, xhr) {
        $.mobile.navigate("#map-page");
        alert("Registration Successful");
    }).fail(function (xhr, status, error) {
        var message = "Failed\n";
        if ((!xhr.status) && (!navigator.onLine)) {
            message += "Bad Internet Connection\n";
        }
        message += "Status: " + xhr.status + " " + xhr.responseText;
        alert(message);
    });
}

var removeRoutingControl = function () {
    if (routingControl != null) {
        map.removeControl(routingControl);
        routingControl = null;
        console.log("route removed");
    }
};

