var app = require("express")();
var server = require("http").createServer(app);
// http server를 socket.io server로 upgrade한다
var io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const room_info = {};

const makeRandomName = () => {
  var name = "";
  var possible = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (var i = 0; i < 5; i++) {
    name += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return name;
};

// connection event handler
// connection이 수립되면 event handler function의 인자로 socket인 들어온다
io.on("connection", (socket) => {
  console.log("Socket ID : " + socket.id);

  // 접속한 클라이언트의 정보 수신
  socket.on("login", (data) => {
    if (data.type === "create" || data.type === "join") {
      console.log(
        "Client logged-in:\n name:" +
          data.name +
          "\n room: " +
          data.room +
          "\n type: " +
          data.type
      );

      var room_name = makeRandomName();

      // 클라이언트 정보 소켓에 저장
      socket.name = data.name;
    }

    // 클라이언트의 접속 방식을 확인하여 처리
    // 방 생성의 경우
    if (data.type === "create") {
      // 새로운 방 정보 생성
      room_info[room_name] = {
        player: [
          {
            id: socket.id,
            name: data.name,
          },
        ],
        ready: [false, false],
      };

      // 방 이름 소켓에 저장
      socket.room = room_name;

      // 클라이언트에 현재 방 상태 전달
      socket.emit("create", {
        name: data.name,
        room: room_name,
      });
    }
    // 방 참여의 경우
    else if (data.type === "join") {
      console.log(data.room in room_info);
      // 기존 방 존재 여부 확인
      if (!(data.room in room_info)) {
        console.log(socket.id + " access Wrong Room");
        socket.emit("e_msg", data.room + " is not valid!");
        return;
      }

      // 기존 방에 사용자 추가
      room_name = data.room;
      room_info[room_name].player.push({
        id: socket.id,
        name: data.name,
      });

      // 방 이름 소켓에 저장
      socket.room = room_name;

      // 현재 클라이언트에게 정보 전달
      socket.emit("join", {
        name: data.name,
        roomId: data.room,
        opponent: room_info[room_name].player[0].name,
      });

      // 상대방에게 클라이언트 정보 전달
      io.to(room_info[room_name].player[0].id).emit("newPlayer", data.name);
    }
    console.log("room info");
    console.log(room_info);
  });

  // 클라이언트로부터 버튼 클릭 수신
  socket.on("play", (data) => {
    // 상대방에게 클라이언트 정보 전달
    io.to(room_info[data.room].player[1 - data.player].id).emit("play", data);
    console.log(socket.id + " : Play");
  });

  // force client disconnect from server
  socket.on("forceDisconnect", function () {
    socket.disconnect();
  });

  socket.on("disconnect", function () {
    console.log("user disconnected: " + socket.name);
  });
});

server.listen(3001, function () {
  console.log("Socket IO server listening on port 3000");
});
