/*
* (C) Copyright 2014 Kurento (http://kurento.org/)
*
* All rights reserved. This program and the accompanying materials
* are made available under the terms of the GNU Lesser General Public License
* (LGPL) version 2.1 which accompanies this distribution, and is available at
* http://www.gnu.org/licenses/lgpl-2.1.html
*
* This library is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
* Lesser General Public License for more details.
*
*/

var ws = new WebSocket('ws://139.59.4.43:8443/camera');
var webRtcPeer;
var remoteIceCandidates = [];
var sdpAnswerReceived = false;
ws.onmessage = function(message) {
  var parsedMessage = JSON.parse(message.data);
  //console.info('Received message: ' + message.data);

  switch (parsedMessage.id) {
    case 'registerResponse':
      registerResponse(parsedMessage);
      break;
    
    case 'iceCandidate':
      console.log("Setting remote icecandidate " + JSON.stringify(parsedMessage.candidate));
      if(sdpAnswerReceived == true){
        webRtcPeer.addIceCandidate(parsedMessage.candidate)
      }else{
        remoteIceCandidates.push(parsedMessage.candidate);
      }

      break;
    case 'sdpAnswer':
      console.log("Setting sdp answer " + JSON.stringify(parsedMessage.sdpAnswer));
      webRtcPeer.processAnswer(parsedMessage.sdpAnswer);
      sdpAnswerReceived = true;
      console.log("Pushing received remote ice candidates to WebRtcPeer.");
      for(var i = 0; i < remoteIceCandidates.length; i++){
        webRtcPeer.addIceCandidate(remoteIceCandidates[i]);
      }
      break;
    default:
      onError('Unrecognized message', parsedMessage);
  }
}

window.addEventListener('load', function(){
  console = new Console('console', console);
	var videoOutput = document.getElementById('videoOutput');
	var address = document.getElementById('address');
	address.value = 'rtsp://admin:admin_123@192.168.2.183:554/Streaming/Channels/102?transportmode=unicast&profile=Profile_1';
  //address.value = 'http://www.w3schools.com/TAGS/movie.mp4';
  var pipeline;
  

  startButton = document.getElementById('start');
  startButton.addEventListener('click', start);

  stopButton = document.getElementById('stop');
  stopButton.addEventListener('click', stop);

  function start() {
  	if(!address.value){
  	  window.alert("You must set the video source URL first");
  	  return;
  	}
  	address.disabled = true;
  	//showSpinner(videoOutput);
    var options = {
      remoteVideo : videoOutput,
      configuration: {
            iceServers:[
             { "url": "turn:139.59.4.43:3478",
               "username": "kurento",
               "credential": "kurento"
             }
           ]
      }
    };

    register();

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
      function(error){
        if(error){
          return console.error(error);
        }
        webRtcPeer.generateOffer(onOffer);
        webRtcPeer.peerConnection.addEventListener('iceconnectionstatechange', function(event){
          if(webRtcPeer && webRtcPeer.peerConnection){
            console.log("oniceconnectionstatechange -> " + webRtcPeer.peerConnection.iceConnectionState);
            console.log('icegatheringstate -> ' + webRtcPeer.peerConnection.iceGatheringState);
          }
        });
        setIceCandidateCallbacks();
    });

    
  }

  function onOffer(error, sdpOffer){
    if(error) return onError(error);

    var message = {
      id : 'sdpOffer',
      name: 'peer',
      cam_url: address.value,
      sdpOffer : sdpOffer
    };
    sendMessage(message);
  	
  }

  
  function stop() {
    address.disabled = false;
    if (webRtcPeer) {
      webRtcPeer.dispose();
      webRtcPeer = null;
    }
    if(pipeline){
      pipeline.release();
      pipeline = null;
    }
    hideSpinner(videoOutput);
  }

});


function registerResponse(response){
  console.log("Response: " + JSON.stringify(response));
  var status = response.status;
  var result = response.result;
  if (status == 'error'){
    //setRegisterState(NOT_REGISTERING);
     return;
  }

  if (result == 'registered'){
    //setRegisterState(NOT_REGISTERING);
    return;
  }
}


function register() {
  var name = 'peer';

  //setRegisterState(REGISTERING);

  var message = {
    id : 'register',
    isKMS: false,
    name : name
  };
  sendMessage(message);
}

function sendMessage(message) {
  var jsonMessage = JSON.stringify(message);
  console.log('Sending message: ' + jsonMessage);
  ws.send(jsonMessage);
}

function setIceCandidateCallbacks(){
  webRtcPeer.on('icecandidate', function(candidate){
    console.log("Sending local icecandidate " + JSON.stringify(candidate));

    candidate = kurentoClient.register.complexTypes.IceCandidate(candidate);

    var message = {
      id : 'iceCandidate',
      name: 'peer',
      iceCandidate : candidate
    };
    sendMessage(message);

  });
  
}

function onError(error) {
  if(error)
  {
    console.error(error);
    stop();
  }
}

function showSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].poster = 'img/transparent-1px.png';
		arguments[i].style.background = "center transparent url('img/spinner.gif') no-repeat";
	}
}

function hideSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].src = '';
		arguments[i].poster = 'img/webrtc.png';
		arguments[i].style.background = '';
	}
}

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
	event.preventDefault();
	$(this).ekkoLightbox();
});
