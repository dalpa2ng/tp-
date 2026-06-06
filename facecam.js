let faceMeshModel;
let faceVideo;
let detectedFaces = [];
let modelReady = false;  // 모델 실제 로드 완료 여부

// 다른 파일에서 읽을 전역 변수
let facialMood = 'none';
let smileScore = 0;
let faceCamActive = false;

// === 자동 보정 시스템 ===
let baselineScore = null;          // 무표정 기준선 (입 가로폭 비율 — 웃음 판정용)
let baselineCorner = null;         // 무표정 기준선 (입꼬리 높이 — 웃음/슬픔 판정용)
let isCalibrating = false;         // 보정 중인지 여부
let calibrationSamples = [];       // 보정 중 수집: 입 가로폭 비율
let calibrationCornerSamples = []; // 보정 중 수집: 입꼬리 높이(내림 정도)
let calibrationStartTime = null;   // 첫 얼굴 감지 시각(ms) — 시간 기반 완료용

const CALIBRATION_TARGET = 45;      // 목표 샘플 수 (감지가 원활하면 약 1~3초)
const CALIBRATION_MAX_MS = 5000;    // 최대 보정 시간(ms): 넘으면 강제 완료
const CALIBRATION_MIN_SAMPLES = 10; // 시간 초과로 완료하려면 최소 이만큼은 모여야 함

// 기준선 대비 변화량 임계치
const SMILE_DELTA = 0.08;        // 입 가로폭이 기준선보다 +0.08 이상 넓어짐 → 웃음
const SMILE_CORNER_DELTA = 0.03; // 입꼬리가 기준선보다 0.03 이상 올라감(눈높이 기준) → 웃음
const SAD_CORNER_DELTA = 0.015;  // 입꼬리가 기준선보다 0.015 이상 내려감(눈높이 기준) → 슬픔

// 떨림(깜빡임) 방지
const MOOD_SMOOTHING = 0.15;    // EMA 평활화 강도 (작을수록 더 부드럽고 둔함)
const MOOD_HYSTERESIS = 0.008;  // 경계에서 왔다갔다 안 하도록 두는 여유폭
let smoothRatio = null;         // 평활화된 입 가로폭 비율
let smoothCorner = null;        // 평활화된 입꼬리 처짐 정도

// === 디버그: 실시간 지표 확인용 (튜닝 끝나면 false로) ===
const FACECAM_DEBUG = false;
let dbgInfo = '';      // 미리보기에 표시할 디버그 문자열
let dbgCounter = 0;    // 콘솔 로그 빈도 조절용

// 버튼 눌림 애니메이션
let buttonPressed_facecam = false;
let pressTime_facecam = 0;

// ============================================
// 초기 세팅 (setup에서 한 번 호출)
// ============================================
function setupFaceCam() {
  // 모델 로드 시작 (실제 로드는 비동기 — 완료되면 콜백에서 modelReady=true)
  faceMeshModel = ml5.faceMesh(
    {
      maxFaces: 1,
      refineLandmarks: false,
      flipHorizontal: true
    },
    () => {
      modelReady = true;
      console.log('[facecam] ✅ 모델 로드 완료(실제). 버튼을 눌러 시작하세요.');
    }
  );

  console.log('[facecam] 모델 로딩 시작...');
}

// ============================================
// 웹캠 켜기 - 버튼 누를 때만
// ============================================
function startFaceCam() {
  if (faceCamActive) return;

  // 웹캠 열기. createCapture 콜백은 해상도가 잡히기 전(0x0)에 너무 일찍
  // 불릴 수 있어, 콜백 대신 실제 프레임이 들어오는지 직접 폴링한다.
  faceVideo = createCapture(VIDEO);
  faceVideo.size(320, 240);
  faceVideo.hide();

  faceCamActive = true;
  startCalibration();
  console.log('[facecam] 표정 인식 시작 - 웹캠 준비 대기 중...');

  // 비디오가 실제 프레임(videoWidth>0)을 낼 때까지 기다렸다가 감지 시작.
  // (0x0 프레임에서 감지를 걸면 얼굴이 영영 안 잡히는 문제 방지)
  waitForVideoReady();
}

// 웹캠 스트림이 준비되면 감지를 시작 (준비될 때까지 0.1초 간격으로 재확인)
function waitForVideoReady() {
  if (!faceCamActive || !faceVideo) return; // 그새 꺼졌으면 중단

  const el = faceVideo.elt;
  const ready = el && el.readyState >= 2 && el.videoWidth > 0;

  if (ready && modelReady && faceMeshModel) {
    faceMeshModel.detectStart(faceVideo, gotFaces);
    console.log(`[facecam] 감지 시작 (웹캠 ${el.videoWidth}x${el.videoHeight})`);
  } else {
    // 아직 웹캠 또는 모델이 준비 안 됨 — 잠시 후 다시 확인
    setTimeout(waitForVideoReady, 100);
  }
}

// ============================================
// 웹캠 끄기 - 정말로 꺼버리기
// ============================================
function stopFaceCam() {
  if (!faceCamActive) return;

  faceMeshModel.detectStop();

  // 웹캠 스트림 완전 종료
  if (faceVideo) {
    faceVideo.remove();
    faceVideo = null;
  }

  faceCamActive = false;
  facialMood = 'none';
  baselineScore = null;
  baselineCorner = null;
  smoothRatio = null;
  smoothCorner = null;
  console.log('[facecam] 표정 인식 중지');
}

// ============================================
// 보정 (캘리브레이션)
// ============================================
function startCalibration() {
  isCalibrating = true;
  calibrationSamples = [];
  calibrationCornerSamples = [];
  baselineScore = null;
  baselineCorner = null;
  smoothRatio = null;
  smoothCorner = null;
  calibrationStartTime = null; // 첫 샘플이 들어올 때 시각을 기록
}

// 수동 재보정 (UI 버튼 등에서 호출 가능)
function recalibrate() {
  if (faceCamActive) {
    startCalibration();
    console.log('[facecam] 재보정 시작');
  }
}

// ============================================
// 얼굴 감지 및 처리
// ============================================
function gotFaces(results) {
  detectedFaces = results;

  if (detectedFaces.length > 0) {
    processFace(detectedFaces[0]);
  } else {
    facialMood = 'none';
  }
}

function processFace(face) {
  const kp = face && face.keypoints;

  // 키포인트가 아직 없거나 형식이 다르면 이 프레임은 건너뜀 (에러로 멈추지 않게)
  if (!kp || !kp[61] || !kp[291] || !kp[33] || !kp[263]) {
    return;
  }

  // 입꼬리 좌우
  const leftCorner = kp[61];
  const rightCorner = kp[291];
  // 눈 바깥 (얼굴 크기 정규화 기준)
  const leftEye = kp[33];
  const rightEye = kp[263];

  const eyeDistance = dist(leftEye.x, leftEye.y, rightEye.x, rightEye.y);

  // (1) 입 가로폭 비율 — 클수록 입이 넓어짐(웃음)
  const mouthWidth = dist(leftCorner.x, leftCorner.y, rightCorner.x, rightCorner.y);
  const ratio = mouthWidth / eyeDistance;

  // (2) 입꼬리 처짐 정도 — 입꼬리 평균 y가 "눈높이"보다 얼마나 아래인지(얼굴 크기로 정규화).
  //     눈높이는 표정과 무관하게 안정적이라, 입 전체가 처지는 슬픈 표정을 잘 잡는다.
  //     화면은 아래로 갈수록 y가 커지므로: 기준선보다 값이 커지면 입꼬리가 내려간 것(슬픔),
  //     작아지면(음수 변화) 입꼬리가 올라간 것(웃음).
  const cornerY = (leftCorner.y + rightCorner.y) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const cornerDrop = (cornerY - eyeMidY) / eyeDistance;

  smileScore = ratio;

  // 보정 중이면 샘플 수집
  if (isCalibrating) {
    // 첫 유효 샘플이 들어온 순간부터 시간 측정 시작
    if (calibrationStartTime === null) {
      calibrationStartTime = millis();
    }

    calibrationSamples.push(ratio);
    calibrationCornerSamples.push(cornerDrop);

    // 완료 조건:
    //  (1) 목표 샘플 수를 채웠거나
    //  (2) 최대 시간을 넘겼고 최소 샘플은 모인 경우(감지가 끊겨도 멈추도록)
    const elapsed = millis() - calibrationStartTime;
    const enoughSamples = calibrationSamples.length >= CALIBRATION_TARGET;
    const timedOut = elapsed >= CALIBRATION_MAX_MS &&
                     calibrationSamples.length >= CALIBRATION_MIN_SAMPLES;

    if (enoughSamples || timedOut) {
      // 각 지표의 평균값을 기준선으로 저장
      const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
      baselineScore = avg(calibrationSamples);
      baselineCorner = avg(calibrationCornerSamples);
      isCalibrating = false;
      console.log(
        `[facecam] 보정 완료. 입폭기준 ${baselineScore.toFixed(3)}, ` +
        `입꼬리기준 ${baselineCorner.toFixed(3)} ` +
        `(샘플 ${calibrationSamples.length}개, ${elapsed}ms${timedOut ? ', 시간초과 완료' : ''})`
      );
    }

    facialMood = 'calibrating';
    return;
  }

  // 보정 끝났으면 기준선 대비 판정
  if (baselineScore !== null && baselineCorner !== null) {
    // EMA 평활화 — 프레임마다 값이 미세하게 떨려 표정이 깜빡이는 것 방지
    smoothRatio  = (smoothRatio  === null) ? ratio      : smoothRatio  + MOOD_SMOOTHING * (ratio      - smoothRatio);
    smoothCorner = (smoothCorner === null) ? cornerDrop : smoothCorner + MOOD_SMOOTHING * (cornerDrop - smoothCorner);

    const widthDelta = smoothRatio - baselineScore;        // +면 입이 넓어짐(웃음)
    const cornerDelta = smoothCorner - baselineCorner;     // +면 입꼬리 내려감, -면 올라감

    // 히스테리시스: 이미 그 표정이면 임계치를 살짝 낮춰서 경계 떨림을 흡수
    const sadThresh   = SAD_CORNER_DELTA   - (facialMood === 'sad'   ? MOOD_HYSTERESIS : 0);
    const smileThresh = SMILE_CORNER_DELTA - (facialMood === 'happy' ? MOOD_HYSTERESIS : 0);

    // 웃음: 입이 넓어졌거나(기존) 입꼬리가 올라감
    if (widthDelta >= SMILE_DELTA || cornerDelta <= -smileThresh) {
      facialMood = 'happy';
    // 슬픔: 입꼬리가 내려감
    } else if (cornerDelta >= sadThresh) {
      facialMood = 'sad';
    } else {
      facialMood = 'neutral';
    }

    // === 디버그: 실시간 지표값 표시/기록 ===
    if (FACECAM_DEBUG) {
      dbgInfo = `폭Δ ${widthDelta.toFixed(3)}  입꼬리Δ ${cornerDelta.toFixed(3)}`;
      // 콘솔 로그는 약 20프레임에 한 번만 (스팸 방지)
      dbgCounter++;
      if (dbgCounter % 20 === 0) {
        console.log(`[facecam][debug] ${dbgInfo}  → ${facialMood}`);
      }
    }
  }
}

// ============================================
// 웹캠 미리보기 그리기
// ============================================
function drawFaceCamPreview(x, y, w, h) {
  push();

  if (!faceCamActive) {
    // 웹캠 꺼진 상태
    fill(220);
    noStroke();
    rect(x, y, w, h);
    fill(100);
    textAlign(CENTER, CENTER);
    textSize(14);
    text('웹캠 꺼짐', x + w/2, y + h/2);
  } else {
    // 웹캠 영상 (거울 모드: 영상만 좌우 반전, 오버레이 텍스트는 정상)
    push();
    translate(x + w, y);
    scale(-1, 1);
    image(faceVideo, 0, 0, w, h);
    pop();

    // 상단 상태 바
    fill(0, 0, 0, 150);
    noStroke();
    rect(x, y, w, 25);

    fill(255);
    textAlign(LEFT, CENTER);
    textSize(12);

    let label = '';
    if (isCalibrating) {
      if (!modelReady) {
        label = '🧠 인식 모델 로딩 중...';
      } else if (detectedFaces.length === 0) {
        label = '👀 얼굴을 찾는 중...';
      } else {
        // 샘플 진행률과 시간 진행률 중 더 큰 값을 표시(막대가 멈춘 듯 보이지 않게)
        const sampleProg = calibrationSamples.length / CALIBRATION_TARGET;
        const timeProg = calibrationStartTime === null
          ? 0
          : (millis() - calibrationStartTime) / CALIBRATION_MAX_MS;
        const progress = Math.floor(Math.min(Math.max(sampleProg, timeProg), 1) * 100);
        label = `🎯 무표정 유지... ${progress}%`;
      }
    } else if (facialMood === 'happy') {
      label = '😊 행복';
    } else if (facialMood === 'sad') {
      label = '😢 슬픔';
    } else if (facialMood === 'neutral') {
      label = '😐 무표정';
    } else {
      label = '얼굴 없음';
    }

    text(label, x + 8, y + 12);

    // 보정 중 안내 메시지
    if (isCalibrating) {
      fill(0, 0, 0, 180);
      rect(x, y + h - 30, w, 30);
      fill(255);
      textAlign(CENTER, CENTER);
      text('카메라를 보고 평소 표정을 유지하세요', x + w/2, y + h - 15);
    } else if (FACECAM_DEBUG && dbgInfo) {
      // 디버그: 보정 후 실시간 지표값을 하단에 표시
      fill(0, 0, 0, 180);
      rect(x, y + h - 26, w, 26);
      fill(0, 255, 180);
      textAlign(CENTER, CENTER);
      textSize(13);
      text(dbgInfo, x + w/2, y + h - 13);
    }
  }

  pop();
}

// ============================================
// 표정 인식 버튼 그리기
// ============================================
function drawFaceCamButton(x, y, w, h) {
  push();

  // 버튼 눌림 애니메이션
  let pressOffset = 0;
  if (buttonPressed_facecam) {
    if (millis() - pressTime_facecam < 150) {
      pressOffset = 4;
    } else {
      buttonPressed_facecam = false;
    }
  }

  // 버튼 그림자
  fill(0, 0, 0, 40);
  noStroke();
  rect(x + 4, y + 4 + pressOffset, w, h, 15);

  // 버튼 배경 (상태별 그라디언트)
  if (faceCamActive) {
    fill(255, 100, 100);  // 활성화 시 빨간색
  } else {
    fill(100, 200, 255);  // 비활성화 시 파란색
  }
  rect(x, y + pressOffset, w, h, 15);

  // 상단 하이라이트
  fill(255, 255, 255, 150);
  rect(x, y + pressOffset, w, h/2, 15, 15, 0, 0);

  // 버튼 테두리
  noFill();
  stroke(255);
  strokeWeight(3);
  rect(x, y + pressOffset, w, h, 15);

  noStroke();

  // 카메라 아이콘
  let cx = x + w/2;
  let cy = y + h/2 + pressOffset;

  // 카메라 몸체 그림자
  fill(0, 0, 0, 50);
  rect(cx - 28, cy - 13, 60, 40, 5);
  rect(cx - 13, cy - 21, 30, 10, 3);

  // 카메라 몸체
  fill(60);
  rect(cx - 30, cy - 15, 60, 40, 5);

  // 카메라 상단 돌출부
  fill(80);
  rect(cx - 15, cy - 23, 30, 10, 3);

  // 렌즈 (바깥)
  fill(30);
  ellipse(cx, cy + 5, 28, 28);

  // 렌즈 (중간)
  fill(50);
  ellipse(cx, cy + 5, 22, 22);

  // 렌즈 (안쪽 반사)
  if (faceCamActive) {
    fill(255, 100, 100);
  } else {
    fill(100, 150, 255);
  }
  ellipse(cx, cy + 5, 16, 16);

  // 렌즈 하이라이트
  fill(255, 255, 255, 150);
  ellipse(cx - 4, cy + 2, 6, 6);

  // 웹캠 켜진 상태 표시 (깜빡이는 LED + 광채)
  if (faceCamActive && frameCount % 60 < 30) {
    // LED 광채
    fill(255, 0, 0, 80);
    ellipse(x + w - 18, y + 18 + pressOffset, 18, 18);
    // LED
    fill(255, 0, 0);
    ellipse(x + w - 18, y + 18 + pressOffset, 12, 12);
    // LED 하이라이트
    fill(255, 150, 150);
    ellipse(x + w - 20, y + 16 + pressOffset, 5, 5);
  }

  // 버튼 라벨
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(13);
  textStyle(BOLD);
  if (faceCamActive) {
    text('표정인식 OFF', cx, y + h - 18 + pressOffset);
  } else {
    text('표정인식 ON', cx, y + h - 18 + pressOffset);
  }

  // 비활성화 시 호버 효과 힌트
  if (!faceCamActive) {
    fill(100, 200, 255, 80);
    ellipse(cx, cy, 95, 95);
  }

  pop();
}

// 버튼 클릭 영역 판정 (mousePressed에서 호출)
function isFaceCamButtonClicked(x, y, w, h) {
  return mouseX >= x && mouseX <= x + w &&
         mouseY >= y && mouseY <= y + h;
}