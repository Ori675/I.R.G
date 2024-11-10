const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 창 크기에 맞춰 캔버스 크기를 조정하는 함수
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// 창 크기가 변경될 때마다 캔버스 크기를 재설정
window.addEventListener('resize', resizeCanvas);

// 게임 설정값
let player = {
    x: 50,
    y: canvas.height - 70,
    width: 50, // 플레이어의 너비
    height: 50, // 플레이어의 높이
    color: "blue",
    gravity: 0.6,
    velocityY: 0,
    jumpPower: -16,
    onGround: false
};

let obstacles = [];
let obstacleFrequency = 90; // 장애물이 나타나는 빈도
let frames = 0;
let isGameOver = false;
let score = 0;  // 점수 초기화
let scoreInterval = 100; // 점수가 올라가는 간격
let lastScoreUpdate = Date.now(); // 마지막으로 점수를 업데이트한 시간
let speedMultiplier = 1.5; // 초기 속도 배율
let speedIncreaseInterval = 5000; // 5초마다 속도 증가
let lastSpeedIncrease = Date.now(); // 마지막 속도 증가 시간

// 전역 변수
let playerName = '';
let playerId = '';

// 이벤트 큐 설정
const eventQueue = [];
let isProcessingEvent = false;

// 이벤트를 큐에 추가하고 순차적으로 처리하는 함수
function enqueueEvent(eventType, details) {
    eventQueue.push({ eventType, details });
    processEventQueue();
}

// 큐에 쌓인 이벤트를 하나씩 처리하는 함수
function processEventQueue() {
    if (isProcessingEvent || eventQueue.length === 0) return;

    isProcessingEvent = true;
    const { eventType, details } = eventQueue.shift();

    // 이벤트를 Google Apps Script로 전송
    sendEventToGoogle(eventType, playerName, playerId, details)
        .then(() => {
            isProcessingEvent = false;
            processEventQueue(); // 다음 이벤트 처리
        })
        .catch(error => {
            console.error('Error processing event:', error);
            isProcessingEvent = false;
            processEventQueue(); // 다음 이벤트 처리
        });
}

// Google Apps Script로 이벤트 전송
function sendEventToGoogle(eventType, name, studentId, details = '') {
    const url = 'https://script.google.com/macros/s/AKfycbymx_A3cHLVa6JkDxGnDFG0vA3bwEOW092dTrv-wxntvhs0IkWLTt8GALaS7dEV-2mzhg/exec';

    const payload = new URLSearchParams({
        type: eventType,
        details: details,
        name: name,
        studentId: studentId
    });

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload.toString()
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(`서버 오류: ${text}`); });
        }
        return response.json();
    });
}

// 로그인 이벤트
function logLoginEvent() {
    enqueueEvent('로그인');
}

// 점프 이벤트
function logJumpEvent() {
    enqueueEvent('점프');
}

// 게임 오버 이벤트
function logGameOverEvent(score) {
    enqueueEvent(`게임 오버, 점수 : ${score}점`);
}

// 게임 재시작 이벤트
function logRestartEvent() {
    enqueueEvent('재시작');
}

// 점프 시 호출되는 함수
function jump() {
    if (player.onGround) {
        player.velocityY = player.jumpPower;
        player.onGround = false;
        logJumpEvent(); // 점프 이벤트 기록
    }
}

// 게임 시작 시 호출되는 함수
function startGame() {
    playerName = document.getElementById('name').value;
    playerId = document.getElementById('studentId').value;

    if (playerName && playerId) {
        logLoginEvent(); // 로그인 이벤트 기록
        document.getElementById('loginForm').style.display = 'none'; // 로그인 폼 숨기기
        document.getElementById('gameCanvas').style.display = 'block'; // 게임 캔버스 표시
        resizeCanvas(); // 게임 시작 시 캔버스 크기 조정
        gameLoop(); // 게임 루프 시작
    } else {
        alert('학번과 이름을 모두 입력해주세요.');
    }
}

// 게임 재시작 함수 (R키 입력 시 호출)
function resetGame() {
    // 플레이어 위치 초기화
    player.x = 50;
    player.y = canvas.height - 70;
    player.velocityY = 0;
    player.onGround = false;

    // 장애물 초기화
    obstacles = [];
    
    // 게임 상태 초기화
    frames = 0;
    isGameOver = false;
    score = 0;
    speedMultiplier = 1.5;
    lastSpeedIncrease = Date.now();
    lastScoreUpdate = Date.now();

    // 재시작 이벤트 기록
    logRestartEvent();

    // 게임 루프 재시작
    gameLoop();
}

// 게임 루프 함수 정의
function gameLoop() {
    update();
    draw();

    if (!isGameOver) {
        requestAnimationFrame(gameLoop);
    } else {
        logGameOverEvent(score); // 게임 오버 이벤트 기록
    }
}

// 캐릭터, 장애물, 게임 상태를 업데이트하는 함수
function update() {
    if (isGameOver) {
        return;
    }

    // 5초마다 캐릭터 속도와 장애물 간격을 증가시킴
    if (Date.now() - lastSpeedIncrease >= speedIncreaseInterval) {
        speedMultiplier += 0.1; // 속도 배율을 점점 증가시킴
        obstacleFrequency += 10; // 장애물 간격을 늘림
        lastSpeedIncrease = Date.now(); // 마지막 속도 증가 시간 갱신
    }

    // 캐릭터에 중력 적용
    player.velocityY += player.gravity;
    player.y += player.velocityY;

    // 캐릭터가 땅에 닿았을 때
    if (player.y + player.height >= canvas.height) {
        player.y = canvas.height - player.height;
        player.onGround = true;
        player.velocityY = 0;
    }

    // 장애물 이동 및 생성
    obstacles.forEach((obstacle, index) => {
        obstacle.x -= 5 * speedMultiplier; // 속도 배율 적용하여 장애물 이동

        // 플레이어와 충돌 확인
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y
        ) {
            isGameOver = true;
            return;
        }

        // 화면 밖으로 나간 장애물 삭제
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(index, 1);
        }
    });

    // 장애물 생성
    if (frames % obstacleFrequency === 0) {
        const height = Math.floor(Math.random() * 100) + 50;
        obstacles.push({
            x: canvas.width,
            y: canvas.height - height,
            width: 20,
            height: height,
            color: "red"
        });
    }

    // 1초마다 점수 10점 증가
    if (Date.now() - lastScoreUpdate >= scoreInterval) {
        score += 1;
        lastScoreUpdate = Date.now(); // 마지막 업데이트 시간을 갱신
    }

    frames++;
}

// 게임 상태를 그리는 함수
function draw() {
    // 배경 및 플레이어 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 캐릭터 그리기
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height); // 사각형으로 플레이어 그리기

    // 장애물 그리기
    obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.color;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });

    // 점수 표시
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 10, 30);

    // 게임 오버 시 안내 문구 표시
    if (isGameOver) {
        ctx.fillStyle = "black";
        ctx.font = "30px Arial";
        ctx.fillText("Game Over", canvas.width / 2 - 80, canvas.height / 2 - 30);
        ctx.font = "20px Arial";
        ctx.fillText("R 키를 눌러 재시작하실 수 있습니다.", canvas.width / 2 - 160, canvas.height / 2 + 10);
    }
}

// DOMContentLoaded 이벤트에 로그인 버튼 이벤트 추가
document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.querySelector('#loginForm button');
    loginButton.addEventListener('click', startGame);
});

// 키보드 입력 이벤트 처리
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        jump();
    } else if (e.code === "KeyR" && isGameOver) {
        resetGame();
    }
});