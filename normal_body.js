let charX = 200;
let charSpeed = 0.5;
let moveDirection = 1;
let targetDirection = 1; // 목표 방향
let currentRotation = 0; // 현재 회전 각도
let isMoving = true;
let isDragging = false;

function normal_body() {
  push();
  translate(charX, height / 2 - 200);
  
  // 부드러운 회전
  push();
  translate(200, 200); // 캐릭터 중심점
  rotate(radians(currentRotation));
  translate(-200, -200);
  
  if (currentAction === "normal") drawNormal();
  
  pop();
  pop();
}

function drawNormal() {
  noStroke();
  fill(myShadowColor);
  ellipse(172, 303, 40, 50);
  ellipse(228, 303, 40, 50);
  ellipse(200, 255, 130, 130);
  fill(myBodyColor);
  ellipse(200, 250, 130, 130);
  ellipse(175, 300, 40, 50);
  ellipse(225, 300, 40, 50);
  
  push();
  translate(144, 240);
  rotate(radians(20)); 
  fill(myShadowColor);
  ellipse(2, 3, 34, 57);
  fill(myBodyColor);
  ellipse(0, 0, 34, 65);
  pop();

  push();
  translate(256, 240);
  rotate(radians(-20)); 
  fill(myShadowColor);
  ellipse(-2, 3, 38, 57);
  fill(myBodyColor);
  ellipse(0, 0, 38, 65);
  pop();
  
  fill(myShadowColor);
  ellipse(200, 187, 120, 95);
  fill(myBodyColor);
  ellipse(200, 184, 120, 95);
  
  fill("#4B4B4D");
  push();
  translate(172, 185);
  rotate(radians(10)); 
  ellipse(0, 0, 15, 10);
  fill(255);
  ellipse(-1, -1, 4, 3);
  pop();
  
  push();
  translate(228, 185);
  rotate(radians(-10)); 
  ellipse(0, 0, 15, 10);
  fill(255);
  ellipse(-1, -1, 4, 3);
  pop();
  
  ellipse(195, 195, 12, 8);
  ellipse(205, 195, 12, 8);
  
  fill(myBodyColor);
  ellipse(195, 192, 12, 8);
  ellipse(205, 192, 12, 8);
  
  fill("#4B4B4D");
  ellipse(200, 193, 8, 5);
  
  stroke("#4B4B4D");
  line(169, 173, 177, 175);
  line(223, 175, 231, 173);

  noStroke();
  fill(255);
  ellipse(200, 268, 63, 60);
  
  noFill();
  stroke("#4B4B4D");
  push();
  translate(200, 126);
  rotate(radians(-60));
  arc(0, 0, 25, 20, 50, PI);
  pop();
}
