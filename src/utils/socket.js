import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
  if (typeof window === "undefined") return null;

  if (!socket) {
    socket = io(window.location.origin, {
      transports: ["websocket"],
      reconnection: false,
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("Socket connected");
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  }

  return socket;
};