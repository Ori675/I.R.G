const sheet = SpreadsheetApp.openById('1q1I6l4cAA3JOOf2WFL2O5SZxqsE_tOFb1MKBnAWiIMU').getSheetByName('Sheet1');

// 이벤트 ID를 가져오고 증가시키는 함수
function getAndIncrementEventID() {
    const properties = PropertiesService.getScriptProperties();
    const lock = LockService.getScriptLock();
    lock.waitLock(3000); // 잠금 대기, 최대 3초

    // eventID가 설정되어 있지 않다면 초기화
    if (!properties.getProperty('eventID')) {
        properties.setProperty('eventID', '0'); // 처음 한 번만 0으로 초기화
    }

    let eventID = parseInt(properties.getProperty('eventID'), 10); // 현재 ID 불러오기
    properties.setProperty('eventID', (eventID + 1).toString()); // ID를 1 증가하여 저장

    lock.releaseLock(); // 잠금 해제
    return eventID.toString(); // 문자열로 변환하여 반환
}

function doPost(e) {
    try {
        Logger.log("Received parameters: " + JSON.stringify(e.parameter));

        const eventID = getAndIncrementEventID();
        const eventDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        const eventTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss');

        // 매개변수를 시트에 기록
        sheet.appendRow([
            eventID,                     // 이벤트 ID
            eventDate,                   // 날짜
            eventTime,                   // 시간
            e.parameter.studentId || '', // 학번
            e.parameter.name || '',      // 이름
            e.parameter.type || '',      // 이벤트 종류
            e.parameter.details || ''    // 코멘트
        ]);

        return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
                              .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
                              .setMimeType(ContentService.MimeType.JSON);
    }
}