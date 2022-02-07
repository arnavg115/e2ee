const uname = document.getElementById("uname");
const room = document.getElementById("room");
const btn = document.getElementById("join");

btn.addEventListener("click", () => {
  location.href = `http://localhost:4000/chat.html?uname=${uname.value}&room=${room.value}`;
});
