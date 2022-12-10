import { useEffect, useRef } from 'react';

const useSocket = () => {
  const socket = useRef(false);
  useEffect(() => {
    if (!socket.current) {
      const socketInitializer = async () => {
        await fetch('/api/socket').then(e => {
          console.log('connected', e);
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

export default useSocket;
