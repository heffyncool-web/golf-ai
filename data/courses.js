export const builtInCourses = [
  {
    id: "grace-cc",
    name: "청도 그레이스CC",
    region: "경상북도 청도군",
    venueType: "27홀",
    defaultRotation: ["Lake", "Mountain"],
    courses: {
      Lake: [
        { hole: 1, par: 4, distance: 378, title: "시작홀 · 중앙 공략", hazards: ["중앙 공략"], strategy: "첫 홀은 페어웨이 중앙을 우선하고 무리한 공격을 피합니다." , map: { bend: -3, water: "none" } },
        { hole: 2, par: 4, distance: 390, title: "IP 정확도가 핵심", hazards: ["벙커"], strategy: "랜딩 지점 정확도를 우선하고 그린 주변 벙커를 피합니다." , map: { bend: 2, water: "none" } },
        { hole: 3, par: 3, distance: 165, title: "짧은 내리막 · 우측 위험", hazards: ["우측 위험"], strategy: "핀보다 그린 중앙을 우선합니다." , map: { bend: 0, water: "right" } },
        { hole: 4, par: 4, distance: 365, title: "오르막 계산", hazards: ["우측 해저드", "그래스벙커"], strategy: "오르막과 우측 위험을 감안해 한 클럽 여유 있게 봅니다." , map: { bend: 4, water: "right" } },
        { hole: 5, par: 5, distance: 500, title: "정확성 우선", hazards: ["계류", "연못"], strategy: "레이업과 캐리를 분명히 선택하고 애매한 거리는 피합니다." , map: { bend: -6, water: "right" } },
        { hole: 6, par: 4, distance: 380, title: "좌측 위험 주의", hazards: ["좌측 해저드"], strategy: "티샷은 안전한 폭을 확보하고 세컨드 각도를 남깁니다." , map: { bend: 5, water: "left" } },
        { hole: 7, par: 5, distance: 510, title: "벙커 압박 홀", hazards: ["다수 벙커", "우측 위험"], strategy: "2온보다 3온 기준으로 벙커를 피해 분할 공략합니다." , map: { bend: -4, water: "right" } },
        { hole: 8, par: 3, distance: 155, title: "절벽형 그린 주의", hazards: ["그린 주변 위험"], strategy: "짧게 남기는 쪽을 우선하고 핀 직공은 피합니다." , map: { bend: 0, water: "right" } },
        { hole: 9, par: 4, distance: 400, title: "전반 마무리", hazards: [], strategy: "히어로샷보다 다음 샷이 편한 지점을 선택합니다." , map: { bend: 2, water: "none" } }
      ],
      Mountain: [
        { hole: 1, par: 4, distance: 362, title: "벙커 우측", hazards: ["벙커"], strategy: "전면 벙커를 피해 우측 안전지점을 봅니다." , map: { bend: 4, water: "none" } },
        { hole: 2, par: 5, distance: 485, title: "암반 방향", hazards: ["좌측 벙커"], strategy: "후방 암반 방향을 기준으로 티샷하고 세컨드는 좌측 벙커를 피합니다." , map: { bend: -4, water: "none" } },
        { hole: 3, par: 4, distance: 410, title: "좌 해저드 · 우 OB", hazards: ["좌 해저드", "우 OB"], strategy: "양쪽 위험을 피하기 위해 최대거리보다 방향성을 우선합니다." , map: { bend: 0, water: "left" } },
        { hole: 4, par: 3, distance: 170, title: "내리막 · 호수 인접", hazards: ["호수"], strategy: "내리막 보정 후 그린 중앙을 노립니다." , map: { bend: 0, water: "right" } },
        { hole: 5, par: 4, distance: 360, title: "방향 정확성", hazards: ["벙커"], strategy: "장타보다 페어웨이 확보를 우선합니다." , map: { bend: 6, water: "none" } },
        { hole: 6, par: 4, distance: 400, title: "벙커 우측", hazards: ["벙커"], strategy: "벙커 우측의 넓은 면을 이용해 세컨드 각도를 만듭니다." , map: { bend: -3, water: "none" } },
        { hole: 7, par: 3, distance: 170, title: "벙커 사이", hazards: ["전후 벙커"], strategy: "바람과 내리막을 확인하고 짧게 안전하게 공략합니다." , map: { bend: 0, water: "none" } },
        { hole: 8, par: 4, distance: 380, title: "분리형 지형", hazards: ["지형 단절"], strategy: "티샷과 세컨드 구간을 분리해 생각하고 안전지점을 연결합니다." , map: { bend: 5, water: "none" } },
        { hole: 9, par: 5, distance: 510, title: "우측 벙커 연속", hazards: ["우측 벙커"], strategy: "3온 기준으로 중앙 라인을 유지합니다." , map: { bend: -5, water: "none" } }
      ]
    }
  }
];

export function getCourseById(id, customCourses = []) {
  return [...builtInCourses, ...customCourses].find((c) => c.id === id) || builtInCourses[0];
}
