const POSE_MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/CmWSWobAH/";

const POSE_THRESHOLD = 0.80;
const STABLE_FRAMES_NEEDED = 4;

let poseModel;
let webcam;
let running = false;

let poseCandidate = null;
let poseCandidateFrames = 0;
let stablePose = null;

let lastPoseData = null;

let eatingStarted = false;
let burgerGone = false;
let roundFinished = false;
let score = 0;

const startButton = document.getElementById("startButton");
const statusText = document.getElementById("statusText");
const webcamContainer = document.getElementById("webcam-container");
const cameraStage = document.getElementById("cameraStage");

const poseLabel = document.getElementById("poseLabel");
const poseBar = document.getElementById("poseBar");
const burgerEl = document.getElementById("burger");
const messageEl = document.getElementById("message");
const scoreEl = document.getElementById("score");

startButton.addEventListener("click", startApp);

function normalize(name) {
  return String(name || "").trim().toLowerCase();
}

function mapPoseClass(className) {
  const name = normalize(className);

  // IMPORTANT: check "not eating" BEFORE "eating"
  if (
    name.includes("not eating") ||
    name.includes("neutral") ||
    name.includes("ready")
  ) {
    return "neutral";
  }

  // Eating / left hand to mouth
  if (
    name === "eating" ||
    name.includes("eating pose") ||
    name.includes("left hand")
  ) {
    return "eating";
  }

  // Finish / right-hand thumbs up
  if (
    name.includes("thumb") ||
    name.includes("finish") ||
    name.includes("right hand")
  ) {
    return "thumbsup";
  }

  return null;
}

async function startApp() {
  if (running) return;

  try {
    startButton.disabled = true;
    statusText.textContent = "Loading pose model…";

    poseModel = await tmPose.load(
      POSE_MODEL_URL + "model.json",
      POSE_MODEL_URL + "metadata.json"
    );

    statusText.textContent = "Requesting camera permission…";

    webcam = new tmPose.Webcam(640, 640, false);
    await webcam.setup();
    await webcam.play();

    webcamContainer.innerHTML = "";
    webcamContainer.appendChild(webcam.canvas);

    running = true;
    startButton.textContent = "Camera Running";
    statusText.textContent = "Pose model loaded.";
    messageEl.textContent = "Raise your left hand to your mouth";

    requestAnimationFrame(loop);
  } catch (error) {
    console.error(error);
    startButton.disabled = false;
    startButton.textContent = "Try Again";
    statusText.textContent =
      "Could not start. Check camera permission and use Live Server.";
  }
}

async function loop() {
  if (!running) return;

  webcam.update();

  try {
    await predict();
  } catch (error) {
    console.error("Prediction error:", error);
  }

  requestAnimationFrame(loop);
}

async function predict() {
  try {
    const poseResult = await poseModel.estimatePose(webcam.canvas);

    lastPoseData = poseResult.pose;

    const predictions =
      await poseModel.predict(poseResult.posenetOutput);

    const bestPose = predictions.reduce((best, item) =>
      item.probability > best.probability ? item : best
    );

    const pct = Math.round(bestPose.probability * 100);

    poseLabel.textContent =
      `${bestPose.className} ${pct}%`;

    poseBar.style.width = `${pct}%`;

    updatePose(bestPose);

  } catch (error) {
    console.error("POSE ERROR:", error);

    poseLabel.textContent = "Pose error";
    messageEl.textContent =
      "Pose model error — check console";
  }
}

function updatePose(prediction) {
  if (prediction.probability < POSE_THRESHOLD) {
    poseCandidateFrames = 0;
    return;
  }

  const mappedPose = mapPoseClass(prediction.className);
  if (!mappedPose) return;

  if (mappedPose === poseCandidate) {
    poseCandidateFrames += 1;
  } else {
    poseCandidate = mappedPose;
    poseCandidateFrames = 1;
  }

  if (poseCandidateFrames < STABLE_FRAMES_NEEDED) return;
  if (mappedPose === stablePose) return;

  stablePose = mappedPose;
  handleStablePose(stablePose);
}

function handleStablePose(pose) {
  if (roundFinished) return;

  if (pose === "neutral") {
    if (!eatingStarted) {
      messageEl.textContent = "Raise your left hand to your mouth";
    } else if (burgerGone) {
      messageEl.textContent = "Now give a right-hand thumbs up";
    }
    return;
  }

  if (pose === "eating" && !eatingStarted) {
    eatingStarted = true;
    showBurgerAtMouth();
    messageEl.textContent = "Eating…";

    // Let the bite animation finish before asking for the finish gesture.
    setTimeout(() => {
      burgerGone = true;
      burgerEl.classList.remove("visible", "eating");
      messageEl.textContent = "Now give a right-hand thumbs up";
      stablePose = null;
      poseCandidate = null;
      poseCandidateFrames = 0;
    }, 1850);

    return;
  }

  if (pose === "thumbsup" && burgerGone && !roundFinished) {
    roundFinished = true;
    score += 1;
    scoreEl.textContent = String(score);
    messageEl.textContent = "Yum! +1";

    setTimeout(resetRound, 1200);
  }
}

function showBurgerAtMouth() {
  moveBurgerToMouth();

  burgerEl.classList.remove("eating");
  void burgerEl.offsetWidth; // restart animation if needed
  burgerEl.classList.add("visible", "eating");
}

function moveBurgerToMouth() {
  const nose = getKeypoint("nose");

  if (!nose || nose.score < 0.35) {
    burgerEl.style.left = "50%";
    burgerEl.style.top = "42%";
    return;
  }

  const canvas = webcam.canvas;
  const stageRect = cameraStage.getBoundingClientRect();

  const xRatio = nose.position.x / canvas.width;
  const yRatio = nose.position.y / canvas.height;

  const x = xRatio * stageRect.width;
  const y = yRatio * stageRect.height + 30;

  burgerEl.style.left = `${x}px`;
  burgerEl.style.top = `${y}px`;
}

function getKeypoint(partName) {
  if (!lastPoseData || !Array.isArray(lastPoseData.keypoints)) return null;

  return (
    lastPoseData.keypoints.find(
      (kp) => normalize(kp.part) === normalize(partName)
    ) || null
  );
}

function resetRound() {
  eatingStarted = false;
  burgerGone = false;
  roundFinished = false;

  stablePose = null;
  poseCandidate = null;
  poseCandidateFrames = 0;

  burgerEl.classList.remove("visible", "eating");
  messageEl.textContent = "Raise your left hand to your mouth";
}
