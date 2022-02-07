import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import _ from "lodash";
const app = express();
const server = createServer(app);
const io = new Server(server);

interface user {
  room: string;
  uname: string;
  key: string;
  id: string;
}

function usersWith(room: string, uname: string) {
  let i = 0;
  for (let user of users) {
    if (user.room === room) {
      i++;
    }
    if (user.uname === uname) {
      i += 2;
    }
  }

  return i;
}

let users: user[] = [];

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("join_room", ({ room, uname, key }: user) => {
    const t = usersWith(room, uname);
    if (t < 2) {
      socket.join(room);
      socket.emit(
        "users",
        users.filter((user) => user.room === room)
      );
      users.push({ room, uname, key, id: socket.id });
      socket.broadcast.to(room).emit("new_user", { uname, key });
    } else {
      socket.emit("full_room", { room, uname, key });
    }
  });
  socket.on("message_server", (res) => {
    socket.broadcast.to(res.room).emit("message_client", res);
  });
  socket.on("disconnect", () => {
    let ind = users.findIndex((user) => user.id === socket.id);

    if (ind > -1) {
      socket.broadcast.to(users[ind].room).emit("user_left", users[ind]);
      users.splice(ind, 1);
    }
  });
});

app.use(express.static("public"));

server.listen(4000, () => {
  console.log("listening on port 4000");
});
