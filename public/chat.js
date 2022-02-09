const usersArea = document.getElementById("users");
const current = document.getElementById("current");
const roomDiv = document.getElementById("room");
const all = document.getElementById("all");
const msg = document.getElementById("msg");
const inpt = document.getElementById("inpt");
const messages = document.getElementById("messages");
function hexToAB(hex) {
  return new Uint8Array(
    hex.match(/[\da-f]{2}/gi).map(function (h) {
      return parseInt(h, 16);
    })
  );
}
let combined;
const users = [];
let myKey;

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const socket = io();
const params = Qs.parse(location.search.substring(1));
roomDiv.innerText = `Room: ${params.room}`;
current.innerText = `Username: ${params.uname}`;

async function main() {
  const iv = new Uint8Array(
    Array.from(Array(16)).map((x) => Math.floor(Math.random() * 100))
  );
  const encrypt = async (msg) => {
    const enc = await cryptos.encrypt(
      { name: "AES-CBC", iv },
      combined,
      new TextEncoder().encode(msg)
    );
    return bufferToHex(enc);
  };
  const decrypt = async (enc, ivs) => {
    const dec = await cryptos.decrypt(
      { name: "AES-CBC", iv: hexToAB(ivs) },
      combined,
      hexToAB(enc)
    );
    return new TextDecoder("utf-8").decode(dec);
  };
  const getCombined = async () => {
    const ket = hexToAB(users[0].key);
    myKey = await cryptos.importKey(
      "spki",
      ket,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );
    combined = await cryptos.deriveKey(
      {
        name: "ECDH",
        public: myKey,
      },
      key.privateKey,
      {
        name: "AES-CBC",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    );
  };
  const { subtle: cryptos } = crypto;

  const key = await cryptos.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const exports = bufferToHex(await cryptos.exportKey("spki", key.publicKey));
  console.log(exports);
  socket.emit("join_room", {
    uname: params.uname,
    key: exports,
    room: params.room,
  });
  socket.on("new_user", async (res) => {
    const li = document.createElement("li");
    li.innerText = res.uname;
    usersArea.appendChild(li);
    console.log(res);
    users.push(res);
    await getCombined();
    console.log(combined);
  });
  socket.on("full_room", () => {
    alert("room full");
    location.href = "http://localhost:4000";
  });
  socket.on("user_left", (user) => {
    let ind = users.findIndex((x) => (x.id = user.id));
    if (ind > -1) {
      users.splice(ind, 1);
      for (let userli of usersArea.children) {
        if (userli.innerText === user.uname) {
          usersArea.removeChild(userli);
        }
      }
    }
  });
  socket.on("users", async (res) => {
    for (let user of res) {
      const li = document.createElement("li");
      li.innerText = user.uname;
      usersArea.appendChild(li);
      users.push(user);
    }
    if (users.length > 0) {
      await getCombined();
      console.log(combined);
    }
  });

  msg.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = document.createElement("p");
    p.classList.add(["me"]);
    p.innerText = `${inpt.value} from You`;
    messages.appendChild(p);
    const enc = await encrypt(inpt.value);
    socket.emit("message_server", {
      room: params.room,
      uname: params.uname,
      message: enc,
      iv: bufferToHex(iv),
    });
    inpt.value = "";
  });
  socket.on("message_client", async (res) => {
    const msgss = await decrypt(res.message, res.iv);
    const p = document.createElement("p");
    p.classList.add(["other"]);
    p.innerText = `${msgss} from ${res.uname}`;
    messages.appendChild(p);
  });
}
main();
