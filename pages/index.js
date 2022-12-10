import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

//Public IceServer: https://www.metered.ca/tools/openrelay/
const IceServer = {
  iceServers: [
    {
      urls: 'turn:openreplay.metered.ca:443',
      username: 'openreplayproject',
      credential: 'openreplayproject',
    },
  ],
};

const useSocket = () => {
  const socket = useRef();
  useEffect(() => {
    if (!socket.current) {
      const socketInitializer = async () => {
        await fetch('/api/socket').then(() => {
          console.log('connected');
        });
      };
      try {
        socketInitializer();
        socket.current = true;
      } catch (error) {
        console.log(error);
      }
    }
  }, []);
};

export default function App() {
  //Calling the useSocket function
  useSocket();
  const [errorSetting, seterrorSetting] = useState('');
  const connectionRef = useRef(null); //The peer connection
  const [id, setID] = useState(); //Your roomID
  const [roomId, setRoomId] = useState(''); //The roomID
  const socket = useRef(); //The socket instance
  const myVideoRef = useRef(); //Your video
  const peerVideoRef = useRef(); //The other users video
  const myStreamRef = useRef(); //Our video stream
  const host = useRef(false); //Host instance
  const [done, setdone] = useState(false);

  useEffect(() => {
    //Getting our Video and Audio
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: true,
      })
      .then(stream => {
        myStreamRef.current = stream;
        //Storing our video
        myVideoRef.current.srcObject = stream;
      })
      .catch(err => {
        /* handle the error */
        console.log(err);
      });
  }, []);
  useEffect(() => {
    socket.current = io();

    //Getting the `roomId` from the server
    socket.current.on('me', roomId => {
      //Saving the roomId got from the server
      setID(roomId);
    });
    //Listening for a `full` event from the server
    socket.current.on('full', () => {
      seterrorSetting('Room is filled');
    });
    //Listening for a `not-existing` event from the server
    socket.current.on('not-existing', () => {
      seterrorSetting("Room doesn't exist");
    });
    //Setting the host
    socket.current.on('created', () => (host.current = true));
    //Starting the video call when we receive a ready event
    socket.current.on('ready', startCall);

    /* WebRTC */

    //Getting the offer
    socket.current.on('offer', receiveOfferHandler);
    //Getting the answer
    socket.current.on('answer', handleAnswer);
    //Getting the icecandidate
    socket.current.on('ice-candidate', newIceCandidate);

    return () => socket.current.disconnect();
  }, [roomId]);
  const peerConnection = () => {
    // Creating the Peer Connection
    const connection = new RTCPeerConnection(IceServer);

    //Getting the icecandidate from the IceServer
    connection.onicecandidate = e => {
      console.log('icecandidate');
      if (e.candidate) {
        //when it receives the ice candidate, it sends the ice candidate to the server
        socket.current.emit('ice-candidate', e.candidate, roomId);
      }
    };
    //Getting the streams.
    connection.ontrack = e => {
      console.log('track receiving', e);
      //When it receives the peer's video, it stores the stream in peerVideoref
      peerVideoRef.current.srcObject = e.streams[0];
    };
    return connection;
  };
  const startCall = roomiid => {
    console.log('call initiated');

    if (host.current) {
      //Setting the host's peerConnection
      connectionRef.current = peerConnection();

      myStreamRef.current.getTracks().forEach(element => {
        //Storing the stream of the host in the peerConnection
        connectionRef.current.addTrack(element, myStreamRef.current);
      });

      //Creating the offer
      connectionRef.current
        .createOffer()
        .then(offer => {
          connectionRef.current.setLocalDescription(offer);
          //Sending the offer to the server
          socket.current.emit('offer', offer, roomiid);
        })
        .catch(error => {
          console.log(error);
        });
    }
  };
  const receiveOfferHandler = (offer, roomiid) => {
    if (!host.current) {
      //Setting the other user's peerConnection
      connectionRef.current = peerConnection();

      myStreamRef.current.getTracks().forEach(element => {
        //Storing the stream of the other user in the peerConnection
        connectionRef.current.addTrack(element, myStreamRef.current);
      });
      //Storing the host's offer that was received.
      connectionRef.current.setRemoteDescription(offer);

      //Create an answer
      connectionRef.current
        .createAnswer()
        .then(answer => {
          connectionRef.current.setLocalDescription(answer);
          //Sending the answer to the server
          socket.current.emit('answer', answer, roomiid);
          setdone(true);
        })
        .catch(error => {
          console.log(error);
        });
    }
  };
  const handleAnswer = answer => {
    if (host.current) {
      console.log('receiving answer');
      setdone(true);
      connectionRef.current
        .setRemoteDescription(answer)
        .catch(err => console.log(err));
    }
  };
  const newIceCandidate = incomingIce => {
    console.log('receiving new icecandidate');
    const candidate = new RTCIceCandidate(incomingIce);
    connectionRef.current
      .addIceCandidate(candidate)
      .catch(err => console.log(err));
  };
  const roomCreate = () => {
    //Signaling the server to create a room
    socket.current.emit('create-room');
  };
  const joinRoom = () => {
    //Signaling the server to join the user to the room
    socket.current.emit('join-room', roomId);
  };

  return (
    <>
      <div className="container">
        <div>
          <video autoPlay ref={myVideoRef} muted playsInline width={'500px'} />
          <h1>User</h1>
        </div>
        <div>
          <video autoPlay ref={peerVideoRef} playsInline width={'500px'} />
          {done && <h1>Peer</h1>}
        </div>
      </div>
      <div className="div">
        <button onClick={roomCreate} style={{ marginBottom: '10px' }}>
          Create Room
        </button>
        {id && <h2>Copy Id: {id}</h2>}
        <input
          type="text"
          value={roomId}
          onChange={e => setRoomId(e.target.value)}
          style={{ marginBottom: '20px' }}
        />
        <button onClick={joinRoom}>Join Room</button>
        <h1>{errorSetting}</h1>
      </div>
    </>
  );
}
