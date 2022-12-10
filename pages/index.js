import { useEffect, useRef, useState } from 'react';
import useSocket from '../hooks/useSocket';
import { io } from 'socket.io-client';

const IceServer = {
  iceServers: [
    {
      urls: 'turn:openreplay.metered.ca:443',
      username: 'openreplayproject',
      credential: 'openreplayproject',
    },
  ],
};

export default function App() {
  //Calling the useSocket function
  useSocket();
  const [errorSetting, seterrorSetting] = useState('');
  const [done, setdone] = useState(false);
  const [id, setID] = useState();
  const [roomId, setRoomId] = useState('');
  const myVideoRef = useRef(); //Your video
  const peerVideoRef = useRef(); //The other users video
  const myStreamRef = useRef(); //Our video stream
  const connectionRef = useRef(null);
  const socket = useRef();
  const host = useRef(false);

  const roomCreate = () => {
    socket.current.emit('create-room');
  };
  const joinRoom = () => {
    socket.current.emit('join-room', roomId);
  };

  // const createRoom = () => {
  //   host.current = true;
  // };
  const newIceCandidate = incomingIce => {
    console.log('receiving new icecandidate');
    // We cast the incoming candidate to RTCIceCandidate
    const candidate = new RTCIceCandidate(incomingIce);
    connectionRef.current.addIceCandidate(candidate).catch(e => console.log(e));
  };
  // const trackEventHandler = event => {
  //   console.log('track receiving', event);
  //   peerVideoRef.current.srcObject = event.streams[0];
  // };
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
    // First we join a room

    socket.current.on('me', roomId => {
      setID(roomId);
    });
    socket.current.on('full', () => {
      seterrorSetting('Room is filled');
    });
    socket.current.on('created', () => (host.current = true));
    socket.current.on('not-existing', () => {
      seterrorSetting("Room doesn't exist");
    });
    socket.current.on('ready', startCall);

    //WebRTC
    socket.current.on('offer', receiveOfferHandler);
    socket.current.on('answer', handleAnswer);
    socket.current.on('ice-candidate', newIceCandidate);

    return () => socket.current.disconnect();
  }, [roomId]);
  const receiveOfferHandler = (offer, roomiid) => {
    if (!host.current) {
      connectionRef.current = peerConnection();

      myStreamRef.current.getTracks().forEach(element => {
        connectionRef.current.addTrack(element, myStreamRef.current);
      });
      connectionRef.current.setRemoteDescription(offer);

      connectionRef.current
        .createAnswer()
        .then(answer => {
          setdone(true);
          connectionRef.current.setLocalDescription(answer);
          socket.current.emit('answer', answer, roomiid);
        })
        .catch(error => {
          console.log(error);
        });
    }
  };
  const handleAnswer = answer => {
    if (host.current) {
      console.log('receiveing answer');
      setdone(true);
      connectionRef.current
        .setRemoteDescription(answer)
        .catch(err => console.log(err));
    }
  };
  const startCall = roomiid => {
    console.log('call initiated');

    if (host.current) {
      connectionRef.current = peerConnection();

      myStreamRef.current.getTracks().forEach(element => {
        connectionRef.current.addTrack(element, myStreamRef.current);
      });

      connectionRef.current
        .createOffer()
        .then(offer => {
          connectionRef.current.setLocalDescription(offer);

          socket.current.emit('offer', offer, roomiid);
        })
        .catch(error => {
          console.log(error);
        });
    }
  };
  const iceCandidate = event => {
    console.log('icecandidate');
    if (event.candidate) {
      socket.current.emit('ice-candidate', event.candidate, roomId);
    }
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
