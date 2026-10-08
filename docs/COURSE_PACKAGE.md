# 홀 자료 일괄 등록

골프장 DB에서 선택한 골프장의 자료를 한 번 등록한다. 코스명과 홀 번호가 정확히 일치하는 자료만 해당 홀에 연결한다. 일부 홀만 등록해도 되며 미등록 홀에 다른 홀을 복제하지 않는다.

```json
{
  "type": "GolfCoursePackage",
  "schemaVersion": 1,
  "courseId": "grace-cc",
  "source": { "name": "자료 제공자", "license": "확인한 이용 조건" },
  "holes": [
    { "course": "Lake", "hole": 1, "data": { "points": { "tee": { "lat": 0, "lng": 0 }, "center": { "lat": 0, "lng": 0 } }, "areas": {}, "features": [] } }
  ]
}
```

위 0 좌표는 형식 설명용이며 실제 골프장 데이터가 아니다. 그레이스CC에 등록하면 위치 검증에서 거절된다. `data`는 기존 points/areas/features 형식 또는 GeoJSON FeatureCollection을 사용한다. GeoJSON 도형은 WGS84 Point, LineString, Polygon, MultiPolygon을 지원하며 닫힌 폴리곤이 필요하다. 티/그린 Point는 golf 또는 kind 속성으로 지정한다. 복수 티/그린 Point는 자동 추측하지 않고 거절한다. 기존 중심선 끝점/그린 중심 추정 동작은 유지하며 현장 검증 대상으로 표시한다.

파일 10MB 이하, 1~54개 홀. 골프장 ID, 등록된 코스·홀, 출처와 이용 조건, 좌표 범위, 골프장 중심 15km 이내, 중복, 도형, 티/그린 좌표를 모두 검사한 뒤 한 번에 저장한다. 실패하면 기존 일괄 자료가 유지된다. 벙커 등의 독립 GeoJSON 폴리곤은 features에 보존된다.

우선순위: 당일 티/현장 GPS/저장 핀 → 기존 개별 홀 자료 → 일괄 자료. 원본 참고 공략도는 좌표가 없을 때만 제공한다. 일괄 해제는 기존 개별 홀 자료를 지우지 않는다.

기기 localStorage에 저장한다. 기존 설정의 JSON 백업에는 이 자료가 포함되지 않으므로 원본 파일을 보관한다. 출처·이용 조건 입력만으로 이용권이나 실제 지형의 정확성이 검증되는 것은 아니다. 실제 코스 데이터는 확인한 이용 범위 안에서만 등록한다. 합성 테스트 파일은 앱의 기본 데이터에 배포하지 않는다.

2026-10-08 공급 경로 조사: GolfCore 그레이스CC 지도 페이지 및 개발 문서 확인. 공개 scorecard API 이용 범위와 지도/좌표 이용 범위가 다름. course plans 및 geometry를 이 제품에 복제하는 권한은 공개 API로 확보되지 않음. 실제 지도 자료 구매/계약/유료 계정 작업은 실행하지 않았다.
- https://www.golfcore.org/courses/the-grace-country-club/
- https://www.golfcore.org/terms/
- https://www.golfcore.org/developers/docs/

검증: 전체 Playwright 114/114, 데스크톱 및 모바일 통과. 실제 외부 위성영상 + 재접속 + GPS 에뮬레이션 포함. 실제 골프장 홀 좌표, 물리 스마트폰 GPS, 보호된 배포 UI는 미검증이며 P0 전체는 NOT_COMPLETE.
