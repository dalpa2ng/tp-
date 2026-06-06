let pet_name = "물개";
let myBodyColor = "#EBEBFF"; // 몸
let myShadowColor = "#D8D8F7"; // 몸 그림자
let currentAction = "normal";
// 'normal', 'eat', 'happy', 'angry', 'bath', 'sleep'

let actionStartTime = 0; // 액션이 시작된 시점의 시간을 저장
let displayDuration = 3000; // 액션 유지 시간 (3초)

let gameState = "intro"; // 게임 상태: intro(시작 화면) → story1(스토리1) → story2(스토리2) → game(게임 시작)
let checkStory3 = false;


// --- 이미지 미리 로드 ---
function preload() {
bg_home = loadImage("image/home.png");
bg_lab = loadImage("image/lab.png");
bg_sea = loadImage("image/sea.png");

bg_intro = loadImage("image/intro.jpg");
bg_story1 = loadImage("image/story1.jpg");
bg_story2 = loadImage("image/story2.jpg");

bg_story3 = loadImage("image/story3.jpg");
bg_story4 = loadImage("image/story4.jpg");
bg_story5 = loadImage("image/story5.jpg");
bg_story6 = loadImage("image/story6.jpg");
}
// --- 초기 설정 ---
function setup() {
createCanvas(windowWidth, windowHeight);

if (typeof setupFaceCam === 'function') {
    setupFaceCam();
  }

// 게임 상태일 때만 날씨/카메라 초기화
if (gameState === "game") {
loadWeather();
setupFaceCam();
}
}

// --- 매 프레임마다 실행 ---
function draw() {
if (level === 2 && checkStory3 === false) {
gameState = "story3"
checkStory3 = true;
}
// 현재 게임 상태에 따라 다른 화면 표시
if (gameState === "intro") {
drawIntro(); // 시작 화면
} else if (gameState === "story1") {
drawStory1(); // 스토리 1 화면
} else if (gameState === "story2") {
drawStory2(); // 스토리 2 화면
} else if (gameState === "game") {
drawGame(); // 실제 게임 화면
} else if (gameState === "story3") {
drawStory3();
} else if (gameState === "story4") {
drawStory4();
} else if (gameState === "story5") {
drawStory5();
} else if (gameState === "story6") {
drawStory6();
}
}

// --- 시작 화면 ---
function drawIntro() {
background("#FFF8F0");
image(bg_intro, 0, -height * 0.01, width, height * 1.01);

// 안내 문구
textSize(32);
fill("#8f9ffb");
text("클릭하여 시작하기", width - 280, height - 100);
// 깜빡이는 화살표 (1초마다 on/off)
if (frameCount % 60 < 30) {
fill("#8f9ffb");
textSize(24);
text("▼", width - 180, height - 60);
}
}
function drawStory1() {
background("#E8F4F8");
image(bg_story1, 0, -height * 0.08, width, height * 1.08);

// 깜빡이는 화살표
if (frameCount % 60 < 30) {
fill("#566bb8");
textSize(60);
text("▶", width - 100, height - 60);
}
}
function drawStory2() {
background("#00aaff");
image(bg_story2, 0, -height * 0.08, width, height * 1.08);

// 깜빡이는 화살표
if (frameCount % 60 < 30) {
fill("#566bb8");
textSize(60);
text("▶", width - 100, height - 60);
}
}
function drawStory3() {
background("#00aaff");
image(bg_story3, 0, -height * 0.08, width, height * 1.08);

// 깜빡이는 화살표
if (frameCount % 60 < 30) {
fill("#566bb8");
textSize(60);
text("▶", width - 100, height - 100);
}
}
function drawStory4() {
background("#00aaff");
image(bg_story4, 0, -height * 0.08, width, height * 1.08);
// 깜빡이는 화살표
if (frameCount % 60 < 30) {
fill("#566bb8");
textSize(60);
text("▶", width - 100, height - 100);
}
}

function drawStory5() {
background("#00aaff");
image(bg_story5, 0, -height * 0.08, width, height * 1.08);
// 깜빡이는 화살표
if (frameCount % 60 < 30) {
fill("#566bb8");
textSize(60);
text("▶", width - 100, height - 100);
}
}
function drawStory6() {
background("#00aaff");
image(bg_story6, 0, -height * 0.08, width, height * 1.08);
}

// --- 실제 게임 화면 ---
function drawGame() {
// 배경 이미지 표시
if (currentBg === 'home') {
if (bg_home) {
image(bg_home, 0, -height * 0.08, width, height * 1.08);
}
}
else if (currentBg === 'lab') {
if (bg_lab) {
image(bg_lab, 0, -height * 0.1, width, height * 1.1);
}
}
else if (currentBg === 'sea') {
if (bg_sea) {
image(bg_sea, 0, -height * 0.08, width, height * 1.08);
}
}

// home, lab 배경일 때만 창문 표시
if (currentBg === 'home' || currentBg === 'lab') drawWindow(250, 170, 250, 180);
// 웹캠 버튼 (다른 버튼들과 같은 라인)
drawFaceCamButton(530, height - 125, 120, 120);
// 웹캠이 켜져 있을 때만 미리보기 표시 (우측 하단)
if (faceCamActive) drawFaceCamPreview(width - 220, height - 170, 200, 150);


  applyFacialMoodToHappiness(); 
  applyWeatherToHappiness();

  if (currentAction === "sleep" && millis() - actionStartTime >= displayDuration) {
    currentAction = "normal";
  } else if (currentAction === "eat" && millis() - actionStartTime >= displayDuration) {
    currentAction = "normal";
  } else if (currentAction === "happy" && millis() - actionStartTime >= displayDuration) {
    currentAction = "normal";
  } else if (currentAction === "bath" && millis() - actionStartTime >= displayDuration) {
    currentAction = "normal";
  } else if (currentAction === "angry" && millis() - actionStartTime >= displayDuration) {
    currentAction = "normal";
  } 

// 각 액션의 지속 시간이 끝나면 normal 상태로 복귀
if (currentAction === "sleep" && millis() - actionStartTime >= displayDuration) {
currentAction = "normal";
} else if (currentAction === "eat" && millis() - actionStartTime >= displayDuration) {
currentAction = "normal";
} else if (currentAction === "happy" && millis() - actionStartTime >= displayDuration) {
currentAction = "normal";
} else if (currentAction === "bath" && millis() - actionStartTime >= displayDuration) {
currentAction = "normal";
} else if (currentAction === "angry" && millis() - actionStartTime >= displayDuration) {
currentAction = "normal";
}

// 스탯이 정상 범위일 때: 현재 액션에 맞는 body 함수 실행
if (hunger >= 30 && happiness >= 30 && fatigue <= 145) {
if (currentAction === "normal") {
update(); // 이동 업데이트
normal_body();
} else if (currentAction === "eat") {
eat_body();
} else if (currentAction === "happy") {
happy_body();
} else if (currentAction === "angry") {
angry_body();
} else if (currentAction === "bath") {
bath_body();
} else if (currentAction === "sleep") {
sleep_body();
}
} else {
// 스탯이 임계값 이하일 때: 강제로 angry 상태로 전환
currentAction = "angry";
angry_body();
}

// 색상 변경 버튼
if (typeof drawPaletteButton === 'function') drawPaletteButton();
if (typeof showPalette !== 'undefined' && showPalette) { drawColorOptions(); }

// 배경 변경 버튼
if (typeof drawBgPaletteButton === 'function') drawBgPaletteButton();
if (typeof showBgPalette !== 'undefined' && showBgPalette) { drawBgOptions(); }

// 스탯 게이지 표시
condition_hunger();
condition_happiness();
condition_fatigue();
// 레벨업 시스템
level_up();
}


// --- 액션 변경 함수 ---
function update() {

if (!mouseIsPressed) {
isDragging = false;
}

// 1. 마우스로
if (isDragging) {
charX = mouseX - 200;
charX = constrain(charX, 50, width - 640);
return;
}

// 2. 평소
if (currentAction === "normal" && isMoving) {
charX += charSpeed * moveDirection;
if (charX >= width - 640) {
moveDirection = -1;
} else if (charX <= 50) {
moveDirection = 1;
}
}
}

// --- 표정에 따라 행복도 변화 ---
function applyFacialMoodToHappiness() {
if (facialMood === 'happy') {
happiness += 0.2; // 웃는 표정이면 행복도 증가
happiness = constrain(happiness, 0, 175);
} else if (facialMood === 'sad') {
happiness -= 0.1; // 슬픈 표정이면 행복도 감소
happiness = constrain(happiness, 0, 175);
}
}

// --- 날씨에 따라 행복도 변화 ---
function applyWeatherToHappiness() {
if (!weatherLoaded) return; // 날씨 데이터가 로드되지 않았으면 실행 안 함
if (weatherCondition === 'clear') {
happiness += 0.02; // 맑은 날씨면 행복도 증가
happiness = constrain(happiness, 0, 175);
} else if (weatherCondition === 'rain' || weatherCondition === 'snow') {
happiness -= 0.02; // 비/눈 오면 행복도 감소
happiness = constrain(happiness, 0, 175);
}
}