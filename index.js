//set up server
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

//additional setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static("public"));
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use("/", express.static("public"));

const clients = new Set(); //a js storage object, similiar to array, but will prevent duplicate data

const serverState = {
  // Example 1 state
  ledOn: false,

  // Example 2 state
  brightness: 128,
  pulseRate: 50,
  servoAngle: 90,
};

//helpter function for brodcasting data to clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

//web socket stuff

wss.on("connection", (ws, req) => {
  //ws is the connected client
  console.log("New client connected");
  clients.add(ws); //add the connected client to the clients set

  // Send current state to newly connected client
  ws.send(
    JSON.stringify({
      type: "initialState",
      state: serverState,
    })
  );

  //add these event listeners to the client
  ws.on("message", (incomingData) => {
    try {
      const data = JSON.parse(incomingData); //incomingData string as json
      console.log("Received:", data); //peek at the incoming data

      // Example 1: Button toggle
      if (data.type === "buttonPress") {
        serverState.ledOn = !serverState.ledOn; //toggle the led state
        console.log("Button toggled to:", serverState.buttonPressed);
        broadcast({ type: "ledState", value: serverState.ledOn });
      }

      // Example 2: Slider controls
      if (data.type === "brightness") {
        serverState.brightness = data.value;
        broadcast({ type: "brightness", value: data.value });
      }

      if (data.type === "pulse") {
        serverState.pulseRate = data.value;
        broadcast({ type: "pulse", value: data.value });
      }

      if (data.type === "servo") {
        serverState.servoAngle = data.value;
        broadcast({ type: "servo", value: data.value });
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    clients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

//database business - from pcomp one zoom
// object to give lowdb to start, aka a schema
const data = {
  readings: [],
  lightState: false,
};

const adapter = new JSONFile("db.json");
const db = new Low(adapter, data); // Changed from 'items' to 'readings'

// Initialize db
await db.read();

// Routes

// example one, server holds led state (on or off).
// web interface for changing the state found in public/index.html
// arduino polls the server every 10 seconds to see if the state has changed and turns on/off an led accordinly.

// GET route - see what the current led status is.
app.get("/led", async (req, res) => {
  await db.read();
  res.json({ lightState: db.data.lightState });
});

// POST route - change the led state
app.post("/led", async (req, res) => {
  console.log("toggle led state");

  await db.read();
  db.data.lightState = !db.data.lightState;
  await db.write();

  res.json({ lightState: db.data.lightState });
});

// example two, arduino sends data to the server
// web interface for seeing the readings

// GET route - retrieve all readings
app.get("/data", async (req, res) => {
  await db.read();
  res.json(db.data.readings);
});

// POST route - add a reading to the readings array
app.post("/data", async (req, res) => {
  console.log("Received:", req.body);

  await db.read();
  db.data.readings.push(req.body);
  await db.write();
  res.status(201).json(req.body);
});

//'port' variable allows for deployment
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

//old code, here for reference if we need to build into new code

//Initialize HTTP server
// let http = require("http");
// let server = http.createServer(app);
//local port
// let port = process.env.PORT || 3000;
// server.listen(port, () => {
//   console.log("App listening at port: " + port);
// });

//Initialize socket.io
// let io = import("socket.io");
// io = new io.Server(server);
// let users = {};

// //Listen for a client to connect and disconnect
// io.on("connection", (socket) => {
//   console.log("We have a new client: " + socket.id);

//   socket.on("userData", function (data) {
//     // Add socket id to user data
//     data.id = socket.id;

//     // Store user data
//     users[socket.id] = data;

//     console.log(data);

//     // Broadcast updated user data to all clients
//     io.sockets.emit("userData", data);
//   });

//   //PLANKTON
//   //listen for plankton click
//   socket.on("plankton", function (data) {
//     console.log("plankton was pressed by " + data.name);

//     //send this info to everyone
//     io.emit("plankton", data);
//   });

//   //SEAWEED
//   //listen for seaweed click
//   socket.on("seaweed", function (data) {
//     console.log("seaweed was pressed by " + data.name);
//     io.emit("seaweed", data);
//   });

//   //ANGLER
//   //listen for angler mousedown
//   socket.on("angler", function (data) {
//     console.log("angler was pressed by " + data.name);
//     io.emit("angler", data);
//   });

//   //JELLY
//   //listen for jelly mousedown
//   socket.on("jelly", function (data) {
//     console.log("jelly was pressed by " + data.name);
//     io.emit("jelly", data);
//   });

//   //URCHIN
//   //listen for urchin mousedown
//   socket.on("urchin", function (data) {
//     console.log("urchin is being pressed by " + data.name);
//     io.emit("urchin", data);
//   });

//   //EEL
//   //listen for eel mousedown
//   socket.on("eel", function (data) {
//     console.log("eel is being pressed by " + data.name);
//     io.emit("eel", data);
//   });

//   //ANGEL
//   //listen for angel mousedown
//   socket.on("angel", function (data) {
//     console.log("angel is being pressed by " + data.name);
//     io.emit("angel", data);
//   });

//   //SEAWEED2
//   //listen for seaweed2 mousedown
//   socket.on("seaweed2", function (data) {
//     console.log("seaweed2 is being pressed by " + data.name);
//     io.emit("seaweed2", data);
//   });

//   //listen for seaweed2 mouseup
//   socket.on("seaweed2-not-pressed", function (data) {
//     console.log("seaweed2 is not being pressed by " + data.name);
//     io.emit("seaweed2-not-pressed", data);
//   });

//   //GEAR
//   //listen for gearsnail mousedown
//   socket.on("gearsnail", function (data) {
//     console.log("gearsnail is being pressed by " + data.name);
//     io.emit("gearsnail", data);
//   });

//   //listen for client disconnect
//   socket.on("disconnect", function () {
//     console.log("Client has disconnected: " + socket.id);
//   });
// });

//listen for ghost location - old code, here for ref
//   socket.on("ghost", (data) => {
//     console.log("Received 'ghost' with the following data:");
//     console.log(data);

//     //Send data to ALL clients, including this one
//     io.emit("ghost", data);
//   });

// socket.on("plankton", function (data) {
//   console.log("plankton is being pressed by " + data.name);

//   //send this info to everyone
//   io.emit("plankton", data);
// });

//listen for plankton mouseup
// socket.on("plankton-not-pressed", function (data) {
//   console.log("plankton is not being pressed by " + data.name);

//   //send this info to everyone
//   io.emit("plankton-not-pressed", data);
// });

//draw cursor - not working rn
// socket.on("draw_cursor", (data) => {
//   io.emit("draw_cursor", { line: data.line, id: socket.id });
// });
