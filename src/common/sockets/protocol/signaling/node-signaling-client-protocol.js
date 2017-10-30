import {nodeProtocol, nodeFallBackInterval} from '../../../../consts/const_global.js';

import {NodesWaitlist} from '../../../../node/lists/waitlist/nodes-waitlist.js';
import {NodeProtocol} from './../node-protocol.js';
import {SignalingRoomList} from './../../../../node/lists/signaling-room/signaling-room-list'
import {NodeWebPeer} from './../../../../node/webrtc/web_peer/node-web-peer'

class NodeSignalingClientProtocol {

    constructor(){
        console.log("NodeSignalingClientProtocol constructor");
    }

    /*
        Signaling Server Service
     */

    initializeSignalingClientService(socket){


        socket.on("signals/client/generate-initiator-signal", async (data) => {

            let webPeer = new NodeWebPeer(true);
            await webPeer.peer.signal;

            webPeer.sendRequest("signals/client/generate-initiator-signal/"+data.id, JSON.stringify( webPeer.peer.signal ))

        });

        socket.on("signals/client/generate-answer-signal", data =>{

        });

        socket.on("signals/client/join-answer-signal", data =>{

        });

    }



    registerSignal(signal){

        node.protocol.broadcastMessageAllSockets("node_propagation", {instruction: "new-address", addresses: addresses });

    }



}

exports.NodeSignalingClientProtocol = new NodeSignalingClientProtocol();
