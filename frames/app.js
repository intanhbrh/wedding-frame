const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const W = 1080, H = 1920;

let stream, facing = "user", frameImg = new Image(), finalBlob = null;
frameImg.src = "frames/frame1.png";

// 1. Start camera
async function startCamera() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
    audio: false
  });
  video.srcObject = stream;
}
startCamera().catch(() => alert("Please allow camera access, or use Gallery."));

// 2. Pick frame
document.querySelectorAll(".frame-thumb").forEach(img => {
  img.onclick = () => {
    document.querySelectorAll(".frame-thumb").forEach(i => i.classList.remove("active"));
    img.classList.add("active");
    frameImg = new Image();
    frameImg.src = img.dataset.src;
  };
});

// 3. Draw source (cover-fit) + frame onto canvas
function drawCover(source, sw, sh) {
  const scale = Math.max(W / sw, H / sh);
  const dw = sw * scale, dh = sh * scale;
  ctx.drawImage(source, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function compose(source, sw, sh, mirror = false) {
  ctx.save();
  if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  drawCover(source, sw, sh);
  ctx.restore();
  ctx.drawImage(frameImg, 0, 0, W, H);
  canvas.toBlob(b => { finalBlob = b; }, "image/jpeg", 0.92);
  canvas.style.display = "block";
  document.getElementById("result").hidden = false;
}

// 4. Snap
document.getElementById("snap").onclick = () => {
  compose(video, video.videoWidth, video.videoHeight, facing === "user");
};

// 5. Gallery
document.getElementById("file").onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => compose(img, img.width, img.height);
  img.src = URL.createObjectURL(f);
};

// 6. Flip camera
document.getElementById("flip").onclick = () => {
  facing = facing === "user" ? "environment" : "user";
  startCamera();
};

// 7. Retake
document.getElementById("retake").onclick = () => {
  canvas.style.display = "none";
  document.getElementById("result").hidden = true;
};

// 8. Save to phone
document.getElementById("save").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(finalBlob);
  a.download = "wedding-photo.jpg";
  a.click();
};

// 9. Share (opens phone share sheet, where Instagram appears)
document.getElementById("share").onclick = async () => {
  const file = new File([finalBlob], "wedding-photo.jpg", { type: "image/jpeg" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "Sarah & Adam's Wedding" });
  } else {
    alert("Sharing isn't supported here. Use Save to Phone, then post from your gallery.");
  }
};