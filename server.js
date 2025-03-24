import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("wss://react-node-backend-production.up.railway.app", {
  transports: ["websocket", "polling"],
  withCredentials: true
});

function App() {
  const [userId, setUserId] = useState(null);
  const [friendId, setFriendId] = useState("");
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [connectedFriend, setConnectedFriend] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingText, setTypingText] = useState("");

  useEffect(() => {
    socket.on("userId", (id) => setUserId(id));
    socket.on("friendRequest", (id) => setIncomingRequest(id));
    socket.on("chatStarted", (id) => {
      setConnectedFriend(id);
      setIncomingRequest(null);
    });
    socket.on("displayTyping", (text) => setTypingText(text));
    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
  }, []);

  const startChat = () => {
    socket.emit("start");
  };

  const sendRequest = () => {
    socket.emit("sendRequest", friendId);
  };

  const acceptRequest = () => {
    socket.emit("acceptRequest", incomingRequest);
    setIncomingRequest(null);
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit("typing", e.target.value);
  };

  const sendMessage = () => {
    if (message.trim() !== "") {
      socket.emit("sendMessage", message);
      setMessages((prev) => [...prev, { sender: userId, text: message }]);
      setMessage("");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      {!userId ? (
        <button onClick={startChat}>Start</button>
      ) : (
        <div>
          <h3>Your ID: {userId}</h3>

          {connectedFriend ? (
            <div>
              <h4>Chatting with: {connectedFriend}</h4>
              <input 
                type="text" 
                placeholder="Type here..." 
                value={message} 
                onChange={handleTyping} 
              />
              <button onClick={sendMessage}>Send</button>
              <p>Live Typing: {typingText}</p>

              <div>
                {messages.map((msg, index) => (
                  <p key={index}>
                    <b>{msg.sender === userId ? "You" : "Friend"}:</b> {msg.text}
                  </p>
                ))}
              </div>
            </div>
          ) : incomingRequest ? (
            <div>
              <p>Friend Request from {incomingRequest}</p>
              <button onClick={acceptRequest}>Accept</button>
            </div>
          ) : (
            <div>
              <input 
                type="text" 
                placeholder="Enter friend ID" 
                value={friendId} 
                onChange={(e) => setFriendId(e.target.value)} 
              />
              <button onClick={sendRequest}>Send Request</button>
              <p>Share your ID with a friend to chat!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
